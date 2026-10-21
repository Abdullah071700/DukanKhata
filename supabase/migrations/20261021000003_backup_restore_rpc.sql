-- ==============================================================================
-- DukanKhata Database Migration: 003 - Cloud Backup & Guarded Restore RPC
-- Description: Server-side stored procedures for atomic cloud backup creation,
--              validation, preview, and guarded restore with pre-restore safety snapshots.
-- ==============================================================================

-- 1. FUNCTION: create_shop_backup
create or replace function public.create_shop_backup(p_shop_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_shop_name text;
  v_suppliers jsonb;
  v_bills jsonb;
  v_payments jsonb;
  v_salesmen jsonb;
  v_summary jsonb;
  v_backup_payload jsonb;
  v_checksum text;
  v_file_name text;
  v_backup_id uuid;
begin
  -- Validate caller authorization
  select role into v_role
  from public.shop_members
  where shop_id = p_shop_id and user_id = v_user_id;

  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'Unauthorized: Only shop owners or admins can generate cloud backups.';
  end if;

  select name into v_shop_name from public.shops where id = p_shop_id;

  -- 1. Gather all suppliers
  select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
  into v_suppliers
  from (
    select id, legacy_id, name, phone, created_at
    from public.suppliers
    where shop_id = p_shop_id
    order by name asc
  ) s;

  -- 2. Gather all bills
  select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb)
  into v_bills
  from (
    select id, legacy_id, supplier_id, bill_date, amount, salesman_name, status, notes, created_at
    from public.bills
    where shop_id = p_shop_id
    order by bill_date asc, created_at asc
  ) b;

  -- 3. Gather all payments
  select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb)
  into v_payments
  from (
    select id, bill_id, amount, payment_date, notes, created_at
    from public.payments
    where shop_id = p_shop_id
    order by payment_date asc, created_at asc
  ) p;

  -- 4. Gather salesmen
  select coalesce(jsonb_agg(to_jsonb(sm)), '[]'::jsonb)
  into v_salesmen
  from (
    select id, name, last_used_at
    from public.salesmen
    where shop_id = p_shop_id
    order by last_used_at desc
  ) sm;

  -- 5. Calculate summary metrics
  select jsonb_build_object(
    'supplier_count', jsonb_array_length(v_suppliers),
    'bill_count', jsonb_array_length(v_bills),
    'payment_count', jsonb_array_length(v_payments),
    'total_billed', coalesce((select sum(amount) from public.bills where shop_id = p_shop_id), 0),
    'total_paid', coalesce((select sum(amount) from public.payments where shop_id = p_shop_id), 0),
    'total_pending', coalesce((
      select sum(greatest(0, b.amount - coalesce(p_sum.paid, 0)))
      from public.bills b
      left join (
        select bill_id, sum(amount) as paid
        from public.payments
        where shop_id = p_shop_id
        group by bill_id
      ) p_sum on p_sum.bill_id = b.id
      where b.shop_id = p_shop_id and b.status = 'pending'
    ), 0)
  ) into v_summary;

  -- 6. Construct complete backup object
  v_backup_payload := jsonb_build_object(
    'app', 'DukanKhata',
    'version', '1.0',
    'exported_at', now(),
    'shop_id', p_shop_id,
    'shop_name', v_shop_name,
    'summary', v_summary,
    'suppliers', v_suppliers,
    'bills', v_bills,
    'payments', v_payments,
    'salesmen', v_salesmen
  );

  -- 7. Generate checksum
  v_checksum := md5(v_backup_payload::text);
  v_file_name := 'DukanKhata_Backup_' || regexp_replace(v_shop_name, '\W+', '_', 'g') || '_' || to_char(now(), 'YYYYMMDD_HH24MISS') || '.json';

  -- 8. Save backup metadata and cloud record
  insert into public.shop_backups (
    shop_id, created_by, file_name, backup_data, summary, checksum, version
  ) values (
    p_shop_id, v_user_id, v_file_name, v_backup_payload, v_summary, v_checksum, '1.0'
  )
  returning id into v_backup_id;

  return jsonb_build_object(
    'backup_id', v_backup_id,
    'file_name', v_file_name,
    'created_at', now(),
    'summary', v_summary,
    'checksum', v_checksum,
    'backup_data', v_backup_payload
  );
end;
$$;

-- 2. FUNCTION: preview_shop_restore
create or replace function public.preview_shop_restore(p_shop_id uuid, p_backup_json jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_app text;
  v_version text;
  v_suppliers_count int;
  v_bills_count int;
  v_payments_count int;
  v_backup_shop_name text;
  v_backup_date text;
begin
  select role into v_role
  from public.shop_members
  where shop_id = p_shop_id and user_id = v_user_id;

  if v_role is null or v_role <> 'owner' then
    return jsonb_build_object('is_valid', false, 'error', 'Unauthorized: Only the shop owner can preview and restore backups.');
  end if;

  v_app := p_backup_json->>'app';
  v_version := p_backup_json->>'version';

  if v_app is null or v_app <> 'DukanKhata' then
    return jsonb_build_object('is_valid', false, 'error', 'Invalid backup file: Not a recognized DukanKhata backup.');
  end if;

  v_backup_shop_name := coalesce(p_backup_json->>'shop_name', 'Unknown Shop');
  v_backup_date := coalesce(p_backup_json->>'exported_at', '');

  v_suppliers_count := jsonb_array_length(coalesce(p_backup_json->'suppliers', '[]'::jsonb));
  v_bills_count := jsonb_array_length(coalesce(p_backup_json->'bills', '[]'::jsonb));
  v_payments_count := jsonb_array_length(coalesce(p_backup_json->'payments', '[]'::jsonb));

  return jsonb_build_object(
    'is_valid', true,
    'source_shop_name', v_backup_shop_name,
    'exported_at', v_backup_date,
    'supplier_count', v_suppliers_count,
    'bill_count', v_bills_count,
    'payment_count', v_payments_count,
    'summary', coalesce(p_backup_json->'summary', '{}'::jsonb)
  );
end;
$$;

-- 3. FUNCTION: restore_shop_backup
-- Atomically creates a pre-restore backup, cleans current records, and restores backup contents
create or replace function public.restore_shop_backup(p_shop_id uuid, p_backup_json jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_preview jsonb;
  v_pre_restore_backup jsonb;
  sup record;
  bill record;
  pay record;
  sal record;
  v_new_sup_id uuid;
  v_new_bill_id uuid;
begin
  -- 1. Check Owner Authorization
  select role into v_role
  from public.shop_members
  where shop_id = p_shop_id and user_id = v_user_id;

  if v_role is null or v_role <> 'owner' then
    raise exception 'Unauthorized: Only the shop owner can restore a backup.';
  end if;

  -- 2. Validate backup content
  v_preview := public.preview_shop_restore(p_shop_id, p_backup_json);
  if not (v_preview->>'is_valid')::boolean then
    raise exception 'Validation failed: %', v_preview->>'error';
  end if;

  -- 3. SAFETY STEP: Automatically generate pre-restore backup first!
  v_pre_restore_backup := public.create_shop_backup(p_shop_id);

  -- 4. Clean existing shop operational tables (cascading through payments, bills, suppliers)
  delete from public.payments where shop_id = p_shop_id;
  delete from public.bills where shop_id = p_shop_id;
  delete from public.suppliers where shop_id = p_shop_id;
  delete from public.salesmen where shop_id = p_shop_id;

  -- 5. Restore Suppliers
  for sup in select * from jsonb_to_recordset(p_backup_json->'suppliers') as x(
    id uuid,
    legacy_id text,
    name text,
    phone text,
    created_at timestamptz
  ) loop
    insert into public.suppliers (id, legacy_id, shop_id, name, phone, created_at)
    values (
      coalesce(sup.id, gen_random_uuid()),
      sup.legacy_id,
      p_shop_id,
      sup.name,
      sup.phone,
      coalesce(sup.created_at, now())
    );
  end loop;

  -- 6. Restore Salesmen
  for sal in select * from jsonb_to_recordset(p_backup_json->'salesmen') as x(
    name text,
    last_used_at timestamptz
  ) loop
    insert into public.salesmen (shop_id, name, last_used_at)
    values (p_shop_id, sal.name, coalesce(sal.last_used_at, now()))
    on conflict (shop_id, name) do nothing;
  end loop;

  -- 7. Restore Bills
  for bill in select * from jsonb_to_recordset(p_backup_json->'bills') as x(
    id uuid,
    legacy_id text,
    supplier_id uuid,
    bill_date date,
    amount numeric,
    salesman_name text,
    status text,
    notes text,
    created_at timestamptz
  ) loop
    insert into public.bills (
      id, legacy_id, shop_id, supplier_id, bill_date, amount, salesman_name, status, notes, created_at
    ) values (
      coalesce(bill.id, gen_random_uuid()),
      bill.legacy_id,
      p_shop_id,
      bill.supplier_id,
      bill.bill_date,
      bill.amount,
      coalesce(bill.salesman_name, ''),
      coalesce(bill.status, 'pending'),
      bill.notes,
      coalesce(bill.created_at, now())
    );
  end loop;

  -- 8. Restore Payments
  for pay in select * from jsonb_to_recordset(p_backup_json->'payments') as x(
    id uuid,
    bill_id uuid,
    amount numeric,
    payment_date date,
    notes text,
    created_at timestamptz
  ) loop
    insert into public.payments (
      id, shop_id, bill_id, amount, payment_date, notes, created_at
    ) values (
      coalesce(pay.id, gen_random_uuid()),
      p_shop_id,
      pay.bill_id,
      pay.amount,
      pay.payment_date,
      pay.notes,
      coalesce(pay.created_at, now())
    );
  end loop;

  return jsonb_build_object(
    'success', true,
    'message', 'Shop records successfully restored from backup.',
    'pre_restore_backup_id', v_pre_restore_backup->>'backup_id',
    'restored_summary', v_preview
  );
end;
$$;

-- Grant execute permissions to authenticated users (functions enforce their own RLS & role checks)
grant execute on function public.create_shop_backup(uuid) to authenticated;
grant execute on function public.preview_shop_restore(uuid, jsonb) to authenticated;
grant execute on function public.restore_shop_backup(uuid, jsonb) to authenticated;
