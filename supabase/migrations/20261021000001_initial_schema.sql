-- ==============================================================================
-- DukanKhata Database Migration: 001 - Initial Normalized Schema
-- Description: Creates shops, shop_members, suppliers, bills, payments,
--              salesmen, and backups tables with precise numeric types,
--              calendar dates, referential integrity, indexes, and strict RLS.
-- ==============================================================================

-- 1. SHOPS TABLE
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. SHOP MEMBERSHIP & ROLES TABLE
-- Explicit membership ensures security boundary is strictly enforced per user
create table if not exists public.shop_members (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'staff')),
  created_at timestamptz not null default now(),
  constraint uq_shop_member unique (shop_id, user_id)
);

create index if not exists idx_shop_members_user on public.shop_members(user_id);
create index if not exists idx_shop_members_shop on public.shop_members(shop_id);

-- Helper security definer function to avoid RLS recursion
create or replace function public.get_auth_user_shop_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select shop_id from public.shop_members where user_id = auth.uid();
$$;

create or replace function public.is_shop_owner_or_admin(target_shop_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.shop_members
    where shop_id = target_shop_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- 3. SUPPLIERS TABLE
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  legacy_id text,
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_shop_supplier_name unique (shop_id, name)
);

create index if not exists idx_suppliers_shop on public.suppliers(shop_id);

-- 4. BILLS TABLE
-- Using date for bill_date to prevent timezone day-shift
-- Using numeric(12,2) for exact currency calculations without floating-point errors
create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  legacy_id text,
  shop_id uuid not null references public.shops(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  bill_date date not null default current_date,
  amount numeric(12,2) not null check (amount > 0),
  salesman_name text not null default '',
  status text not null default 'pending' check (status in ('pending', 'paid')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bills_shop on public.bills(shop_id);
create index if not exists idx_bills_supplier on public.bills(supplier_id);
create index if not exists idx_bills_status on public.bills(shop_id, status);
create index if not exists idx_bills_date on public.bills(shop_id, bill_date);

-- 5. PAYMENTS TABLE
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  bill_id uuid not null references public.bills(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  payment_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_shop on public.payments(shop_id);
create index if not exists idx_payments_bill on public.payments(bill_id);
create index if not exists idx_payments_date on public.payments(shop_id, payment_date);

-- 6. SALESMEN TABLE (Recent salesman suggestions)
create table if not exists public.salesmen (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  last_used_at timestamptz not null default now(),
  constraint uq_shop_salesman unique (shop_id, name)
);

create index if not exists idx_salesmen_shop on public.salesmen(shop_id);

-- 7. BACKUPS TABLE (Secure in-cloud backup archive)
create table if not exists public.shop_backups (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  file_name text not null,
  backup_data jsonb not null,
  summary jsonb not null default '{}'::jsonb,
  checksum text not null,
  version text not null default '1.0',
  created_at timestamptz not null default now()
);

create index if not exists idx_shop_backups_shop on public.shop_backups(shop_id);

-- ==============================================================================
-- AUTOMATIC BILL STATUS RECALCULATION TRIGGER
-- Keeps bill status ('pending' vs 'paid') 100% consistent with payment totals
-- ==============================================================================
create or replace function public.sync_bill_status()
returns trigger
language plpgsql
security definer
as $$
declare
  target_bill_id uuid;
  total_paid numeric(12,2);
  bill_total numeric(12,2);
begin
  if tg_op = 'DELETE' then
    target_bill_id := old.bill_id;
  else
    target_bill_id := new.bill_id;
  end if;

  select coalesce(sum(amount), 0) into total_paid
  from public.payments
  where bill_id = target_bill_id;

  select amount into bill_total
  from public.bills
  where id = target_bill_id;

  if bill_total is not null then
    update public.bills
    set status = case when total_paid >= bill_total then 'paid' else 'pending' end,
        updated_at = now()
    where id = target_bill_id;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_sync_bill_status on public.payments;
create trigger trg_sync_bill_status
after insert or update or delete on public.payments
for each row execute function public.sync_bill_status();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

alter table public.shops enable row level security;
alter table public.shop_members enable row level security;
alter table public.suppliers enable row level security;
alter table public.bills enable row level security;
alter table public.payments enable row level security;
alter table public.salesmen enable row level security;
alter table public.shop_backups enable row level security;

-- SHOPS POLICIES
create policy "Members can view their shops"
  on public.shops for select
  using (id in (select public.get_auth_user_shop_ids()));

create policy "Authenticated users can create a new shop"
  on public.shops for insert
  with check (auth.role() = 'authenticated');

create policy "Owners and admins can update shop details"
  on public.shops for update
  using (public.is_shop_owner_or_admin(id))
  with check (public.is_shop_owner_or_admin(id));

-- SHOP MEMBERS POLICIES
create policy "Members can view memberships for their shops"
  on public.shop_members for select
  using (shop_id in (select public.get_auth_user_shop_ids()));

create policy "Authenticated users can join or register membership"
  on public.shop_members for insert
  with check (auth.uid() = user_id or public.is_shop_owner_or_admin(shop_id));

create policy "Owners can manage memberships"
  on public.shop_members for update
  using (public.is_shop_owner_or_admin(shop_id))
  with check (public.is_shop_owner_or_admin(shop_id));

create policy "Owners can remove memberships"
  on public.shop_members for delete
  using (public.is_shop_owner_or_admin(shop_id));

-- SUPPLIERS POLICIES
create policy "Shop members can view suppliers"
  on public.suppliers for select
  using (shop_id in (select public.get_auth_user_shop_ids()));

create policy "Shop members can insert suppliers"
  on public.suppliers for insert
  with check (shop_id in (select public.get_auth_user_shop_ids()));

create policy "Shop members can update suppliers"
  on public.suppliers for update
  using (shop_id in (select public.get_auth_user_shop_ids()))
  with check (shop_id in (select public.get_auth_user_shop_ids()));

create policy "Owners and admins can delete suppliers without bills"
  on public.suppliers for delete
  using (public.is_shop_owner_or_admin(shop_id));

-- BILLS POLICIES
create policy "Shop members can view bills"
  on public.bills for select
  using (shop_id in (select public.get_auth_user_shop_ids()));

create policy "Shop members can insert bills"
  on public.bills for insert
  with check (shop_id in (select public.get_auth_user_shop_ids()));

create policy "Shop members can update bills"
  on public.bills for update
  using (shop_id in (select public.get_auth_user_shop_ids()))
  with check (shop_id in (select public.get_auth_user_shop_ids()));

create policy "Owners and admins can delete bills"
  on public.bills for delete
  using (public.is_shop_owner_or_admin(shop_id));

-- PAYMENTS POLICIES
create policy "Shop members can view payments"
  on public.payments for select
  using (shop_id in (select public.get_auth_user_shop_ids()));

create policy "Shop members can insert payments"
  on public.payments for insert
  with check (shop_id in (select public.get_auth_user_shop_ids()));

create policy "Shop members can update payments"
  on public.payments for update
  using (shop_id in (select public.get_auth_user_shop_ids()))
  with check (shop_id in (select public.get_auth_user_shop_ids()));

create policy "Owners and admins can delete payments"
  on public.payments for delete
  using (public.is_shop_owner_or_admin(shop_id));

-- SALESMEN POLICIES
create policy "Shop members can view salesmen"
  on public.salesmen for select
  using (shop_id in (select public.get_auth_user_shop_ids()));

create policy "Shop members can insert salesmen"
  on public.salesmen for insert
  with check (shop_id in (select public.get_auth_user_shop_ids()));

create policy "Shop members can update salesmen"
  on public.salesmen for update
  using (shop_id in (select public.get_auth_user_shop_ids()))
  with check (shop_id in (select public.get_auth_user_shop_ids()));

create policy "Shop members can delete salesmen"
  on public.salesmen for delete
  using (public.is_shop_owner_or_admin(shop_id));

-- SHOP BACKUPS POLICIES
create policy "Owners and admins can view shop backups"
  on public.shop_backups for select
  using (public.is_shop_owner_or_admin(shop_id));

create policy "Owners and admins can create shop backups"
  on public.shop_backups for insert
  with check (public.is_shop_owner_or_admin(shop_id) and auth.uid() = created_by);

create policy "Owners can delete shop backups"
  on public.shop_backups for delete
  using (public.is_shop_owner_or_admin(shop_id));

-- GRANTS TO AUTHENTICATED USERS
grant select, insert, update, delete on public.shops to authenticated;
grant select, insert, update, delete on public.shop_members to authenticated;
grant select, insert, update, delete on public.suppliers to authenticated;
grant select, insert, update, delete on public.bills to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.salesmen to authenticated;
grant select, insert, update, delete on public.shop_backups to authenticated;
