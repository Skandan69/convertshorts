-- Verify launch-hardening.sql on the real database. Every change is rolled back.
begin;
do $$
declare u uuid; o text:='order_lh'||replace(gen_random_uuid()::text,'-','');p text:='pay_lh'||replace(gen_random_uuid()::text,'-','');
 p2 text:='pay_lh2'||replace(gen_random_uuid()::text,'-','');o2 text:='order_lh2'||replace(gen_random_uuid()::text,'-','');j uuid:=gen_random_uuid();j2 uuid:=gen_random_uuid();n integer;res jsonb;
begin
 select id into u from auth.users where not exists(select 1 from public.convertshorts_credit_grants g where g.user_id=auth.users.id) limit 1;
 if u is null then raise exception 'Need an account without credit grants for isolated verification';end if;
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 insert into public.convertshorts_checkout_orders(id,user_id,pack,amount_paise) values(o,u,'topup-100',10000);
 if not public.convertshorts_apply_razorpay_payment(o,p) then raise exception 'First capture must credit';end if;
 if public.convertshorts_apply_razorpay_payment(o,p) is distinct from false then raise exception 'Replay must return false';end if;
 if public.convertshorts_apply_razorpay_payment(o,p2) is not null then raise exception 'Duplicate capture must return null';end if;
 if not exists(select 1 from convertshorts_private.payment_alerts where payment_id=p2 and kind='duplicate_capture') then raise exception 'Duplicate capture must alert the owner';end if;
 select sum(remaining) into n from public.convertshorts_credit_grants where user_id=u;
 if n<>10000 then raise exception 'Duplicate capture must not grant: %',n;end if;
 -- spend ₹30 on a finished job and hold ₹30 on a pending one; a full ₹100 refund takes the
 -- ₹40 left, holds back the pending ₹30 and records the finished ₹30 as a shortfall
 perform public.convertshorts_reserve_credits(u,j,'kling',3000);
 update public.convertshorts_generation_requests set status='COMPLETED' where id=j;
 perform public.convertshorts_reserve_credits(u,j2,'kling',3000);
 res:=public.convertshorts_reverse_razorpay_payment('rfnd_lh1',p,10000,'refund');
 if (res->>'debited')::int<>4000 or (res->>'heldBack')::int<>3000 or (res->>'shortfall')::int<>3000 then raise exception 'Refund debit wrong: %',res;end if;
 select sum(remaining) into n from public.convertshorts_credit_grants where user_id=u;
 if n<>0 then raise exception 'Balance after refund: %',n;end if;
 -- the pending job failing afterwards must not hand the refunded credits back
 perform public.convertshorts_refund_generation(j2);
 select sum(remaining) into n from public.convertshorts_credit_grants where user_id=u;
 if n<>0 then raise exception 'Pending job refund restored refunded credits: %',n;end if;
 if (public.convertshorts_reverse_razorpay_payment('rfnd_lh1',p,10000,'refund')->>'duplicate')::boolean is not true then raise exception 'Refund replay must be ignored';end if;
 res:=public.convertshorts_reverse_razorpay_payment('disp_lh1',p,10000,'dispute');
 if (res->>'debited')::int<>0 or (res->>'shortfall')::int<>0 then raise exception 'Reversals must never exceed the order: %',res;end if;
 if (public.convertshorts_reverse_razorpay_payment('rfnd_lh2','pay_unknownlh',500,'refund')->>'unknown')::boolean is not true then raise exception 'Unknown payment must be ignored';end if;
 if not exists(select 1 from convertshorts_private.owner_review where item='reversal_shortfall') then raise exception 'Shortfall must reach owner review';end if;
 -- account deletion keeps the accounting rows
 insert into public.convertshorts_checkout_orders(id,user_id,pack,amount_paise) values(o2,u,'topup-100',10000);
 delete from auth.users where id=u;
 if public.convertshorts_apply_razorpay_payment(o2,'pay_lh3x') is not null then raise exception 'Payment for a deleted account must return null';end if;
 if not exists(select 1 from convertshorts_private.payment_alerts where kind='payment_for_deleted_account') then raise exception 'Payment for a deleted account must alert the owner';end if;
 if not exists(select 1 from public.convertshorts_checkout_orders where id=o and user_id is null) then raise exception 'Order record must survive account deletion';end if;
 if not exists(select 1 from public.convertshorts_generation_requests where id=j and user_id is null) then raise exception 'Usage record must survive account deletion';end if;
 -- client roles can reach none of it
 if has_function_privilege('authenticated','public.convertshorts_reverse_razorpay_payment(text,text,integer,text)','execute')
  or has_function_privilege('anon','public.convertshorts_record_payment_alert(text,text,text)','execute')
  or has_function_privilege('authenticated','convertshorts_private.owner_release_stuck(uuid)','execute')
  or has_table_privilege('authenticated','convertshorts_private.payment_alerts','select') then raise exception 'Owner/payment functions exposed to clients';end if;
 perform set_config('request.jwt.claims','{"role":"authenticated"}',true);
 begin
  perform public.convertshorts_reverse_razorpay_payment('rfnd_lh3',p,1,'refund');
  raise exception 'Client reversed a payment';
 exception when insufficient_privilege then null;end;
end $$;
rollback;
select 'PASS duplicate-capture alert, refund/dispute debits capped at the order incl. pending-job holdback, deleted-account payment alert, shortfall review, records kept on account deletion, server-only access; all fixtures rolled back' as result;
