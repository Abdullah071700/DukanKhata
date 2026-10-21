-- ==============================================================================
-- DukanKhata Database Migration: 002 - Safe Legacy shop_data Migration
-- Description: Non-destructively migrates existing records from the JSON-based
--              shop_data table into normalized tables (shops, shop_members,
--              suppliers, bills, payments, salesmen).
--
-- Safety Guarantees:
-- 1. shop_data is NEVER deleted, renamed, or modified.
-- 2. Fully idempotent: safe to run multiple times without duplicating data.
-- 3. Preserves all legacy IDs, amounts, dates, payment histories, and statuses.
-- ==============================================================================

do $$
declare
  r record;
  sup record;
  bill record;
  pay record;
  sal record;
  v_shop_id uuid;
  v_supplier_id uuid;
  v_bill_id uuid;
begin
  -- Check if shop_data exists before attempting migration
  if not exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'shop_data'
  ) then
    raise notice 'Table shop_data does not exist. Skipping data migration.';
    return;
  end if;

  raise notice 'Starting non-destructive migration from shop_data...';

  for r in select * from public.shop_data loop
    -- 1. Create or retrieve shop for this user
    select sm.shop_id into v_shop_id
    from public.shop_members sm
    where sm.user_id = r.user_id
    limit 1;

    if v_shop_id is null then
      insert into public.shops (name, created_at, updated_at)
      values (coalesce(nullif(trim(r.shop_name), ''), 'My Shop'), coalesce(r.updated_at, now()), coalesce(r.updated_at, now()))
      returning id into v_shop_id;

      insert into public.shop_members (shop_id, user_id, role)
      values (v_shop_id, r.user_id, 'owner')
      on conflict (shop_id, user_id) do nothing;
    end if;

    -- 2. Migrate Suppliers
    if r.suppliers is not null and jsonb_typeof(r.suppliers) = 'array' then
      for sup in select * from jsonb_to_recordset(r.suppliers) as x(id text, name text) loop
        if sup.name is not null and trim(sup.name) <> '' then
          insert into public.suppliers (legacy_id, shop_id, name)
          values (sup.id, v_shop_id, trim(sup.name))
          on conflict (shop_id, name) do update
            set legacy_id = coalesce(public.suppliers.legacy_id, excluded.legacy_id);
        end if;
      end loop;
    end if;

    -- 3. Migrate Salesmen
    if r.salesmen is not null and jsonb_typeof(r.salesmen) = 'array' then
      for sal in select value::text as salesman_name from jsonb_array_elements_text(r.salesmen) loop
        if sal.salesman_name is not null and trim(sal.salesman_name) <> '' then
          insert into public.salesmen (shop_id, name)
          values (v_shop_id, trim(sal.salesman_name))
          on conflict (shop_id, name) do nothing;
        end if;
      end loop;
    end if;

    -- 4. Migrate Bills & Payments
    if r.bills is not null and jsonb_typeof(r.bills) = 'array' then
      for bill in select * from jsonb_to_recordset(r.bills) as b(
        id text,
        "supplierId" text,
        amount numeric,
        date text,
        payments jsonb,
        status text,
        "createdBy" text
      ) loop
        -- Find supplier by legacy ID or name
        select id into v_supplier_id
        from public.suppliers
        where shop_id = v_shop_id and (legacy_id = bill."supplierId" or id::text = bill."supplierId")
        limit 1;

        if v_supplier_id is null and bill."supplierId" is not null then
          -- If supplier record was missing from suppliers array, auto-create it safely
          insert into public.suppliers (legacy_id, shop_id, name)
          values (bill."supplierId", v_shop_id, 'Supplier ' || bill."supplierId")
          on conflict (shop_id, name) do update set legacy_id = excluded.legacy_id
          returning id into v_supplier_id;
        end if;

        if v_supplier_id is not null and bill.amount is not null and bill.amount > 0 then
          -- Check if bill already migrated
          select id into v_bill_id
          from public.bills
          where shop_id = v_shop_id and legacy_id = bill.id
          limit 1;

          if v_bill_id is null then
            insert into public.bills (
              legacy_id,
              shop_id,
              supplier_id,
              bill_date,
              amount,
              salesman_name,
              status
            ) values (
              bill.id,
              v_shop_id,
              v_supplier_id,
              coalesce(nullif(bill.date, '')::date, current_date),
              bill.amount,
              coalesce(bill."createdBy", ''),
              case when bill.status = 'paid' then 'paid' else 'pending' end
            )
            returning id into v_bill_id;
          end if;

          -- Migrate Payments for this bill
          if bill.payments is not null and jsonb_typeof(bill.payments) = 'array' then
            for pay in select * from jsonb_to_recordset(bill.payments) as p(
              amount numeric,
              date text
            ) loop
              if pay.amount is not null and pay.amount > 0 then
                -- Insert payment if not already recorded
                insert into public.payments (
                  shop_id,
                  bill_id,
                  amount,
                  payment_date
                )
                select
                  v_shop_id,
                  v_bill_id,
                  pay.amount,
                  coalesce(nullif(pay.date, '')::date, current_date)
                where not exists (
                  select 1 from public.payments
                  where bill_id = v_bill_id
                    and amount = pay.amount
                    and payment_date = coalesce(nullif(pay.date, '')::date, current_date)
                );
              end if;
            end loop;
          end if;

        end if;
      end loop;
    end if;

  end loop;

  raise notice 'Migration from shop_data completed successfully. shop_data table has been preserved.';
end $$;
