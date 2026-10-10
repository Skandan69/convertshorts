-- Isolated ConvertShorts schema. Existing application tables and Auth settings are untouched.
create schema if not exists convertshorts_private;
revoke all on schema convertshorts_private from public, anon;
grant usage on schema convertshorts_private to authenticated;
create table public.convertshorts_workspaces (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 80), created_at timestamptz not null default now()
);
create index on public.convertshorts_workspaces(owner_id);
create table public.convertshorts_members (
 workspace_id uuid not null references public.convertshorts_workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('editor','viewer')), primary key(workspace_id,user_id)
);
create index on public.convertshorts_members(user_id);
create table public.convertshorts_records (
 workspace_id uuid not null references public.convertshorts_workspaces(id) on delete cascade,
 store text not null check(store in ('assets','folders','boards','projects','characters','presets','jobs')),
 id text not null check(length(id) between 1 and 120), payload jsonb not null default '{}',
 blob_path text, revision integer not null default 1, updated_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now(), primary key(workspace_id,store,id),
 check(octet_length(payload::text)<20000000)
);
create index on public.convertshorts_records(updated_by);
create table convertshorts_private.invites (
 code text primary key default encode(extensions.gen_random_bytes(24),'hex'),
 workspace_id uuid not null references public.convertshorts_workspaces(id) on delete cascade,
 role text not null check(role in ('editor','viewer')), expires_at timestamptz not null default now()+interval '7 days',
 created_by uuid not null references auth.users(id)
);
create index convertshorts_invites_workspace_idx on convertshorts_private.invites(workspace_id);
create index convertshorts_invites_creator_idx on convertshorts_private.invites(created_by);
alter table public.convertshorts_workspaces enable row level security;
alter table public.convertshorts_members enable row level security;
alter table public.convertshorts_records enable row level security;
alter table convertshorts_private.invites enable row level security;
-- Membership lookup needs an internal definer to avoid recursive membership RLS.
create function convertshorts_private.can_access(w uuid, write_access boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (
 exists(select 1 from public.convertshorts_workspaces where id=w and owner_id=auth.uid()) or
 exists(select 1 from public.convertshorts_members where workspace_id=w and user_id=auth.uid() and (not write_access or role='editor')))
$$;
revoke all on function convertshorts_private.can_access(uuid,boolean) from public, anon;
grant execute on function convertshorts_private.can_access(uuid,boolean) to authenticated;
-- Read the inserted row's owner directly: the stable membership lookup cannot
-- see a workspace that is still being created by INSERT ... RETURNING.
create policy cs_workspace_read on public.convertshorts_workspaces for select to authenticated using(owner_id=(select auth.uid()) or convertshorts_private.can_access(id));
create policy cs_workspace_create on public.convertshorts_workspaces for insert to authenticated with check(owner_id=(select auth.uid()));
create policy cs_workspace_update on public.convertshorts_workspaces for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy cs_member_read on public.convertshorts_members for select to authenticated using(convertshorts_private.can_access(workspace_id));
create policy cs_member_delete on public.convertshorts_members for delete to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.convertshorts_workspaces w where w.id=workspace_id and w.owner_id=(select auth.uid())));
create policy cs_record_read on public.convertshorts_records for select to authenticated using(convertshorts_private.can_access(workspace_id));
-- Writes go through an optimistic-concurrency RPC, with user JWT permissions enforced.
create function public.convertshorts_save_record(w uuid, s text, k text, p jsonb, b text default null, expected integer default 0)
returns public.convertshorts_records language plpgsql security definer set search_path='' as $$
declare r public.convertshorts_records;
begin
 if auth.uid() is null or not convertshorts_private.can_access(w,true) then raise exception 'Workspace is read only or inaccessible' using errcode='42501'; end if;
 if s not in ('assets','folders','boards','projects','characters','presets','jobs') or length(k) not between 1 and 120 or octet_length(p::text)>20000000 then raise exception 'Invalid record'; end if;
 if b is not null and split_part(b,'/',1)<>w::text then raise exception 'Invalid asset path'; end if;
 if expected=0 then
  insert into public.convertshorts_records(workspace_id,store,id,payload,blob_path,updated_by) values(w,s,k,p,b,auth.uid()) returning * into r;
 else
  update public.convertshorts_records set payload=p,blob_path=b,revision=revision+1,updated_by=auth.uid(),updated_at=now() where workspace_id=w and store=s and id=k and revision=expected returning * into r;
  if not found then raise exception 'This item changed on another device. Sync before saving.' using errcode='40001'; end if;
 end if;
 return r;
end $$;
revoke all on function public.convertshorts_save_record(uuid,text,text,jsonb,text,integer) from public, anon;
grant execute on function public.convertshorts_save_record(uuid,text,text,jsonb,text,integer) to authenticated;
create function public.convertshorts_create_invite(w uuid, member_role text default 'viewer') returns text
language plpgsql security definer set search_path='' as $$
declare token text;
begin
 if auth.uid() is null or not exists(select 1 from public.convertshorts_workspaces where id=w and owner_id=auth.uid()) then raise exception 'Only the owner can invite members' using errcode='42501'; end if;
 if member_role not in ('viewer','editor') then raise exception 'Invalid role'; end if;
 insert into convertshorts_private.invites(workspace_id,role,created_by) values(w,member_role,auth.uid()) returning code into token;
 return token;
end $$;
revoke all on function public.convertshorts_create_invite(uuid,text) from public, anon;
grant execute on function public.convertshorts_create_invite(uuid,text) to authenticated;
create function public.convertshorts_join_workspace(invite_code text) returns uuid language plpgsql security definer set search_path='' as $$
declare i convertshorts_private.invites;
begin
 if auth.uid() is null then raise exception 'Sign in first' using errcode='42501'; end if;
 select * into i from convertshorts_private.invites where code=invite_code and expires_at>now() for update;
 if not found then raise exception 'Invitation is invalid or expired'; end if;
 insert into public.convertshorts_members(workspace_id,user_id,role) values(i.workspace_id,auth.uid(),i.role) on conflict(workspace_id,user_id) do update set role=excluded.role;
 return i.workspace_id;
end $$;
revoke all on function public.convertshorts_join_workspace(text) from public, anon;
grant execute on function public.convertshorts_join_workspace(text) to authenticated;
create function public.convertshorts_revoke_invites(w uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.convertshorts_workspaces where id=w and owner_id=auth.uid()) then raise exception 'Only the owner can revoke invitations' using errcode='42501'; end if;
 delete from convertshorts_private.invites where workspace_id=w;
end $$;
revoke all on function public.convertshorts_revoke_invites(uuid) from public, anon;
grant execute on function public.convertshorts_revoke_invites(uuid) to authenticated;
revoke all on public.convertshorts_workspaces, public.convertshorts_members, public.convertshorts_records from anon;
grant select,insert,update on public.convertshorts_workspaces to authenticated;
grant select,delete on public.convertshorts_members to authenticated;
grant select on public.convertshorts_records to authenticated;
create function convertshorts_private.path_workspace(p text) returns uuid language sql immutable set search_path='' as $$ select case when split_part(p,'/',1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(p,'/',1)::uuid else null end $$;
revoke all on function convertshorts_private.path_workspace(text) from public, anon;
grant execute on function convertshorts_private.path_workspace(text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit) values('convertshorts-private','convertshorts-private',false,157286400);
create policy cs_storage_read on storage.objects for select to authenticated using(bucket_id='convertshorts-private' and convertshorts_private.can_access(convertshorts_private.path_workspace(name)));
create policy cs_storage_insert on storage.objects for insert to authenticated with check(bucket_id='convertshorts-private' and convertshorts_private.can_access(convertshorts_private.path_workspace(name),true));
create policy cs_storage_update on storage.objects for update to authenticated using(bucket_id='convertshorts-private' and convertshorts_private.can_access(convertshorts_private.path_workspace(name),true)) with check(bucket_id='convertshorts-private' and convertshorts_private.can_access(convertshorts_private.path_workspace(name),true));
create policy cs_storage_delete on storage.objects for delete to authenticated using(bucket_id='convertshorts-private' and convertshorts_private.can_access(convertshorts_private.path_workspace(name),true));
