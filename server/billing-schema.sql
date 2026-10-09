create table public.convertshorts_billing_accounts(user_id uuid primary key references auth.users(id) on delete cascade,customer_id text unique,plan text not null default 'Free',subscription_id text,updated_at timestamptz not null default now());
create table public.convertshorts_credit_grants(id text primary key,user_id uuid not null references auth.users(id) on delete cascade,credits integer not null check(credits>=0),remaining integer not null check(remaining>=0),valid_from timestamptz not null default now(),expires_at timestamptz,source text not null);
create index on public.convertshorts_credit_grants(user_id,valid_from,expires_at);
create table convertshorts_private.billing_events(id text primary key,created_at timestamptz default now());
alter table public.convertshorts_billing_accounts enable row level security;
alter table public.convertshorts_credit_grants enable row level security;
alter table convertshorts_private.billing_events enable row level security;
create policy cs_billing_read on public.convertshorts_billing_accounts for select to authenticated using(user_id=(select auth.uid()));
create policy cs_credit_read on public.convertshorts_credit_grants for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.convertshorts_billing_accounts,public.convertshorts_credit_grants from anon,authenticated;
grant select on public.convertshorts_billing_accounts,public.convertshorts_credit_grants to authenticated;
grant all on public.convertshorts_billing_accounts,public.convertshorts_credit_grants to service_role;
create function public.convertshorts_apply_billing_event(event_id text,u uuid,customer text,plan_name text,subscription text,credits integer,source_name text,start_at timestamptz,months integer default 1) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if coalesce((select auth.role()),'')<>'service_role' then raise exception 'Server access required' using errcode='42501';end if;
 if credits<0 or credits>10000000 or months not between 1 and 12 then raise exception 'Invalid credit grant';end if;
 insert into convertshorts_private.billing_events(id) values(event_id) on conflict do nothing;
 if not found then return false;end if;
 insert into public.convertshorts_billing_accounts(user_id,customer_id,plan,subscription_id) values(u,customer,plan_name,subscription) on conflict(user_id) do update set customer_id=excluded.customer_id,plan=excluded.plan,subscription_id=excluded.subscription_id,updated_at=now();
 for n in 0..months-1 loop
  insert into public.convertshorts_credit_grants(id,user_id,credits,remaining,valid_from,expires_at,source) values(event_id||':'||n,u,credits,credits,start_at+n*interval '1 month',case when source_name='pack' then null else start_at+(n+1)*interval '1 month' end,source_name);
 end loop;
 return true;
end $$;
revoke all on function public.convertshorts_apply_billing_event(text,uuid,text,text,text,integer,text,timestamptz,integer) from public,anon,authenticated;
grant execute on function public.convertshorts_apply_billing_event(text,uuid,text,text,text,integer,text,timestamptz,integer) to service_role;
