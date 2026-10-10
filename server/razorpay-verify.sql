-- Test the real payment grant transaction, ownership and permissions. Roll back everything.
begin;
do $$
declare u uuid; o text:='order_test'||replace(gen_random_uuid()::text,'-','');p text:='pay_test'||replace(gen_random_uuid()::text,'-','');j uuid:=gen_random_uuid();n integer;
begin
 select id into u from auth.users where not exists(select 1 from public.convertshorts_credit_grants g where g.user_id=auth.users.id) limit 1;
 if u is null then raise exception 'Need an account without credit grants for isolated verification';end if;
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 insert into public.convertshorts_checkout_orders(id,user_id,pack,amount_paise) values(o,u,'topup-100',10000);
 if not public.convertshorts_apply_razorpay_payment(o,p) or public.convertshorts_apply_razorpay_payment(o,p) then raise exception 'Payment replay credited twice';end if;
 select sum(remaining) into n from public.convertshorts_credit_grants where user_id=u;
 if n<>10000 then raise exception 'Payment grant value incorrect';end if;
 perform public.convertshorts_reserve_credits(u,j,'kling',4200);
 select sum(remaining) into n from public.convertshorts_credit_grants where user_id=u;
 if n<>5800 then raise exception 'INR reservation incorrect';end if;
 if not public.convertshorts_refund_generation(j) or public.convertshorts_refund_generation(j) then raise exception 'Failure refund not idempotent';end if;
 if has_table_privilege('anon','public.convertshorts_checkout_orders','select') or has_table_privilege('authenticated','public.convertshorts_checkout_orders','insert') or has_function_privilege('authenticated','public.convertshorts_apply_razorpay_payment(text,text)','execute') then raise exception 'Payment privileges exposed to clients';end if;
 perform set_config('request.jwt.claims','{"role":"authenticated"}',true);
 begin
  perform public.convertshorts_apply_razorpay_payment(o,p);
  raise exception 'Client granted payment balance';
 exception when insufficient_privilege then null;end;
end $$;
rollback;
select 'PASS real Razorpay ledger grant, callback/webhook replay, INR spending/refund and server-only payment privileges; all fixtures rolled back' as result;
