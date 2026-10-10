begin;
create temporary table cs_ret_users as select id,row_number() over(order by id) n from auth.users limit 2;
create temporary table cs_ret_ws as select gen_random_uuid() id,id owner_id,n from cs_ret_users;
grant select on cs_ret_users,cs_ret_ws to authenticated;
insert into public.convertshorts_workspaces(id,owner_id,name) select id,owner_id,'Retention rollback test' from cs_ret_ws;
select set_config('request.jwt.claim.sub',(select id::text from cs_ret_users where n=1),true);
set local role authenticated;
do $$ declare w uuid; r public.convertshorts_records; first_expiry timestamptz; begin
 select id into w from cs_ret_ws where n=1;
 select * into r from public.convertshorts_save_record(w,'projects','ret-test','{}',null,0);
 first_expiry=r.expires_at;
 if first_expiry<>now()+interval '30 days' then raise exception 'Wrong retention duration'; end if;
 select * into r from public.convertshorts_save_record(w,'projects','ret-test','{"name":"edited"}',null,1);
 if r.expires_at<>first_expiry then raise exception 'Edits extended expiry'; end if;
 for i in 1..5 loop insert into storage.objects(bucket_id,name,metadata) values('convertshorts-private',w::text||'/file-'||i,'{"size":104857600}'); end loop;
 if (public.convertshorts_storage_usage(w)->>'usedBytes')::bigint<>524288000 then raise exception 'Quota reporting failed'; end if;
 begin insert into storage.objects(bucket_id,name,metadata) values('convertshorts-private',w::text||'/overflow','{"size":1}');raise exception 'Over-quota upload accepted';exception when insufficient_privilege then null;end;
 begin insert into storage.objects(bucket_id,name,metadata) values('convertshorts-private',w::text||'/too-large','{"size":158334976}');raise exception 'Over-size upload accepted';exception when insufficient_privilege then null;end;
 begin perform public.convertshorts_storage_usage((select id from cs_ret_ws where n=2));raise exception 'Cross-tenant storage usage leaked';exception when insufficient_privilege then null;end;
 begin perform public.convertshorts_claim_retention(repeat('a',64));raise exception 'Customer cleanup accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
-- Simulate elapsed time inside this rollback transaction only.
alter table public.convertshorts_records disable trigger cs_record_expiry_guard;
update public.convertshorts_records set expires_at=now()-interval '1 day' where id='ret-test' and workspace_id in(select id from cs_ret_ws);
alter table public.convertshorts_records enable trigger cs_record_expiry_guard;
insert into storage.objects(bucket_id,name,created_at,metadata) select 'convertshorts-private',id::text||'/expired',now()-interval '31 days','{"size":0}' from cs_ret_ws where n=1;
set local role authenticated;
do $$ begin
 if exists(select 1 from public.convertshorts_records where id='ret-test') then raise exception 'Expired record readable';end if;
 if exists(select 1 from storage.objects where name like '%/expired') then raise exception 'Expired media readable';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from cs_ret_users where n=2),true);
set local role authenticated;
do $$begin if exists(select 1 from storage.objects where name like '%/file-%' and bucket_id='convertshorts-private') then raise exception 'Other owner media readable';end if;end $$;
reset role;
select 'PASS immutable 30 days, 500 MB cap, 150 MB/file, quota reporting, expired media/record denial, cross-account isolation and customer cleanup denial' result;
rollback;
