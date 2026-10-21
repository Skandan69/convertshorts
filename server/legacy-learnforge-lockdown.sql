-- Close public access to the old LearnForge data that shares this Supabase project.
-- Found 2026-10-21: the site's public (anon) key could read the `leaderboard` view
-- (people's full names, XP, rank) plus `courses` and `lessons`.
--
-- Run once in the Supabase SQL editor. It removes anon/authenticated access from
-- every public table, view and function whose name does NOT start with
-- `convertshorts_`. ConvertShorts only uses `convertshorts_*` objects, so the site
-- is unaffected. Nothing is deleted. Every removed grant is saved first, so it can
-- be restored with the statement at the bottom.

create table if not exists convertshorts_private.legacy_grant_backup(
 object_type text not null, object_name text not null, grantee text not null, privilege text not null,
 saved_at timestamptz not null default now());
alter table convertshorts_private.legacy_grant_backup enable row level security;
revoke all on convertshorts_private.legacy_grant_backup from public,anon,authenticated;

insert into convertshorts_private.legacy_grant_backup(object_type,object_name,grantee,privilege)
select 'table',format('public.%I',table_name),grantee,privilege_type
  from information_schema.role_table_grants
 where table_schema='public' and table_name not like 'convertshorts\_%' and grantee in ('anon','authenticated');

insert into convertshorts_private.legacy_grant_backup(object_type,object_name,grantee,privilege)
select 'function',p.oid::regprocedure::text,coalesce(r.rolname,'PUBLIC'),'EXECUTE'
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
  left join pg_roles r on r.oid=a.grantee
 where n.nspname='public' and p.proname not like 'convertshorts\_%' and p.prokind in ('f','p')
   and a.privilege_type='EXECUTE' and (a.grantee=0 or r.rolname in ('anon','authenticated'));

do $$
declare obj record;
begin
 for obj in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
             where n.nspname='public' and c.relkind in ('r','v','m','f','p') and c.relname not like 'convertshorts\_%' loop
  execute format('revoke all on table public.%I from anon, authenticated',obj.relname);
 end loop;
 for obj in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
             where n.nspname='public' and c.relkind='S' and c.relname not like 'convertshorts\_%' loop
  execute format('revoke all on sequence public.%I from anon, authenticated',obj.relname);
 end loop;
 for obj in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
             where n.nspname='public' and p.proname not like 'convertshorts\_%' and p.prokind in ('f','p') loop
  execute format('revoke execute on function %s from public, anon, authenticated',obj.sig);
 end loop;
end $$;

-- Check: should return no rows.
select 'still exposed' as problem,table_name as object,grantee,privilege_type
  from information_schema.role_table_grants
 where table_schema='public' and table_name not like 'convertshorts\_%' and grantee in ('anon','authenticated')
union all
select 'still callable',p.oid::regprocedure::text,'anon','EXECUTE'
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname not like 'convertshorts\_%' and p.prokind in ('f','p')
   and has_function_privilege('anon',p.oid,'EXECUTE');

-- Also review (not changed by this script): storage buckets marked public.
--   select id, public from storage.buckets where public;
--
-- To undo (only if LearnForge is ever brought back):
--   do $$ declare g record; begin
--     for g in select * from convertshorts_private.legacy_grant_backup loop
--       if g.object_type='table' then execute format('grant %s on table %s to %I',g.privilege,g.object_name,g.grantee);
--       elsif g.grantee='PUBLIC' then execute format('grant execute on function %s to public',g.object_name);
--       else execute format('grant execute on function %s to %I',g.object_name,g.grantee); end if;
--     end loop; end $$;
