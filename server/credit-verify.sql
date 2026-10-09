-- All fixtures and changes roll back. No emails, purchases, or provider requests.
begin;
do $$
declare u uuid; j uuid:=gen_random_uuid(); j2 uuid:=gen_random_uuid(); n integer; event text:='cs-test-'||gen_random_uuid();
begin
 select id into u from auth.users where not exists(select 1 from public.convertshorts_credit_grants g where g.user_id=auth.users.id) limit 1;
 if u is null then raise exception 'Need an account without credit grants for isolated verification';end if;
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 if not public.convertshorts_apply_billing_event(event,u,'cus_test_'||event,'Test',null,50,'subscription',now()-interval '1 day',12) then raise exception 'Grant failed';end if;
 if public.convertshorts_apply_billing_event(event,u,'cus_test_'||event,'Test',null,50,'subscription',now()-interval '1 day',12) then raise exception 'Event replay granted twice';end if;
 perform public.convertshorts_apply_billing_event(event||'-pack',u,'cus_test_'||event,'Test',null,20,'pack',now(),1);
 select count(*) into n from public.convertshorts_credit_grants where user_id=u;
 if n<>13 then raise exception 'Annual credit schedule incorrect';end if;
 perform public.convertshorts_reserve_credits(u,j,'test-model',60);
 select sum(remaining) into n from public.convertshorts_credit_grants where user_id=u and valid_from<=now();
 if n<>10 then raise exception 'Reservation balance incorrect';end if;
 if not public.convertshorts_refund_generation(j) or public.convertshorts_refund_generation(j) then raise exception 'Refund not idempotent';end if;
 perform public.convertshorts_reserve_credits(u,j2,'test-model',70);
 begin
  perform public.convertshorts_reserve_credits(u,gen_random_uuid(),'test-model',1);
  raise exception 'Allowed overspend';
 exception when raise_exception then
  if sqlerrm<>'Insufficient workspace credits' then raise;end if;
 end;
 update public.convertshorts_generation_requests set status='COMPLETED' where id=j2;
 if public.convertshorts_refund_generation(j2) then raise exception 'Completed generation refunded';end if;
 perform set_config('request.jwt.claims','{"role":"authenticated"}',true);
 begin
  perform public.convertshorts_apply_billing_event(event||'-forged',u,'cus_test_'||event,'Test',null,100,'pack',now(),1);
  raise exception 'Client granted credits';
 exception when insufficient_privilege then null;end;
 begin
  perform public.convertshorts_reserve_credits(u,gen_random_uuid(),'test',1);
  raise exception 'Client reserved credits';
 exception when insufficient_privilege then null;end;
 if has_function_privilege('anon','public.convertshorts_reserve_credits(uuid,uuid,text,integer)','execute') or has_function_privilege('authenticated','public.convertshorts_apply_billing_event(text,uuid,text,text,text,integer,text,timestamptz,integer)','execute') then raise exception 'Client has server privileges';end if;
end $$;
rollback;
select 'PASS scheduled grants, webhook replay, atomic spending, insufficient credit rollback, idempotent failure refunds and server-only permissions' as result;
