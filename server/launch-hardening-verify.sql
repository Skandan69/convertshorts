-- Verify launch-hardening.sql on the real database. Every change is rolled back.
begin;
do $$
declare u uuid; o text:='order_lh'||replace(gen_random_uuid()::text,'-','');p text:='pay_lh'||replace(gen_random_uuid()::text,'-','');
 p2 text:='pay_lh2'||replace(gen_random_uuid()::text,'-','');j uuid:=gen_random_uuid();n integer;res jsonb;
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
 -- spend ₹60, then a full ₹100 refund takes back the ₹40 left and records a ₹60 shortfall
 perform public.convertshorts_reserve_credits(u,j,'kling',6000);
 res:=public.convertshorts_reverse_razorpay_payment('rfnd_lh1',p,10000,'refund');
 if (res->>'debited')::int<>4000 or (res->>'shortfall')::int<>6000 then raise exception 'Refund debit wrong: %',res;end if;
 select sum(remaining) into n from public.convertshorts_credit_grants where user_id=u;
 if n<>0 then raise exception 'Balance after refund: %',n;end if;
 if (public.convertshorts_reverse_razorpay_payment('rfnd_lh1',p,10000,'refund')->>'duplicate')::boolean is not true then raise exception 'Refund replay must be ignored';end if;
 res:=public.convertshorts_reverse_razorpay_payment('disp_lh1',p,10000,'dispute');
 if (res->>'debited')::int<>0 or (res->>'shortfall')::int<>0 then raise exception 'Reversals must never exceed the order: %',res;end if;
 if (public.convertshorts_reverse_razorpay_payment('rfnd_lh2','pay_unknownlh',500,'refund')->>'unknown')::boolean is not true then raise exception 'Unknown payment must be ignored';end if;
 if not exists(select 1 from convertshorts_private.owner_review where item='reversal_shortfall') then raise exception 'Shortfall must reach owner review';end if;
 -- account deletion keeps the accounting rows
 delete from auth.users where id=u;
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
select 'PASS duplicate-capture alert, refund/dispute debits capped at the order, shortfall review, records kept on account deletion, server-only access; all fixtures rolled back' as result;
