-- Existing live billing ledgers were empty before switching USD cents to INR paise.
-- Abort a first installation on a non-empty legacy ledger; migrate its currency explicitly.
do $$ begin
 if to_regclass('public.convertshorts_checkout_orders') is null and (exists(select 1 from public.convertshorts_credit_grants) or exists(select 1 from public.convertshorts_generation_requests)) then
  raise exception 'Legacy USD balances require an explicit currency migration';
 end if;
end $$;
create table if not exists public.convertshorts_checkout_orders(
 id text primary key check(id ~ '^order_[a-zA-Z0-9]+$'),
 user_id uuid not null references auth.users(id) on delete cascade,
 pack text not null,
 amount_paise integer not null check(amount_paise in (10000,50000,100000)),
 test_mode boolean not null default false,
 payment_id text unique,
 created_at timestamptz not null default now(),
 paid_at timestamptz
);
create index if not exists cs_checkout_user on public.convertshorts_checkout_orders(user_id);
alter table public.convertshorts_checkout_orders enable row level security;
revoke all on public.convertshorts_checkout_orders from public,anon,authenticated;
grant all on public.convertshorts_checkout_orders to service_role;
create or replace function public.convertshorts_apply_razorpay_payment(o text,p text) returns boolean language plpgsql security definer set search_path='' as $$
declare payment_order public.convertshorts_checkout_orders;
begin
 if coalesce((select auth.role()),'')<>'service_role' then raise exception 'Server access required' using errcode='42501';end if;
 select * into payment_order from public.convertshorts_checkout_orders where id=o for update;
 if not found or payment_order.test_mode then raise exception 'Invalid live payment order';end if;
 if p !~ '^pay_[a-zA-Z0-9]+$' then raise exception 'Invalid payment reference';end if;
 if payment_order.payment_id is not null then
  if payment_order.payment_id<>p then raise exception 'Order already paid with another payment';end if;
  return false;
 end if;
 perform public.convertshorts_apply_billing_event('razorpay:'||p,payment_order.user_id,null,'Prepaid',null,payment_order.amount_paise,'pack',now(),1);
 update public.convertshorts_checkout_orders set payment_id=p,paid_at=now() where id=o;
 return true;
end $$;
revoke all on function public.convertshorts_apply_razorpay_payment(text,text) from public,anon,authenticated;
grant execute on function public.convertshorts_apply_razorpay_payment(text,text) to service_role;
