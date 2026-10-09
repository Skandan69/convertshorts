create table public.convertshorts_generation_requests(id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade,model text not null,status text not null default 'RESERVED',credits integer not null,provider jsonb,created_at timestamptz not null default now());
create index on public.convertshorts_generation_requests(user_id);
create table convertshorts_private.credit_reservations(job_id uuid primary key references public.convertshorts_generation_requests(id),allocations jsonb not null,refunded boolean not null default false);
alter table public.convertshorts_generation_requests enable row level security;
alter table convertshorts_private.credit_reservations enable row level security;
create policy cs_generation_read on public.convertshorts_generation_requests for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.convertshorts_generation_requests from anon,authenticated;
grant select on public.convertshorts_generation_requests to authenticated;
grant all on public.convertshorts_generation_requests to service_role;
create function public.convertshorts_reserve_credits(u uuid,j uuid,m text,amount integer) returns boolean language plpgsql security definer set search_path='' as $$
declare g public.convertshorts_credit_grants;need integer:=amount;take integer;alloc jsonb:='[]';
begin
 if coalesce((select auth.role()),'')<>'service_role' then raise exception 'Server access required' using errcode='42501';end if;
 if amount<=0 or amount>1000000 then raise exception 'Invalid cost';end if;
 for g in select * from public.convertshorts_credit_grants where user_id=u and remaining>0 and valid_from<=now() and (expires_at is null or expires_at>now()) order by expires_at nulls last,id for update loop
  take:=least(need,g.remaining);update public.convertshorts_credit_grants set remaining=remaining-take where id=g.id;alloc:=alloc||jsonb_build_object('id',g.id,'amount',take);need:=need-take;exit when need=0;
 end loop;
 if need>0 then raise exception 'Insufficient workspace credits';end if;
 insert into public.convertshorts_generation_requests(id,user_id,model,credits) values(j,u,m,amount);
 insert into convertshorts_private.credit_reservations(job_id,allocations) values(j,alloc);
 return true;
end $$;
revoke all on function public.convertshorts_reserve_credits(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.convertshorts_reserve_credits(uuid,uuid,text,integer) to service_role;
create function public.convertshorts_refund_generation(j uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare r convertshorts_private.credit_reservations;a jsonb;
begin
 if coalesce((select auth.role()),'')<>'service_role' then raise exception 'Server access required' using errcode='42501';end if;
 select * into r from convertshorts_private.credit_reservations where job_id=j for update;
 if not found or r.refunded then return false;end if;
 if exists(select 1 from public.convertshorts_generation_requests where id=j and status='COMPLETED') then return false;end if;
 for a in select * from jsonb_array_elements(r.allocations) loop update public.convertshorts_credit_grants set remaining=least(credits,remaining+(a->>'amount')::integer) where id=a->>'id';end loop;
 update convertshorts_private.credit_reservations set refunded=true where job_id=j;
 update public.convertshorts_generation_requests set status='FAILED_REFUNDED' where id=j;
 return true;
end $$;
revoke all on function public.convertshorts_refund_generation(uuid) from public,anon,authenticated;
grant execute on function public.convertshorts_refund_generation(uuid) to service_role;
