-- ConvertShorts-only retention. Accounts and prepaid balances never expire here.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net;

alter table public.convertshorts_records add column if not exists expires_at timestamptz not null default (now()+interval '30 days');
create index if not exists cs_records_expiry_idx on public.convertshorts_records(expires_at);

-- Preserve the original expiry through edits; clients cannot extend retention.
create or replace function convertshorts_private.record_expiry_guard() returns trigger
language plpgsql set search_path='' as $$ begin
 if TG_OP='INSERT' then new.expires_at=now()+interval '30 days';
 else
  if old.expires_at<=now() then raise exception 'This cloud item expired. Import a downloaded copy as a new file.' using errcode='22023'; end if;
  new.expires_at=old.expires_at;
 end if; return new;
end $$;
revoke all on function convertshorts_private.record_expiry_guard() from public,anon,authenticated;
drop trigger if exists cs_record_expiry_guard on public.convertshorts_records;
create trigger cs_record_expiry_guard before insert or update on public.convertshorts_records for each row execute function convertshorts_private.record_expiry_guard();
drop policy if exists cs_record_read on public.convertshorts_records;
create policy cs_record_read on public.convertshorts_records for select to authenticated using(expires_at>now() and convertshorts_private.can_access(workspace_id));

-- Each physical file gets its own immutable upload date. Expired files cannot be
-- read or signed, even if metadata survives a delayed cleanup job.
drop policy if exists cs_storage_read on storage.objects;
create policy cs_storage_read on storage.objects for select to authenticated using(bucket_id='convertshorts-private' and created_at>now()-interval '30 days' and convertshorts_private.can_access(convertshorts_private.path_workspace(name)));
drop policy if exists cs_storage_update on storage.objects;
create policy cs_storage_update on storage.objects for update to authenticated using(bucket_id='convertshorts-private' and created_at>now()-interval '30 days' and convertshorts_private.can_access(convertshorts_private.path_workspace(name),true)) with check(bucket_id='convertshorts-private' and created_at>now()-interval '30 days' and convertshorts_private.can_access(convertshorts_private.path_workspace(name),true));

-- RLS enforces the cap without adding triggers or indexes to Supabase-owned
-- Storage tables. The Storage API supplies the measured file size.
create or replace function convertshorts_private.media_quota_allowed(object_name text,incoming_bytes bigint) returns boolean
language plpgsql security definer volatile set search_path='' as $$
declare owner_user uuid; used_bytes bigint; w uuid;
begin
 w=convertshorts_private.path_workspace(object_name);
 if not convertshorts_private.can_access(w,true) then return false; end if;
 select owner_id into owner_user from public.convertshorts_workspaces where id=w;
 if owner_user is null or incoming_bytes is null or incoming_bytes<0 or incoming_bytes>157286400 then return false; end if;
 perform pg_advisory_xact_lock(hashtextextended(owner_user::text,901));
 select coalesce(sum(coalesce((o.metadata->>'size')::bigint,0)),0) into used_bytes
 from storage.objects o join public.convertshorts_workspaces ws on ws.id=convertshorts_private.path_workspace(o.name)
 where o.bucket_id='convertshorts-private' and ws.owner_id=owner_user and o.name<>object_name;
 return used_bytes+incoming_bytes<=524288000;
end $$;
revoke all on function convertshorts_private.media_quota_allowed(text,bigint) from public,anon;
grant execute on function convertshorts_private.media_quota_allowed(text,bigint) to authenticated;
drop policy if exists cs_storage_insert on storage.objects;
create policy cs_storage_insert on storage.objects for insert to authenticated with check(bucket_id='convertshorts-private' and convertshorts_private.media_quota_allowed(name,coalesce((metadata->>'size')::bigint,0)));
drop policy if exists cs_storage_update on storage.objects;
create policy cs_storage_update on storage.objects for update to authenticated using(bucket_id='convertshorts-private' and created_at>now()-interval '30 days' and convertshorts_private.can_access(convertshorts_private.path_workspace(name),true)) with check(bucket_id='convertshorts-private' and created_at>now()-interval '30 days' and convertshorts_private.media_quota_allowed(name,coalesce((metadata->>'size')::bigint,0)));

create or replace function public.convertshorts_storage_usage(w uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare owner_user uuid; used_bytes bigint; next_expiry timestamptz;
begin
 if auth.uid() is null or not convertshorts_private.can_access(w) then raise exception 'Sign in to your workspace' using errcode='42501'; end if;
 select owner_id into owner_user from public.convertshorts_workspaces where id=w;
 select coalesce(sum(coalesce((o.metadata->>'size')::bigint,0)),0),min(o.created_at+interval '30 days') into used_bytes,next_expiry
 from storage.objects o join public.convertshorts_workspaces ws on ws.id=convertshorts_private.path_workspace(o.name)
 where o.bucket_id='convertshorts-private' and ws.owner_id=owner_user;
 return jsonb_build_object('usedBytes',used_bytes,'limitBytes',524288000,'retentionDays',30,'nextExpiry',next_expiry);
end $$;
revoke all on function public.convertshorts_storage_usage(uuid) from public,anon;
grant execute on function public.convertshorts_storage_usage(uuid) to authenticated;

create table if not exists convertshorts_private.maintenance (
 name text primary key, last_started timestamptz not null default '-infinity',last_completed timestamptz,deleted_files integer not null default 0
);
alter table convertshorts_private.maintenance enable row level security;
revoke all on convertshorts_private.maintenance from public,anon,authenticated;
insert into convertshorts_private.maintenance(name) values('retention') on conflict do nothing;
-- Generate a scheduler token inside Vault. Never return it to a client or log.
do $$ begin
 if not exists(select 1 from vault.secrets where name='convertshorts_retention_token') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'convertshorts_retention_token');
 end if;
end $$;
create or replace function public.convertshorts_claim_retention(token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare files jsonb; last_run timestamptz; expected_token text;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Server only' using errcode='42501'; end if;
 select decrypted_secret into expected_token from vault.decrypted_secrets where name='convertshorts_retention_token';
 if expected_token is null or token is null or length(token)<>64 or token<>expected_token then raise exception 'Invalid scheduler token' using errcode='42501'; end if;
 select last_started into last_run from convertshorts_private.maintenance where name='retention' for update;
 if last_run>now()-interval '10 minutes' then return jsonb_build_object('claimed',false); end if;
 update convertshorts_private.maintenance set last_started=now() where name='retention';
 select coalesce(jsonb_agg(name),'[]') into files from (select name from storage.objects where bucket_id='convertshorts-private' and created_at<=now()-interval '30 days' order by created_at limit 500) candidates;
 return jsonb_build_object('claimed',true,'paths',files);
end $$;
revoke all on function public.convertshorts_claim_retention(text) from public,anon,authenticated;
grant execute on function public.convertshorts_claim_retention(text) to service_role;
create or replace function public.convertshorts_finish_retention(deleted integer) returns void
language plpgsql security definer set search_path='' as $$ begin
 if auth.role() is distinct from 'service_role' then raise exception 'Server only' using errcode='42501'; end if;
 delete from public.convertshorts_records where expires_at<=now();
 update convertshorts_private.maintenance set last_completed=now(),deleted_files=greatest(0,least(deleted,500)) where name='retention';
end $$;
revoke all on function public.convertshorts_finish_retention(integer) from public,anon,authenticated;
grant execute on function public.convertshorts_finish_retention(integer) to service_role;

-- Remove physical bytes through the Storage API, never by deleting object rows.
select cron.schedule('convertshorts-30-day-retention','17 * * * *',$cron$
 select net.http_post(
  url:='https://chrfgzbecjvjazdovmyk.supabase.co/functions/v1/convertshorts-retention',
  headers:=jsonb_build_object('Content-Type','application/json','x-retention-token',(select decrypted_secret from vault.decrypted_secrets where name='convertshorts_retention_token')),
  body:='{}'::jsonb,timeout_milliseconds:=15000);
$cron$);
commit;
