-- Run as the database administrator. All test records are rolled back.
begin;
create temporary table cs_test_users as select id,row_number() over(order by id) n from auth.users limit 2;
create temporary table cs_test_workspaces as select gen_random_uuid() id,id owner_id,n from cs_test_users;
grant select on cs_test_users,cs_test_workspaces to authenticated;
insert into public.convertshorts_workspaces(id,owner_id,name) select id,owner_id,'Temporary verification' from cs_test_workspaces;
select set_config('request.jwt.claim.sub',(select id::text from cs_test_users where n=1),true);
set local role authenticated;
do $$declare w uuid;r public.convertshorts_records;created public.convertshorts_workspaces;created_id uuid;
begin
 select id into w from cs_test_workspaces where n=1;
 if (select count(*) from public.convertshorts_workspaces where name='Temporary verification')<>1 then raise exception 'Workspace isolation failed';end if;
 insert into public.convertshorts_workspaces(owner_id,name) values(auth.uid(),'Owner creation verification') returning * into created;
 if created.owner_id<>auth.uid() or not exists(select 1 from public.convertshorts_workspaces where id=created.id) then raise exception 'Owner INSERT RETURNING failed';end if;
 created_id=created.id;
 begin insert into public.convertshorts_workspaces(owner_id,name) values((select owner_id from cs_test_workspaces where n=2),'Forged owner') returning * into created;raise exception 'Forged owner accepted';exception when insufficient_privilege then null;end;
 begin update public.convertshorts_workspaces set owner_id=(select owner_id from cs_test_workspaces where n=2) where id=created_id;raise exception 'Owner reassignment accepted';exception when insufficient_privilege then null;end;
 select * into r from public.convertshorts_save_record(w,'projects','verify','{"name":"Test"}',null,0);
 if r.revision<>1 then raise exception 'Insert revision failed';end if;
 select * into r from public.convertshorts_save_record(w,'projects','verify','{"name":"Updated"}',null,1);
 if r.revision<>2 then raise exception 'Update revision failed';end if;
 begin perform public.convertshorts_save_record(w,'projects','verify','{}',null,1);raise exception 'Stale revision accepted';exception when serialization_failure then null;end;
 begin perform public.convertshorts_save_record((select id from cs_test_workspaces where n=2),'projects','intruder','{}',null,0);raise exception 'Cross workspace write accepted';exception when insufficient_privilege then null;end;
 if convertshorts_private.path_workspace('other-app/non-uuid/file') is not null then raise exception 'Invalid storage path accepted';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from cs_test_users where n=2),true);
set local role authenticated;
do $$begin if exists(select 1 from public.convertshorts_records where id='verify') then raise exception 'Private record leaked';end if;if exists(select 1 from public.convertshorts_workspaces where name='Owner creation verification') then raise exception 'New workspace leaked';end if;end $$;
reset role;
-- Existing invited viewers keep read access, without permission to create or
-- reassign the owner's workspace or write private records.
insert into public.convertshorts_members(workspace_id,user_id,role) select w.id,u.id,'viewer' from cs_test_workspaces w cross join cs_test_users u where w.n=1 and u.n=2;
set local role authenticated;
do $$begin if not exists(select 1 from public.convertshorts_workspaces where id=(select id from cs_test_workspaces where n=1)) then raise exception 'Invited member read denied';end if;begin perform public.convertshorts_save_record((select id from cs_test_workspaces where n=1),'projects','viewer-write','{}',null,0);raise exception 'Viewer write accepted';exception when insufficient_privilege then null;end;end $$;
reset role;
select 'PASS owner INSERT RETURNING, forged owner/reassignment rejection, tenant isolation, member reads, viewer write rejection, revisions and private records' result;
rollback;
