-- ==============================================================================
-- DukanKhata Database Migration: 004 - Rollback and Recovery Plan
-- Description: Reversible procedures and scripts to roll back normalized tables
--              or export normalized records back into shop_data JSON format.
-- ==============================================================================

-- ==============================================================================
-- SECTION A: RE-SYNC NORMALIZED DATA BACK INTO shop_data (EMERGENCY ROLLBACK)
-- If you need to switch back to the original index.html app without losing
-- any new suppliers, bills, or payments created in the new app:
-- ==============================================================================

create or replace function public.rollback_sync_to_shop_data(p_shop_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_shop_name text;
  v_suppliers jsonb;
  v_salesmen jsonb;
  v_bills jsonb;
begin
  -- Get user_id of shop owner
  select sm.user_id, s.name into v_user_id, v_shop_name
  from public.shop_members sm
  join public.shops s on s.id = sm.shop_id
  where sm.shop_id = p_shop_id and sm.role = 'owner'
  limit 1;

  if v_user_id is null then
    raise exception 'Shop owner user_id not found for shop %', p_shop_id;
  end if;

  -- 1. Build suppliers json
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', coalesce(legacy_id, 's_' || extract(epoch from created_at)::bigint::text),
    'name', name
  )), '[]'::jsonb)
  into v_suppliers
  from public.suppliers
  where shop_id = p_shop_id;

  -- 2. Build salesmen list
  select coalesce(jsonb_agg(name), '[]'::jsonb)
  into v_salesmen
  from public.salesmen
  where shop_id = p_shop_id;

  -- 3. Build bills and payments json
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', coalesce(b.legacy_id, 'b_' || extract(epoch from b.created_at)::bigint::text),
    'supplierId', coalesce(s.legacy_id, 's_' || extract(epoch from s.created_at)::bigint::text),
    'amount', b.amount,
    'date', to_char(b.bill_date, 'YYYY-MM-DD'),
    'status', b.status,
    'createdBy', b.salesman_name,
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'amount', p.amount,
        'date', to_char(p.payment_date, 'YYYY-MM-DD')
      ))
      from public.payments p
      where p.bill_id = b.id
    ), '[]'::jsonb)
  )), '[]'::jsonb)
  into v_bills
  from public.bills b
  join public.suppliers s on s.id = b.supplier_id
  where b.shop_id = p_shop_id;

  -- 4. Update or insert into legacy shop_data table
  insert into public.shop_data (user_id, shop_name, suppliers, bills, salesmen, updated_at)
  values (v_user_id, v_shop_name, v_suppliers, v_bills, v_salesmen, now())
  on conflict (user_id) do update set
    shop_name = excluded.shop_name,
    suppliers = excluded.suppliers,
    bills = excluded.bills,
    salesmen = excluded.salesmen,
    updated_at = excluded.updated_at;

  raise notice 'Successfully synced shop data back to shop_data for user %', v_user_id;
end;
$$;

grant execute on function public.rollback_sync_to_shop_data(uuid) to authenticated;

-- ==============================================================================
-- SECTION B: DESTRUCTIVE CLEANUP (OPTIONAL - ONLY IF COMPLETE REMOVAL IS REQUIRED)
-- WARNING: Running this drops the normalized tables. Only run if explicitly approved.
-- ==============================================================================
/*
drop trigger if exists trg_sync_bill_status on public.payments;
drop function if exists public.sync_bill_status();
drop function if exists public.create_shop_backup(uuid);
drop function if exists public.preview_shop_restore(uuid, jsonb);
drop function if exists public.restore_shop_backup(uuid, jsonb);
drop function if exists public.get_auth_user_shop_ids();
drop function if exists public.is_shop_owner_or_admin(uuid);

drop table if exists public.shop_backups cascade;
drop table if exists public.payments cascade;
drop table if exists public.bills cascade;
drop table if exists public.salesmen cascade;
drop table if exists public.suppliers cascade;
drop table if exists public.shop_members cascade;
drop table if exists public.shops cascade;
*/
