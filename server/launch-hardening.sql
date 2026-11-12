-- ConvertShorts launch hardening (2026-10-21). Run once in the Supabase SQL editor
-- AFTER billing-schema.sql, credit-schema.sql and razorpay-schema.sql. Safe to re-run.
-- Verify afterwards with launch-hardening-verify.sql.

-- 1. Keep payment and usage records when a customer deletes their account.
--    Orders, grants and generation requests are accounting records: detach the
--    user instead of deleting the rows. (Billing account rows still cascade.)
do $$
declare t text; c text;
begin
 foreach t in array array['convertshorts_checkout_orders','convertshorts_credit_grants','convertshorts_generation_requests'] loop
  for c in select con.conname from pg_constraint con
           join pg_class rel on rel.oid=con.conrelid join pg_namespace n on n.oid=rel.relnamespace
           where n.nspname='public' and rel.relname=t and con.contype='f' and con.confrelid='auth.users'::regclass loop
   execute format('alter table public.%I drop constraint %I',t,c);
  end loop;
  execute format('alter table public.%I alter column user_id drop not null',t);
  execute format('alter table public.%I add constraint %I foreign key(user_id) references auth.users(id) on delete set null',t,t||'_user_id_fkey');
 end loop;
end $$;

-- 2. Track refunds/chargebacks and owner alerts. Private schema: never exposed to the API.
alter table public.convertshorts_checkout_orders add column if not exists reversed_paise integer not null default 0 check(reversed_paise>=0);
create table if not exists convertshorts_private.payment_reversals(
 id text primary key,                 -- Razorpay refund id (rfnd_…) or dispute id (disp_…)
 order_id text not null,
 payment_id text not null,
 reason text not null check(reason in ('refund','dispute')),
 amount_paise integer not null check(amount_paise>0),
 debited_paise integer not null check(debited_paise>=0),
 shortfall_paise integer not null check(shortfall_paise>=0),
 created_at timestamptz not null default now()
);
create table if not exists convertshorts_private.payment_alerts(
 id bigint generated always as identity primary key,
 order_id text,
 payment_id text not null,
 kind text not null,
 ref text,
 created_at timestamptz not null default now(),
 resolved_at timestamptz
);
alter table convertshorts_private.payment_reversals enable row level security;
alter table convertshorts_private.payment_alerts enable row level security;
revoke all on convertshorts_private.payment_reversals,convertshorts_private.payment_alerts from public,anon,authenticated;

-- 3. A second, different payment for an already-paid order no longer errors
--    (which made Razorpay retry forever). It is recorded for the owner to refund
--    and returns NULL; it never grants a second balance.
create or replace function public.convertshorts_apply_razorpay_payment(o text,p text) returns boolean language plpgsql security definer set search_path='' as $$
declare payment_order public.convertshorts_checkout_orders;
begin
 if coalesce((select auth.role()),'')<>'service_role' then raise exception 'Server access required' using errcode='42501';end if;
 select * into payment_order from public.convertshorts_checkout_orders where id=o for update;
 if not found or payment_order.test_mode then raise exception 'Invalid live payment order';end if;
 if p !~ '^pay_[a-zA-Z0-9]+$' then raise exception 'Invalid payment reference';end if;
 if payment_order.payment_id is not null then
  if payment_order.payment_id<>p then
   if not exists(select 1 from convertshorts_private.payment_alerts where payment_id=p and kind='duplicate_capture') then
    insert into convertshorts_private.payment_alerts(order_id,payment_id,kind) values(o,p,'duplicate_capture');
   end if;
   return null;
  end if;
  return false;
 end if;
 if payment_order.user_id is null then
  insert into convertshorts_private.payment_alerts(order_id,payment_id,kind) values(o,p,'payment_for_deleted_account');
  return null;
 end if;
 perform public.convertshorts_apply_billing_event('razorpay:'||p,payment_order.user_id,null,'Prepaid',null,payment_order.amount_paise,'pack',now(),1);
 update public.convertshorts_checkout_orders set payment_id=p,paid_at=now() where id=o;
 return true;
end $$;
revoke all on function public.convertshorts_apply_razorpay_payment(text,text) from public,anon,authenticated;
grant execute on function public.convertshorts_apply_razorpay_payment(text,text) to service_role;

-- 4. Refund or lost chargeback: take back up to the refunded amount from the
--    customer's unspent balance (the purchased grant first, then any others).
--    Whatever was already spent is recorded as a shortfall for the owner.
--    Idempotent per refund/dispute id; total reversals never exceed the order.
create or replace function public.convertshorts_reverse_razorpay_payment(r text,p text,amount integer,reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.convertshorts_checkout_orders;g public.convertshorts_credit_grants;res record;a jsonb;kept jsonb;need integer;take integer;debited integer:=0;held integer:=0;cap integer;owed integer;
begin
 if coalesce((select auth.role()),'')<>'service_role' then raise exception 'Server access required' using errcode='42501';end if;
 if r !~ '^(rfnd|disp)_[a-zA-Z0-9]+$' or p !~ '^pay_[a-zA-Z0-9]+$' or amount is null or amount<=0 or reason not in ('refund','dispute') then raise exception 'Invalid reversal';end if;
 if exists(select 1 from convertshorts_private.payment_reversals where id=r) then return jsonb_build_object('applied',false,'duplicate',true);end if;
 select * into o from public.convertshorts_checkout_orders where payment_id=p for update;
 if not found then
  -- Unknown or test-mode payment (test orders never store a payment id): nothing to reverse.
  insert into convertshorts_private.payment_alerts(payment_id,kind,ref) values(p,'reversal_without_order',r);
  return jsonb_build_object('applied',false,'unknown',true);
 end if;
 cap:=greatest(0,o.amount_paise-o.reversed_paise);
 owed:=least(amount,cap);need:=owed;
 if o.user_id is not null then
  -- Lock this user's grants in the same order as convertshorts_reserve_credits to avoid deadlocks.
  perform 1 from public.convertshorts_credit_grants where user_id=o.user_id order by expires_at nulls last,id for update;
  -- 1) Unspent balance, starting with the refunded purchase.
  for g in select * from public.convertshorts_credit_grants where user_id=o.user_id and remaining>0
           order by (id='razorpay:'||p||':0') desc,expires_at nulls last,id loop
   exit when need<=0;
   take:=least(need,g.remaining);
   update public.convertshorts_credit_grants set remaining=remaining-take where id=g.id;
   debited:=debited+take;need:=need-take;
  end loop;
  -- 2) Credits held by jobs that have not finished: shrink what a later failure refund
  --    or owner release would give back, so a pending job cannot be used to keep them.
  if need>0 then
   for res in select c.* from convertshorts_private.credit_reservations c join public.convertshorts_generation_requests q on q.id=c.job_id
              where q.user_id=o.user_id and not c.refunded and q.status not in ('COMPLETED','FAILED_REFUNDED') order by q.created_at for update of c loop
    exit when need<=0;
    kept:='[]';
    for a in select * from jsonb_array_elements(res.allocations) loop
     take:=least(need,(a->>'amount')::integer);
     need:=need-take;held:=held+take;
     if (a->>'amount')::integer-take>0 then kept:=kept||jsonb_build_object('id',a->>'id','amount',(a->>'amount')::integer-take);end if;
    end loop;
    update convertshorts_private.credit_reservations set allocations=kept where job_id=res.job_id;
   end loop;
  end if;
 end if;
 insert into convertshorts_private.payment_reversals(id,order_id,payment_id,reason,amount_paise,debited_paise,shortfall_paise)
  values(r,o.id,p,reason,amount,debited+held,greatest(0,need));
 update public.convertshorts_checkout_orders set reversed_paise=reversed_paise+owed where id=o.id;
 return jsonb_build_object('applied',true,'debited',debited,'heldBack',held,'shortfall',greatest(0,need));
end $$;
revoke all on function public.convertshorts_reverse_razorpay_payment(text,text,integer,text) from public,anon,authenticated;
grant execute on function public.convertshorts_reverse_razorpay_payment(text,text,integer,text) to service_role;

-- 5. Dispute opened / other payment notices: record for the owner, no balance change.
create or replace function public.convertshorts_record_payment_alert(p text,kind text,ref text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if coalesce((select auth.role()),'')<>'service_role' then raise exception 'Server access required' using errcode='42501';end if;
 if p !~ '^pay_[a-zA-Z0-9]+$' or kind !~ '^[a-z._]{1,64}$' then raise exception 'Invalid alert';end if;
 insert into convertshorts_private.payment_alerts(order_id,payment_id,kind,ref)
  values((select id from public.convertshorts_checkout_orders where payment_id=p),p,kind,left(ref,64));
 return true;
end $$;
revoke all on function public.convertshorts_record_payment_alert(text,text,text) from public,anon,authenticated;
grant execute on function public.convertshorts_record_payment_alert(text,text,text) to service_role;

-- 6. Owner review. Run these in the SQL editor (as the database owner):
--    select * from convertshorts_private.owner_review;              -- everything needing attention
--    select convertshorts_private.owner_release_stuck('<job uuid>'); -- refund a stuck reservation
create or replace view convertshorts_private.owner_review as
 select 'stuck_generation' as item,id::text as ref,model as detail,credits as paise,created_at
   from public.convertshorts_generation_requests
  where status='RESERVED' and provider is null and created_at<now()-interval '30 minutes'
 union all
 select 'payment_alert',coalesce(order_id,'')||' '||payment_id,kind||coalesce(' '||ref,''),null,created_at
   from convertshorts_private.payment_alerts where resolved_at is null
 union all
 select 'unchecked_generation',id::text,model||' '||status,credits,created_at
   from public.convertshorts_generation_requests
  where provider is not null and status not in ('COMPLETED','FAILED_REFUNDED') and created_at<now()-interval '1 day'
 union all
 select 'reversal_shortfall',order_id||' '||payment_id,reason||' '||id,shortfall_paise,created_at
   from convertshorts_private.payment_reversals where shortfall_paise>0;
revoke all on convertshorts_private.owner_review from public,anon,authenticated;

-- Before releasing a stuck job, check the fal.ai dashboard (Requests) for a job
-- created at that time. If fal did run it, do NOT release: the customer got (or
-- can be sent) the output and fal charged you.
create or replace function convertshorts_private.owner_release_stuck(j uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare r convertshorts_private.credit_reservations;a jsonb;
begin
 if session_user not in ('postgres','supabase_admin') then raise exception 'Owner access required' using errcode='42501';end if;
 select * into r from convertshorts_private.credit_reservations where job_id=j for update;
 if not found or r.refunded then return false;end if;
 if not exists(select 1 from public.convertshorts_generation_requests where id=j and status='RESERVED' and provider is null) then return false;end if;
 for a in select * from jsonb_array_elements(r.allocations) loop update public.convertshorts_credit_grants set remaining=least(credits,remaining+(a->>'amount')::integer) where id=a->>'id';end loop;
 update convertshorts_private.credit_reservations set refunded=true where job_id=j;
 update public.convertshorts_generation_requests set status='FAILED_REFUNDED' where id=j;
 return true;
end $$;
revoke all on function convertshorts_private.owner_release_stuck(uuid) from public,anon,authenticated;
