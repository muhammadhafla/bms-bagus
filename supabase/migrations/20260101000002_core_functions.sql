-- CORE FUNCTIONS

-- POS Functions

-- ============================================

CREATE SCHEMA IF NOT EXISTS rpc;

-- 4.1 rpc.create_penjualan(p_user UUID, p_id UUID DEFAULT NULL) → UUID
CREATE OR REPLACE FUNCTION rpc.create_penjualan(
  p_user UUID,
  p_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
BEGIN
  v_id := COALESCE(p_id, gen_random_uuid());

  INSERT INTO public.penjualan (
    id,
    status,
    tanggal,
    total,
    created_by
  )
  VALUES (
    v_id,
    'draft',
    CURRENT_DATE,
    0,
    p_user
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 4.2 rpc.add_penjualan_items(p_penjualan_id UUID, p_items JSONB) → VOID
CREATE OR REPLACE FUNCTION rpc.add_penjualan_items(
  p_penjualan_id UUID,
  p_items JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_item JSONB;
  v_inventory_id UUID;
  v_nama_barang TEXT;
  v_qty INT;
  v_harga_jual NUMERIC;
  v_diskon NUMERIC;
  v_harga_final NUMERIC;
  v_cost_at_sale NUMERIC;
  v_current_stok INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.penjualan
    WHERE id = p_penjualan_id AND status = 'draft'
  ) THEN
    RAISE EXCEPTION 'Penjualan not found or not in draft status';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_inventory_id := (v_item->>'inventory_id')::UUID;
    v_nama_barang  := v_item->>'nama_barang';
    v_qty          := (v_item->>'qty')::INT;
    v_harga_jual   := (v_item->>'harga_jual')::NUMERIC;
    v_diskon       := COALESCE((v_item->>'diskon')::NUMERIC, 0);
    v_harga_final  := (v_item->>'harga_final')::NUMERIC;
    v_cost_at_sale := COALESCE((v_item->>'cost_at_sale')::NUMERIC, 0);

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'qty harus > 0. inventory_id=%', v_inventory_id;
    END IF;

    IF v_harga_final IS NULL OR v_harga_final < 0 THEN
      RAISE EXCEPTION 'harga_final tidak valid. inventory_id=%', v_inventory_id;
    END IF;

    SELECT stok INTO v_current_stok
    FROM public.inventory
    WHERE id = v_inventory_id;

    IF v_current_stok IS NULL THEN
      RAISE EXCEPTION 'Inventory not found: %', v_inventory_id;
    END IF;

    IF v_current_stok < v_qty THEN
      RAISE EXCEPTION 'Stok tidak cukup. Tersedia: %', v_current_stok;
    END IF;

    INSERT INTO public.penjualan_items (
      id,
      penjualan_id,
      inventory_id,
      nama_barang,
      qty,
      harga_jual,
      diskon,
      harga_final,
      cost_at_sale
    )
    VALUES (
      gen_random_uuid(),
      p_penjualan_id,
      v_inventory_id,
      v_nama_barang,
      v_qty,
      v_harga_jual,
      v_diskon,
      v_harga_final,
      v_cost_at_sale
    );
  END LOOP;

  UPDATE public.penjualan p
  SET total = COALESCE((
    SELECT SUM(qty * harga_final)
    FROM public.penjualan_items
    WHERE penjualan_id = p_penjualan_id
  ), 0)
  WHERE p.id = p_penjualan_id;

END;
$$;

-- 4.3 rpc.finalize_penjualan(...) → UUID
CREATE OR REPLACE FUNCTION rpc.finalize_penjualan(
  p_penjualan_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_item RECORD;
  v_total NUMERIC;
BEGIN
  -- validate draft
  IF NOT EXISTS (
    SELECT 1 FROM public.penjualan
    WHERE id = p_penjualan_id AND status = 'draft'
  ) THEN
    RAISE EXCEPTION 'Penjualan tidak ditemukan / bukan draft';
  END IF;

  -- compute total from items (lebih aman)
  SELECT COALESCE(SUM(qty * harga_final), 0)
  INTO v_total
  FROM public.penjualan_items
  WHERE penjualan_id = p_penjualan_id;

  -- validate stock
  FOR v_item IN
    SELECT pi.inventory_id, pi.qty, i.stok
    FROM public.penjualan_items pi
    JOIN public.inventory i ON i.id = pi.inventory_id
    WHERE pi.penjualan_id = p_penjualan_id
  LOOP
    IF v_item.stok < v_item.qty THEN
      RAISE EXCEPTION 'Stok tidak cukup untuk inventory_id=%. Tersedia: %', v_item.inventory_id, v_item.stok;
    END IF;
  END LOOP;

  -- reduce stock + stock movements
  FOR v_item IN
    SELECT inventory_id, qty
    FROM public.penjualan_items
    WHERE penjualan_id = p_penjualan_id
  LOOP
    UPDATE public.inventory
    SET stok = stok - v_item.qty,
        updated_at = NOW()
    WHERE id = v_item.inventory_id;

    INSERT INTO public.stock_movements (
      id,
      inventory_id,
      tipe,
      qty,
      referensi,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      v_item.inventory_id,
      'OUT',
      v_item.qty,
      p_penjualan_id::text,
      NOW()
    );
  END LOOP;

  -- update header
  UPDATE public.penjualan
  SET status = 'paid',
      total = v_total,
      paid_at = NOW()
  WHERE id = p_penjualan_id;

  -- kas_log (tipe 'JUAL' pakai v_total)
  INSERT INTO public.kas_log (id, tipe, jumlah, payment_method, referensi_id, catatan, created_at)
  VALUES (
    gen_random_uuid(),
    'JUAL',
    v_total,
    'CASH', -- Default to CASH since this is legacy
    p_penjualan_id,
    NULL,
    NOW()
  );

  RETURN p_penjualan_id;
END;
$$;

-- 4.4 rpc.create_penjualan_return(...) → UUID
CREATE OR REPLACE FUNCTION rpc.create_penjualan_return(
  p_penjualan_id UUID,
  p_tanggal DATE,
  p_note TEXT,
  p_created_by UUID,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_return_id UUID;
  v_item JSONB;
  v_penjualan_item_id UUID;
  v_inventory_id UUID;
  v_qty INT;
  v_harga_jual NUMERIC;
  v_diskon NUMERIC;
  v_harga_final NUMERIC;
  v_cost_at_sale NUMERIC;
  v_original_qty INT;
  v_return_qty INT;
BEGIN
  -- original penjualan must be paid
  IF NOT EXISTS (
    SELECT 1 FROM public.penjualan
    WHERE id = p_penjualan_id AND status = 'paid'
  ) THEN
    RAISE EXCEPTION 'Penjualan not found or not paid';
  END IF;

  INSERT INTO public.penjualan_return (
    id,
    penjualan_id,
    tanggal,
    note,
    created_by
  )
  VALUES (
    gen_random_uuid(),
    p_penjualan_id,
    p_tanggal,
    p_note,
    p_created_by
  )
  RETURNING id INTO v_return_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_penjualan_item_id := (v_item->>'penjualan_item_id')::UUID;
    v_qty := (v_item->>'qty')::INT;
    v_harga_jual := (v_item->>'harga_jual')::NUMERIC;
    v_diskon := COALESCE((v_item->>'diskon')::NUMERIC, 0);

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'qty return harus > 0. penjualan_item_id=%', v_penjualan_item_id;
    END IF;

    v_harga_final := NULLIF((v_item->>'harga_final')::TEXT, '')::NUMERIC;
    IF v_harga_final IS NULL THEN
      RAISE EXCEPTION 'harga_final wajib dikirim untuk penjualan_item_id=%', v_penjualan_item_id;
    END IF;

    v_cost_at_sale := COALESCE((v_item->>'cost_at_sale')::NUMERIC, 0);

    -- ambil inventory_id dan qty dari penjualan_items
    SELECT inventory_id, qty INTO v_inventory_id, v_original_qty
    FROM public.penjualan_items
    WHERE id = v_penjualan_item_id;

    SELECT COALESCE(SUM(pri.qty), 0) INTO v_return_qty
    FROM public.penjualan_return pr
    JOIN public.penjualan_return_items pri
      ON pri.penjualan_return_id = pr.id
    WHERE pr.penjualan_id = p_penjualan_id
      AND pri.penjualan_item_id = v_penjualan_item_id;

    IF v_original_qty IS NULL THEN
      RAISE EXCEPTION 'Item tidak ada di transaksi original';
    END IF;

    IF v_qty > (v_original_qty - v_return_qty) THEN
      RAISE EXCEPTION 'Qty return melebihi yang bisa dikembalikan. Maks: %', v_original_qty - v_return_qty;
    END IF;

    -- Insert return item (ambil data nama_barang & inventory_id dari penjualan_items agar konsisten)
    INSERT INTO public.penjualan_return_items (
      id,
      penjualan_return_id,
      penjualan_item_id,
      inventory_id,
      nama_barang,
      qty,
      harga_jual,
      diskon,
      harga_final,
      cost_at_sale
    )
    SELECT
      gen_random_uuid(),
      v_return_id,
      v_penjualan_item_id,
      pi.inventory_id,
      pi.nama_barang,
      v_qty,
      v_harga_jual,
      v_diskon,
      v_harga_final,
      v_cost_at_sale
    FROM public.penjualan_items pi
    WHERE pi.id = v_penjualan_item_id;

    -- restore stock
    UPDATE public.inventory
    SET stok = stok + v_qty,
        updated_at = NOW()
    WHERE id = v_inventory_id;

    -- stock movement IN (pakai qty & referensi)
    INSERT INTO public.stock_movements (
      id,
      inventory_id,
      tipe,
      qty,
      referensi,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      v_inventory_id,
      'IN',
      v_qty,
      v_return_id::text,
      NOW()
    );
  END LOOP;

  -- kas log
  INSERT INTO public.kas_log (id, tipe, jumlah, referensi_id, catatan, created_by, created_at)
  VALUES (
    gen_random_uuid(),
    'RETURN',
    (SELECT COALESCE(SUM(qty * harga_final), 0)
     FROM public.penjualan_return_items
     WHERE penjualan_return_id = v_return_id),
    v_return_id,
    p_note,
    p_created_by,
    NOW()
  );

  RETURN v_return_id;
END;
$$;

-- 4.5 rpc.add_kas_log(...) → UUID
CREATE OR REPLACE FUNCTION rpc.add_kas_log(
    p_tipe TEXT,
    p_jumlah NUMERIC,
    p_catatan TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_id UUID;
BEGIN
    IF p_tipe NOT IN ('SETOR', 'TARIK', 'BUKA_LACI') THEN
        RAISE EXCEPTION 'Invalid tipe: %', p_tipe;
    END IF;
    
    INSERT INTO kas_log (id, tipe, jumlah, catatan, created_by)
    VALUES (gen_random_uuid(), p_tipe, p_jumlah, p_catatan, p_created_by)
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION rpc.pay_penjualan(
  p_penjualan_id uuid,
  p_payment_method text,
  p_cash_amount numeric,
  p_qris_amount numeric,
  p_diskon_nominal numeric DEFAULT NULL::numeric,
  p_diskon_persen numeric DEFAULT NULL::numeric,
  p_kembalian numeric DEFAULT NULL::numeric,
  p_catatan text DEFAULT NULL::text,
  p_created_by uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
  v_subtotal NUMERIC := 0;
  v_diskon_nominal NUMERIC := 0;
  v_diskon_persen NUMERIC := 0;
  v_total NUMERIC := 0;
  v_pay_total NUMERIC := 0;
  v_calc_kembalian NUMERIC := 0;
  v_net_cash NUMERIC := 0;
  v_item RECORD;
BEGIN
  -- validate penjualan exists
  SELECT status INTO v_status
  FROM public.penjualan
  WHERE id = p_penjualan_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Penjualan tidak ditemukan: %', p_penjualan_id;
  END IF;

  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'Penjualan harus status draft. Saat ini: %', v_status;
  END IF;

  -- compute subtotal from items (harga_final sudah memperhitungkan diskon per item)
  SELECT COALESCE(SUM(qty * harga_final), 0)
  INTO v_subtotal
  FROM public.penjualan_items
  WHERE penjualan_id = p_penjualan_id;

  -- normalize diskon inputs
  v_diskon_nominal := COALESCE(p_diskon_nominal, 0);
  v_diskon_persen := COALESCE(p_diskon_persen, 0);

  IF v_diskon_nominal < 0 THEN
    RAISE EXCEPTION 'diskon_nominal tidak valid (<0)';
  END IF;

  IF v_diskon_persen < 0 THEN
    RAISE EXCEPTION 'diskon_persen tidak valid (<0)';
  END IF;

  -- If both provided and >0, prefer nominal but validate consistency when persen >0
  IF v_diskon_persen > 0 THEN
    -- compute nominal from persen
    IF v_subtotal = 0 THEN
      RAISE EXCEPTION 'subtotal = 0, tidak bisa menerapkan diskon_persen';
    END IF;

    IF p_diskon_nominal IS NULL OR p_diskon_nominal = 0 THEN
      v_diskon_nominal := ROUND(v_subtotal * v_diskon_persen / 100.0, 2);
    ELSE
      -- validate they are approximately consistent (2 decimals)
      IF ROUND(v_subtotal * v_diskon_persen / 100.0, 2) <> ROUND(v_diskon_nominal, 2) THEN
        RAISE EXCEPTION 'diskon_nominal dan diskon_persen tidak konsisten. expected_nominal=%, got=%',
          ROUND(v_subtotal * v_diskon_persen / 100.0, 2), v_diskon_nominal;
      END IF;
    END IF;
  END IF;

  IF v_diskon_nominal > v_subtotal THEN
    RAISE EXCEPTION 'diskon_nominal melebihi subtotal';
  END IF;

  v_total := v_subtotal - v_diskon_nominal;

  -- payments validation
  IF COALESCE(p_cash_amount, 0) < 0 OR COALESCE(p_qris_amount, 0) < 0 THEN
    RAISE EXCEPTION 'cash/qris tidak boleh negatif';
  END IF;

  v_pay_total := COALESCE(p_cash_amount, 0) + COALESCE(p_qris_amount, 0);

  v_calc_kembalian := COALESCE(p_cash_amount, 0) - v_total;

  -- If kembalian is provided, validate; otherwise set it.
  IF p_kembalian IS NULL THEN
    v_calc_kembalian := GREATEST(v_calc_kembalian, 0);
  ELSE
    IF p_kembalian < 0 THEN
      RAISE EXCEPTION 'kembalian tidak boleh negatif';
    END IF;
    IF GREATEST(v_calc_kembalian, 0) <> p_kembalian THEN
      RAISE EXCEPTION 'kembalian tidak konsisten. expected=%, got=%', GREATEST(v_calc_kembalian, 0), p_kembalian;
    END IF;
    v_calc_kembalian := p_kembalian;
  END IF;

  -- Ensure payment covers total
  IF v_pay_total < v_total THEN
    RAISE EXCEPTION 'Pembayaran kurang dari total. pay_total=%, total=%', v_pay_total, v_total;
  END IF;

  -- For non-mixed methods, enforce zeros
  IF upper(p_payment_method) IN ('CASH') THEN
    IF COALESCE(p_qris_amount,0) <> 0 THEN
      RAISE EXCEPTION 'payment_method CASH tapi qris_amount <> 0';
    END IF;
  ELSIF upper(p_payment_method) IN ('QRIS') THEN
    IF COALESCE(p_cash_amount,0) <> 0 THEN
      RAISE EXCEPTION 'payment_method QRIS tapi cash_amount <> 0';
    END IF;
  END IF;

  -- 1) update header fields (diskon global + payment)
  UPDATE public.penjualan
  SET
    payment_method = p_payment_method,
    diskon_nominal = v_diskon_nominal,
    diskon_persen = v_diskon_persen,
    subtotal_sebelum_diskon = v_subtotal,
    cash_amount = COALESCE(p_cash_amount,0),
    qris_amount = COALESCE(p_qris_amount,0),
    kembalian = v_calc_kembalian,
    paid_at = NOW(),
    status = 'paid'
  WHERE id = p_penjualan_id;

  -- 2) validate stock & decrease + movements
  FOR v_item IN
    SELECT pi.inventory_id, pi.qty, i.stok
    FROM public.penjualan_items pi
    JOIN public.inventory i ON i.id = pi.inventory_id
    WHERE pi.penjualan_id = p_penjualan_id
  LOOP
    IF v_item.stok < v_item.qty THEN
      RAISE EXCEPTION 'Stok tidak cukup untuk inventory_id=%. Tersedia: %', v_item.inventory_id, v_item.stok;
    END IF;
  END LOOP;

  FOR v_item IN
    SELECT inventory_id, qty
    FROM public.penjualan_items
    WHERE penjualan_id = p_penjualan_id
  LOOP
    UPDATE public.inventory
    SET stok = stok - v_item.qty,
        updated_at = NOW()
    WHERE id = v_item.inventory_id;

    INSERT INTO public.stock_movements (
      id,
      inventory_id,
      tipe,
      qty,
      referensi,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      v_item.inventory_id,
      'OUT',
      v_item.qty,
      p_penjualan_id::text,
      NOW()
    );
  END LOOP;

  -- Calculate net cash to drawer for kas_log
  IF upper(p_payment_method) = 'QRIS' THEN
      v_net_cash := 0;
  ELSIF upper(p_payment_method) = 'CASH' THEN
      v_net_cash := v_total;
  ELSIF upper(p_payment_method) = 'CASH_QRIS' THEN
      v_net_cash := v_total - COALESCE(p_qris_amount, 0);
  ELSE
      v_net_cash := v_total;
  END IF;

  -- 3) kas_log
  INSERT INTO public.kas_log (id, tipe, jumlah, payment_method, referensi_id, catatan, created_by, created_at)
  VALUES (
    gen_random_uuid(),
    'JUAL',
    v_net_cash,
    p_payment_method,
    p_penjualan_id,
    p_catatan,
    COALESCE(p_created_by, NULL),
    NOW()
  );

  RETURN p_penjualan_id;
END;
$$;

-- ============================================

-- V2 Functions

CREATE OR REPLACE FUNCTION public.pay_transaction(
    p_idempotency_key UUID,
    p_items JSONB,
    p_payment_method TEXT,
    p_cash_amount NUMERIC DEFAULT 0,
    p_qris_amount NUMERIC DEFAULT 0,
    p_diskon_nominal NUMERIC DEFAULT 0,
    p_diskon_persen NUMERIC DEFAULT 0,
    p_catatan TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_created_at TIMESTAMP DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_penjualan_id UUID;
    v_subtotal NUMERIC := 0;
    v_total NUMERIC := 0;
    v_kembalian NUMERIC := 0;
    v_net_cash NUMERIC := 0;
    v_item JSONB;
    v_inventory RECORD;
    v_existing UUID;
BEGIN
    -- Convert Guid.Empty from C# to NULL to avoid foreign key violations
    IF p_created_by = '00000000-0000-0000-0000-000000000000'::UUID THEN
        p_created_by := NULL;
    END IF;

    IF p_created_at IS NULL THEN
        p_created_at := NOW();
    END IF;

    -- Idempotency check
    SELECT id INTO v_existing FROM public.penjualan 
    WHERE idempotency_key = p_idempotency_key AND status = 'paid';
    IF v_existing IS NOT NULL THEN
        RETURN v_existing; -- Already processed
    END IF;

    -- Create penjualan header ID
    v_penjualan_id := p_idempotency_key;
    
    -- Insert penjualan header with dummy totals first to satisfy FK constraints
    INSERT INTO public.penjualan (
        id, total, status, paid_at, tanggal, payment_method,
        diskon_nominal, diskon_persen, subtotal_sebelum_diskon,
        cash_amount, qris_amount, kembalian, created_by, 
        idempotency_key, created_at
    )
    VALUES (
        v_penjualan_id, 0, 'paid', p_created_at, p_created_at::DATE, p_payment_method,
        p_diskon_nominal, p_diskon_persen, 0,
        p_cash_amount, p_qris_amount, 0, p_created_by, 
        p_idempotency_key, p_created_at
    );

    -- Process each item: validate stock, calculate totals
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Lock and validate inventory
        SELECT * INTO v_inventory FROM public.inventory 
        WHERE id = (v_item->>'inventory_id')::UUID FOR UPDATE;
        
        IF v_inventory IS NULL THEN
            RAISE EXCEPTION 'Barang tidak ditemukan: %', (v_item->>'inventory_id')::UUID;
        END IF;

        IF v_inventory.stok < (v_item->>'qty')::INT THEN
            RAISE EXCEPTION 'Stok tidak cukup untuk % (Stok: %, Diminta: %)', 
                v_inventory.nama_barang, v_inventory.stok, (v_item->>'qty')::INT;
        END IF;
        
        -- Reduce stock
        UPDATE public.inventory 
        SET stok = stok - (v_item->>'qty')::INT,
            updated_at = NOW() 
        WHERE id = v_inventory.id;
        
        -- Insert item
        INSERT INTO public.penjualan_items (
            id, penjualan_id, inventory_id, nama_barang, qty, 
            harga_jual, diskon, harga_final, cost_at_sale
        )
        VALUES (
            gen_random_uuid(), v_penjualan_id, v_inventory.id, v_inventory.nama_barang,
            (v_item->>'qty')::INT, (v_item->>'harga_jual')::NUMERIC,
            COALESCE((v_item->>'diskon')::NUMERIC, 0),
            (v_item->>'harga_final')::NUMERIC,
            COALESCE(v_inventory.harga_beli_terakhir, 0)
        );
        
        -- Stock movement
        INSERT INTO public.stock_movements (id, inventory_id, tipe, qty, referensi, created_at)
        VALUES (gen_random_uuid(), v_inventory.id, 'OUT', (v_item->>'qty')::INT, v_penjualan_id::TEXT, p_created_at);
        
        v_subtotal := v_subtotal + ((v_item->>'harga_final')::NUMERIC * (v_item->>'qty')::INT);
    END LOOP;
    
    -- Calculate total after global discount
    v_total := v_subtotal - p_diskon_nominal;
    IF p_diskon_persen > 0 THEN
        v_total := v_total * (1 - p_diskon_persen / 100);
    END IF;
    v_total := GREATEST(v_total, 0);
    
    -- Calculate change
    v_kembalian := (p_cash_amount + p_qris_amount) - v_total;
    
    -- Validate payment
    IF (p_cash_amount + p_qris_amount) < v_total THEN
        RAISE EXCEPTION 'Pembayaran kurang: total=%, dibayar=%', 
            v_total, p_cash_amount + p_qris_amount;
    END IF;
    
    -- Update penjualan header with actual totals
    UPDATE public.penjualan
    SET 
        total = v_total,
        subtotal_sebelum_diskon = v_subtotal,
        kembalian = v_kembalian
    WHERE id = v_penjualan_id;
    
    -- Calculate net cash to drawer for kas_log
    IF upper(p_payment_method) = 'QRIS' THEN
        v_net_cash := 0;
    ELSIF upper(p_payment_method) = 'CASH' THEN
        v_net_cash := v_total;
    ELSIF upper(p_payment_method) = 'CASH_QRIS' THEN
        v_net_cash := v_total - p_qris_amount;
    ELSE
        v_net_cash := v_total;
    END IF;
    
    -- Kas log
    INSERT INTO public.kas_log (id, tipe, jumlah, payment_method, referensi_id, catatan, created_by, created_at)
    VALUES (v_penjualan_id, 'JUAL', v_net_cash, p_payment_method, v_penjualan_id, p_catatan, p_created_by, p_created_at);
    
    RETURN v_penjualan_id;
END;
$$;


-- Fix RPC
-- 4.4 public.create_penjualan_return(...) UUID
CREATE OR REPLACE FUNCTION public.create_penjualan_return(
  p_penjualan_id UUID,
  p_tanggal DATE,
  p_note TEXT,
  p_created_by UUID,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_return_id UUID;
  v_item JSONB;
  v_penjualan_item_id UUID;
  v_inventory_id UUID;
  v_qty INT;
  v_harga_jual NUMERIC;
  v_diskon NUMERIC;
  v_harga_final NUMERIC;
  v_cost_at_sale NUMERIC;
  v_original_qty INT;
  v_return_qty INT;
BEGIN
  -- original penjualan must be paid
  IF NOT EXISTS (
    SELECT 1 FROM public.penjualan
    WHERE id = p_penjualan_id AND status = 'paid'
  ) THEN
    RAISE EXCEPTION 'Penjualan not found or not paid';
  END IF;

  INSERT INTO public.penjualan_return (
    id,
    penjualan_id,
    tanggal,
    note,
    created_by
  )
  VALUES (
    gen_random_uuid(),
    p_penjualan_id,
    p_tanggal,
    p_note,
    p_created_by
  )
  RETURNING id INTO v_return_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_penjualan_item_id := (v_item->>'penjualan_item_id')::UUID;
    v_qty := (v_item->>'qty')::INT;
    v_harga_jual := (v_item->>'harga_jual')::NUMERIC;
    v_diskon := COALESCE((v_item->>'diskon')::NUMERIC, 0);

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'qty return harus > 0. penjualan_item_id=%', v_penjualan_item_id;
    END IF;

    v_harga_final := NULLIF((v_item->>'harga_final')::TEXT, '')::NUMERIC;
    IF v_harga_final IS NULL THEN
      RAISE EXCEPTION 'harga_final wajib dikirim untuk penjualan_item_id=%', v_penjualan_item_id;
    END IF;

    v_cost_at_sale := COALESCE((v_item->>'cost_at_sale')::NUMERIC, 0);

    -- ambil inventory_id dan qty dari penjualan_items
    SELECT inventory_id, qty INTO v_inventory_id, v_original_qty
    FROM public.penjualan_items
    WHERE id = v_penjualan_item_id;

    SELECT COALESCE(SUM(pri.qty), 0) INTO v_return_qty
    FROM public.penjualan_return pr
    JOIN public.penjualan_return_items pri
      ON pri.penjualan_return_id = pr.id
    WHERE pr.penjualan_id = p_penjualan_id
      AND pri.penjualan_item_id = v_penjualan_item_id;

    IF v_original_qty IS NULL THEN
      RAISE EXCEPTION 'Item tidak ada di transaksi original';
    END IF;

    IF v_qty > (v_original_qty - v_return_qty) THEN
      RAISE EXCEPTION 'Qty return melebihi yang bisa dikembalikan. Maks: %', v_original_qty - v_return_qty;
    END IF;

    -- Insert return item (ambil data nama_barang & inventory_id dari penjualan_items agar konsisten)
    INSERT INTO public.penjualan_return_items (
      id,
      penjualan_return_id,
      penjualan_item_id,
      inventory_id,
      nama_barang,
      qty,
      harga_jual,
      diskon,
      harga_final,
      cost_at_sale
    )
    SELECT
      gen_random_uuid(),
      v_return_id,
      v_penjualan_item_id,
      pi.inventory_id,
      pi.nama_barang,
      v_qty,
      v_harga_jual,
      v_diskon,
      v_harga_final,
      v_cost_at_sale
    FROM public.penjualan_items pi
    WHERE pi.id = v_penjualan_item_id;

    -- restore stock
    UPDATE public.inventory
    SET stok = stok + v_qty,
        updated_at = NOW()
    WHERE id = v_inventory_id;

    -- stock movement IN (pakai qty & referensi)
    INSERT INTO public.stock_movements (
      id,
      inventory_id,
      tipe,
      qty,
      referensi,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      v_inventory_id,
      'IN',
      v_qty,
      v_return_id::text,
      NOW()
    );
  END LOOP;

  -- kas log
  INSERT INTO public.kas_log (id, tipe, jumlah, referensi_id, catatan, created_at)
  VALUES (
    gen_random_uuid(),
    'RETURN',
    (SELECT COALESCE(SUM(qty * harga_final), 0)
     FROM public.penjualan_return_items
     WHERE penjualan_return_id = v_return_id),
    v_return_id,
    p_note,
    NOW()
  );

  RETURN v_return_id;
END;
$$;

-- Inventory Functions
-- SQL Functions: Dashboard Stats & 7-Day Trend (Server-side aggregation)
-- Mengganti logika client-side yang salah hitung profit (penjualan - pembelian)
-- Profit yang benar = revenue - cost_at_sale (HPP)

-- ============================================================
-- FUNCTION 1: get_today_profit
-- Menghitung profit hari ini berdasarkan cost_at_sale (HPP)
-- Dipanggil bersama get_dashboard_stats yang sudah ada
-- ============================================================
CREATE OR REPLACE FUNCTION get_today_profit(p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_revenue  NUMERIC := 0;
  v_today_cogs     NUMERIC := 0;
  v_today_profit   NUMERIC := 0;
  v_today_transactions INTEGER := 0;
  v_today_purchases NUMERIC := 0;
BEGIN
  -- Hitung revenue, COGS (cost_at_sale), dan jumlah transaksi penjualan hari ini
  SELECT
    COALESCE(SUM(pi.harga_final * pi.qty), 0),
    COALESCE(SUM(pi.cost_at_sale * pi.qty), 0),
    COUNT(DISTINCT pi.penjualan_id)
  INTO v_today_revenue, v_today_cogs, v_today_transactions
  FROM penjualan_items pi
  JOIN penjualan p ON p.id = pi.penjualan_id
  WHERE p.tanggal = p_date;

  v_today_profit := v_today_revenue - v_today_cogs;

  -- Total pembelian hari ini (untuk info)
  SELECT COALESCE(SUM(total_sistem), 0)
  INTO v_today_purchases
  FROM pembelian
  WHERE tanggal = p_date;

  RETURN jsonb_build_object(
    'today_sales',        v_today_revenue,
    'today_cogs',         v_today_cogs,
    'today_profit',       v_today_profit,
    'today_purchases',    v_today_purchases,
    'today_transactions', v_today_transactions
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_today_profit(DATE) TO authenticated;


-- ============================================================
-- FUNCTION 2: get_7day_trend_v2
-- Menghitung trend 7 hari dengan profit berbasis cost_at_sale
-- Mengganti logika client-side yang salah
-- ============================================================
CREATE OR REPLACE FUNCTION get_7day_trend_v2(p_start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '6 days')::DATE)
RETURNS TABLE(
  trend_date   DATE,
  penjualan    NUMERIC,
  pembelian    NUMERIC,
  profit       NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(p_start_date, CURRENT_DATE, '1 day'::interval)::DATE AS d
  ),
  daily_penjualan AS (
    SELECT
      p.tanggal,
      SUM(pi.harga_final * pi.qty)  AS revenue,
      SUM(pi.cost_at_sale * pi.qty) AS cogs
    FROM penjualan p
    JOIN penjualan_items pi ON pi.penjualan_id = p.id
    WHERE p.tanggal BETWEEN p_start_date AND CURRENT_DATE
    GROUP BY p.tanggal
  ),
  daily_pembelian AS (
    SELECT
      pb.tanggal,
      SUM(pb.total_sistem) AS total_beli
    FROM pembelian pb
    WHERE pb.tanggal BETWEEN p_start_date AND CURRENT_DATE
    GROUP BY pb.tanggal
  )
  SELECT
    ds.d                                        AS trend_date,
    COALESCE(dp.revenue, 0)                     AS penjualan,
    COALESCE(pb.total_beli, 0)                  AS pembelian,
    COALESCE(dp.revenue, 0) - COALESCE(dp.cogs, 0) AS profit
  FROM date_series ds
  LEFT JOIN daily_penjualan dp ON dp.tanggal = ds.d
  LEFT JOIN daily_pembelian pb ON pb.tanggal = ds.d
  ORDER BY ds.d ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_7day_trend_v2(DATE) TO authenticated;
-- Function: get_available_return_items
-- Returns items from purchases that can be returned to a specific supplier

CREATE OR REPLACE FUNCTION get_available_return_items(p_supplier_id UUID)
RETURNS TABLE (
  pembelian_item_id UUID,
  pembelian_id UUID,
  inventory_id UUID,
  nama_barang TEXT,
  harga_beli NUMERIC,
  diskon NUMERIC,
  qty_original INTEGER,
  qty_returned INTEGER,
  qty_remaining INTEGER,
  tanggal_pembelian DATE,
  nomor_nota TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pi.id AS pembelian_item_id,
    pi.pembelian_id,
    pi.inventory_id,
    pi.nama_barang,
    pi.harga_beli,
    COALESCE(pi.diskon, 0) AS diskon,
    pi.qty AS qty_original,
    COALESCE(SUM(pri.qty)::INTEGER, 0) AS qty_returned,
    (pi.qty - COALESCE(SUM(pri.qty)::INTEGER, 0)) AS qty_remaining,
    p.tanggal AS tanggal_pembelian,
    p.nomor_nota AS nomor_nota
  FROM pembelian_items pi
  JOIN pembelian p ON p.id = pi.pembelian_id
  LEFT JOIN pembelian_return_items pri 
    ON pri.pembelian_item_id = pi.id
  WHERE p.supplier_id = p_supplier_id
  GROUP BY pi.id, pi.pembelian_id, pi.inventory_id, pi.nama_barang, pi.harga_beli, pi.diskon, pi.qty, p.tanggal, p.nomor_nota
  HAVING (pi.qty - COALESCE(SUM(pri.qty)::INTEGER, 0)) > 0
  ORDER BY p.tanggal DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_available_return_items(UUID) TO authenticated;
-- SQL Function: process_opname_adjustments
-- Mengganti logika TypeScript yang tidak atomic dengan satu database transaction
-- Semua operasi (insert adjustments, insert movements, update stok, update opname) berjalan atomic
-- Jika salah satu gagal, seluruh operasi di-rollback otomatis oleh PostgreSQL

CREATE OR REPLACE FUNCTION process_opname_adjustments(
  p_opname_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_adjustment_type TEXT;
  v_adjustment_qty INTEGER;
  v_processed_count INTEGER := 0;
  v_opname_status TEXT;
BEGIN
  -- 1. Validasi status opname harus 'approved'
  SELECT status INTO v_opname_status
  FROM stock_opname
  WHERE id = p_opname_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock opname dengan id % tidak ditemukan', p_opname_id;
  END IF;

  IF v_opname_status != 'approved' THEN
    RAISE EXCEPTION 'Stock opname harus berstatus approved sebelum diproses. Status saat ini: %', v_opname_status;
  END IF;

  -- 2. Proses setiap item yang belum di-adjust dan punya selisih
  FOR v_item IN
    SELECT *
    FROM stock_opname_items
    WHERE stock_opname_id = p_opname_id
      AND adjusted = false
      AND difference != 0
  LOOP
    v_adjustment_type := CASE WHEN v_item.difference > 0 THEN 'increase' ELSE 'decrease' END;
    v_adjustment_qty  := ABS(v_item.difference);

    -- 2a. Insert stock adjustment record
    INSERT INTO stock_adjustments (
      stock_opname_item_id,
      inventory_id,
      adjustment_qty,
      adjustment_type,
      reason,
      note,
      created_by
    ) VALUES (
      v_item.id,
      v_item.inventory_id,
      v_adjustment_qty,
      v_adjustment_type,
      COALESCE(v_item.reason, 'lainnya'),
      v_item.note,
      p_user_id
    );

    -- 2b. Insert stock movement record
    INSERT INTO stock_movements (
      inventory_id,
      tipe,
      qty,
      referensi
    ) VALUES (
      v_item.inventory_id,
      'ADJUSTMENT',
      v_adjustment_qty,
      p_opname_id::TEXT
    );

    -- 2c. Update stok inventory ke nilai physical_stock
    UPDATE inventory
    SET
      stok = v_item.physical_stock,
      updated_at = NOW()
    WHERE id = v_item.inventory_id;

    v_processed_count := v_processed_count + 1;
  END LOOP;

  -- 3. Mark semua items sebagai adjusted
  UPDATE stock_opname_items
  SET adjusted = true
  WHERE stock_opname_id = p_opname_id
    AND difference != 0;

  -- 4. Update status opname menjadi completed
  UPDATE stock_opname
  SET
    status = 'completed',
    updated_at = NOW()
  WHERE id = p_opname_id;

  RETURN jsonb_build_object(
    'success', true,
    'processed_items', v_processed_count,
    'opname_id', p_opname_id
  );
END;
$$;

-- Grant eksekusi ke authenticated users (RLS di tabel sudah handle akses)
GRANT EXECUTE ON FUNCTION process_opname_adjustments(UUID, UUID) TO authenticated;
CREATE OR REPLACE FUNCTION public.proses_return_batch(
  p_supplier_id uuid,
  p_supplier_nama text,
  p_items jsonb,               -- JSON array
  p_tanggal date DEFAULT CURRENT_DATE,
  p_note text DEFAULT NULL,
  p_idempotency_key uuid DEFAULT NULL,
  p_created_by uuid DEFAULT auth.uid()
)
RETURNS TABLE(return_id uuid)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_return_id uuid;
  v_now timestamptz := now();
  v_item jsonb;
  v_pembelian_item_id uuid;
  v_inventory_id uuid;
  v_qty int;
  v_harga_beli numeric;
  v_diskon numeric;
  v_harga_final numeric;
  v_nama_barang text;
  v_sisa_return_qty int;
  v_current_stock int;
BEGIN
  IF p_items IS NULL THEN
    RAISE EXCEPTION 'p_items tidak boleh NULL';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'p_items harus berupa JSON array';
  END IF;
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'p_items tidak boleh kosong';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT pr.id INTO v_return_id
    FROM public.pembelian_return pr
    WHERE pr.idempotency_key = p_idempotency_key
    LIMIT 1;

    IF v_return_id IS NOT NULL THEN
      -- Validasi jumlah item sudah lengkap sebelum return
      IF (SELECT COUNT(*) FROM public.pembelian_return_items pri WHERE pri.pembelian_return_id = v_return_id AND pri.voided_at IS NULL)
         <>
         (SELECT COUNT(DISTINCT (elem->>'pembelian_item_id')::uuid) FROM jsonb_array_elements(p_items) elem)
      THEN
      -- Jika item tidak lengkap, hapus item terlebih dahulu lalu header (hindari FK error)
      DELETE FROM public.pembelian_return_items WHERE pembelian_return_id = v_return_id;
      DELETE FROM public.pembelian_return WHERE id = v_return_id;
      ELSE
        RETURN QUERY SELECT v_return_id;
        RETURN;
      END IF;
    END IF;
  END IF;

  -- Validasi tidak ada duplikasi pembelian_item_id
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT (elem->>'pembelian_item_id')::uuid AS id, COUNT(*) c
      FROM jsonb_array_elements(p_items) elem
      GROUP BY 1
    ) x
    WHERE x.c > 1
  ) THEN
    RAISE EXCEPTION 'p_items tidak boleh mengandung pembelian_item_id yang duplikat';
  END IF;

  -- Lock related rows
  PERFORM 1
  FROM public.pembelian_items pi
  JOIN public.pembelian p ON p.id = pi.pembelian_id
  JOIN LATERAL (
    SELECT
      (elem->>'pembelian_item_id')::uuid AS pembelian_item_id,
      (elem->>'inventory_id')::uuid AS inventory_id
    FROM jsonb_array_elements(p_items) AS elem
  ) inp ON inp.pembelian_item_id = pi.id
  WHERE p.supplier_id = p_supplier_id
  FOR UPDATE;

  -- Validasi SEMUA input item milik supplier ini sebelum lanjut
  IF (
    SELECT COUNT(DISTINCT (elem->>'pembelian_item_id')::uuid)
    FROM jsonb_array_elements(p_items) AS elem
  )
  <>
  (
    SELECT COUNT(DISTINCT pi.id)
    FROM public.pembelian_items pi
    JOIN public.pembelian p ON p.id = pi.pembelian_id
    JOIN LATERAL (
      SELECT (elem->>'pembelian_item_id')::uuid AS pembelian_item_id
      FROM jsonb_array_elements(p_items) AS elem
    ) inp ON inp.pembelian_item_id = pi.id
    WHERE p.supplier_id = p_supplier_id
  )
  THEN
    RAISE EXCEPTION 'Ada pembelian_item_id yang tidak valid atau bukan milik supplier ini';
  END IF;

  -- Insert header
  INSERT INTO public.pembelian_return (
    pembelian_id,
    supplier_id,
    supplier_nama,
    tanggal,
    note,
    created_by,
    idempotency_key
  ) VALUES (
    NULL,
    p_supplier_id,
    p_supplier_nama,
    p_tanggal,
    p_note,
    p_created_by,
    p_idempotency_key
  )
  RETURNING id INTO v_return_id;

  -- Process each item
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS t(value)
  LOOP
    v_pembelian_item_id := (v_item->>'pembelian_item_id')::uuid;
    v_inventory_id := (v_item->>'inventory_id')::uuid;
    v_qty := (v_item->>'qty')::int;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'qty harus > 0 (pembelian_item_id=%)', v_pembelian_item_id;
    END IF;

    -- Ambil data asli dari pembelian_items
    SELECT
      pi.inventory_id,
      pi.nama_barang,
      pi.harga_beli,
      COALESCE(pi.diskon, 0)
    INTO
      v_inventory_id,
      v_nama_barang,
      v_harga_beli,
      v_diskon
    FROM public.pembelian_items pi
    JOIN public.pembelian p ON p.id = pi.pembelian_id
    WHERE pi.id = v_pembelian_item_id
      AND p.supplier_id = p_supplier_id
    FOR UPDATE;

    IF v_inventory_id IS NULL THEN
      RAISE EXCEPTION 'pembelian_item_id % tidak ditemukan atau tidak milik supplier %',
        v_pembelian_item_id, p_supplier_id;
    END IF;

    IF (v_item->>'inventory_id')::uuid IS DISTINCT FROM v_inventory_id THEN
      RAISE EXCEPTION 'inventory_id input tidak sesuai untuk pembelian_item_id %', v_pembelian_item_id;
    END IF;

    -- Sisa qty (hanya hitung item yang belum di-void)
    SELECT (pi.qty - COALESCE(SUM(pri.qty), 0))::int
    INTO v_sisa_return_qty
    FROM public.pembelian_items pi
    LEFT JOIN public.pembelian_return_items pri
      ON pri.pembelian_item_id = pi.id
      AND pri.voided_at IS NULL
    WHERE pi.id = v_pembelian_item_id
    GROUP BY pi.qty;

    IF v_qty > v_sisa_return_qty THEN
      RAISE EXCEPTION 'Qty retur melebihi sisa (item=%) qty=% sisa=%',
        v_pembelian_item_id, v_qty, v_sisa_return_qty;
    END IF;

    v_harga_final := (v_harga_beli - v_diskon) * v_qty;
    IF v_harga_final < 0 THEN
      RAISE EXCEPTION 'harga_final menjadi negatif (item=%)', v_pembelian_item_id;
    END IF;

    -- Ambil nilai stok dari row dan lock per item
    SELECT stok INTO v_current_stock
    FROM public.inventory
    WHERE id = v_inventory_id
    FOR UPDATE;

    -- Cek stok cukup
    IF COALESCE(v_current_stock, 0) < v_qty THEN
      RAISE EXCEPTION 'Stok tidak cukup untuk inventory_id %: stok=%, butuh=%', v_inventory_id, COALESCE(v_current_stock, 0), v_qty;
    END IF;

    INSERT INTO public.pembelian_return_items (
      pembelian_return_id,
      pembelian_item_id,
      inventory_id,
      nama_barang,
      qty,
      harga_beli,
      diskon,
      harga_final
    ) VALUES (
      v_return_id,
      v_pembelian_item_id,
      v_inventory_id,
      v_nama_barang,
      v_qty,
      v_harga_beli,
      v_diskon,
      v_harga_final
    );

    UPDATE public.inventory
    SET stok = COALESCE(v_current_stock, 0) - v_qty,
        updated_at = v_now,
        updated_by = p_created_by
    WHERE id = v_inventory_id;

    INSERT INTO public.stock_movements (
      inventory_id,
      tipe,
      qty,
      referensi,
      created_at
    ) VALUES (
      v_inventory_id,
      'OUT',
      v_qty,
      'RETURN:' || v_return_id::text,
      v_now
    );
  END LOOP;

  RETURN QUERY SELECT v_return_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.proses_return_batch(uuid, text, jsonb, date, text, uuid, uuid) TO authenticated;
-- SQL Functions: get_sales_report & get_profit_report (Server-side aggregation)
-- Mengganti client-side aggregation yang menarik semua rows ke browser
-- Semua grouping, sorting, dan pagination dilakukan di PostgreSQL

-- ============================================================
-- FUNCTION 1: get_sales_report
-- Laporan penjualan per hari dengan aggregasi server-side
-- ============================================================
CREATE OR REPLACE FUNCTION get_sales_report(
  p_start_date  DATE    DEFAULT NULL,
  p_end_date    DATE    DEFAULT NULL,
  p_category_id UUID    DEFAULT NULL,
  p_page        INTEGER DEFAULT 1,
  p_limit       INTEGER DEFAULT 20
)
RETURNS TABLE(
  report_date         DATE,
  total_sales         NUMERIC,
  total_cash          NUMERIC,
  total_qris          NUMERIC,
  total_items         BIGINT,
  transaction_count   BIGINT,
  total_count         BIGINT    -- total rows for pagination (window function)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INTEGER := (GREATEST(1, p_page) - 1) * LEAST(100, GREATEST(1, p_limit));
  v_limit  INTEGER := LEAST(100, GREATEST(1, p_limit));
BEGIN
  RETURN QUERY
  WITH filtered_items AS (
    SELECT
      p.tanggal,
      pi.penjualan_id,
      SUM(pi.harga_final * pi.qty) AS item_total,
      SUM(pi.qty) AS qty,
      MAX(COALESCE(p.cash_amount, 0) - COALESCE(p.kembalian, 0)) AS cash_amount,
      MAX(p.qris_amount) AS qris_amount
    FROM penjualan_items pi
    JOIN penjualan p ON p.id = pi.penjualan_id
    JOIN inventory i ON i.id = pi.inventory_id
    WHERE
      (p_start_date  IS NULL OR p.tanggal >= p_start_date)
      AND (p_end_date  IS NULL OR p.tanggal <= p_end_date)
      AND (p_category_id IS NULL OR i.id_kategori = p_category_id)
    GROUP BY p.tanggal, pi.penjualan_id
  ),
  daily_agg AS (
    SELECT
      fi.tanggal,
      SUM(fi.item_total)                            AS total_sales,
      SUM(COALESCE(fi.cash_amount, 0))              AS total_cash,
      SUM(COALESCE(fi.qris_amount, 0))              AS total_qris,
      SUM(fi.qty)                                    AS total_items,
      COUNT(fi.penjualan_id)                        AS transaction_count
    FROM filtered_items fi
    GROUP BY fi.tanggal
  )
  SELECT
    da.tanggal                                     AS report_date,
    da.total_sales,
    da.total_cash,
    da.total_qris,
    da.total_items::BIGINT,
    da.transaction_count::BIGINT,
    COUNT(*) OVER()::BIGINT                        AS total_count
  FROM daily_agg da
  ORDER BY da.tanggal DESC
  LIMIT v_limit OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sales_report(DATE, DATE, UUID, INTEGER, INTEGER) TO authenticated;


-- ============================================================
-- FUNCTION 2: get_profit_report
-- Laporan laba per hari menggunakan cost_at_sale sebagai HPP
-- ============================================================
CREATE OR REPLACE FUNCTION get_profit_report(
  p_start_date  DATE    DEFAULT NULL,
  p_end_date    DATE    DEFAULT NULL,
  p_category_id UUID    DEFAULT NULL,
  p_page        INTEGER DEFAULT 1,
  p_limit       INTEGER DEFAULT 20
)
RETURNS TABLE(
  report_date         DATE,
  total_modal         NUMERIC,
  total_penjualan     NUMERIC,
  total_profit        NUMERIC,
  margin_percentage   NUMERIC,
  total_count         BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INTEGER := (GREATEST(1, p_page) - 1) * LEAST(100, GREATEST(1, p_limit));
  v_limit  INTEGER := LEAST(100, GREATEST(1, p_limit));
BEGIN
  RETURN QUERY
  WITH filtered_items AS (
    SELECT
      p.tanggal,
      pi.cost_at_sale * pi.qty AS item_cogs,
      pi.harga_final  * pi.qty AS item_revenue
    FROM penjualan_items pi
    JOIN penjualan p ON p.id = pi.penjualan_id
    JOIN inventory i ON i.id = pi.inventory_id
    WHERE
      (p_start_date  IS NULL OR p.tanggal >= p_start_date)
      AND (p_end_date  IS NULL OR p.tanggal <= p_end_date)
      AND (p_category_id IS NULL OR i.id_kategori = p_category_id)
  ),
  daily_profit AS (
    SELECT
      fi.tanggal,
      SUM(fi.item_cogs)                                                       AS total_modal,
      SUM(fi.item_revenue)                                                    AS total_penjualan,
      SUM(fi.item_revenue) - SUM(fi.item_cogs)                               AS total_profit,
      CASE
        WHEN SUM(fi.item_revenue) > 0
        THEN ROUND(((SUM(fi.item_revenue) - SUM(fi.item_cogs)) / SUM(fi.item_revenue)) * 100, 2)
        ELSE 0
      END                                                                     AS margin_percentage
    FROM filtered_items fi
    GROUP BY fi.tanggal
  )
  SELECT
    dp.tanggal            AS report_date,
    dp.total_modal,
    dp.total_penjualan,
    dp.total_profit,
    dp.margin_percentage,
    COUNT(*) OVER()::BIGINT AS total_count
  FROM daily_profit dp
  ORDER BY dp.tanggal DESC
  LIMIT v_limit OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_profit_report(DATE, DATE, UUID, INTEGER, INTEGER) TO authenticated;


-- ============================================================
-- FUNCTION 3: get_top_selling_items
-- Top N item terlaris berdasarkan qty terjual + profit
-- ============================================================
CREATE OR REPLACE FUNCTION get_top_selling_items(
  p_start_date  DATE    DEFAULT NULL,
  p_end_date    DATE    DEFAULT NULL,
  p_category_id UUID    DEFAULT NULL,
  p_limit       INTEGER DEFAULT 10
)
RETURNS TABLE(
  inventory_id  UUID,
  nama_barang   TEXT,
  total_qty     BIGINT,
  total_sales   NUMERIC,
  total_profit  NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pi.inventory_id,
    pi.nama_barang,
    SUM(pi.qty)::BIGINT                              AS total_qty,
    SUM(pi.harga_final * pi.qty)                    AS total_sales,
    SUM((pi.harga_final - pi.cost_at_sale) * pi.qty) AS total_profit
  FROM penjualan_items pi
  JOIN penjualan p ON p.id = pi.penjualan_id
  JOIN inventory i ON i.id = pi.inventory_id
  WHERE
    (p_start_date  IS NULL OR p.tanggal >= p_start_date)
    AND (p_end_date  IS NULL OR p.tanggal <= p_end_date)
    AND (p_category_id IS NULL OR i.id_kategori = p_category_id)
  GROUP BY pi.inventory_id, pi.nama_barang
  ORDER BY total_qty DESC
  LIMIT LEAST(100, GREATEST(1, p_limit));
END;
$$;

GRANT EXECUTE ON FUNCTION get_top_selling_items(DATE, DATE, UUID, INTEGER) TO authenticated;
-- Function to batch add purchases
CREATE OR REPLACE FUNCTION tambah_pembelian_batch(
  p_items JSONB,
  p_supplier_id UUID,
  p_tanggal DATE,
  p_user UUID,
  p_idempotency_key UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_pembelian_id UUID;
  v_item JSONB;
  v_inventory_id UUID;
  v_total_sistem NUMERIC := 0;
  v_harga_beli NUMERIC;
  v_qty INTEGER;
  v_harga_final NUMERIC;
  v_idempotency_key UUID;
BEGIN
  -- Validate input
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'p_items harus berupa JSON array non-kosong';
  END IF;

  -- Determine final idempotency key
  v_idempotency_key := COALESCE(p_idempotency_key, gen_random_uuid());

  -- Insert idempotent (race-condition safe)
  WITH ins AS (
    INSERT INTO pembelian (
      supplier_id,
      tanggal,
      created_by,
      supplier_nama,
      idempotency_key
    )
    SELECT
      p_supplier_id,
      p_tanggal,
      p_user,
      COALESCE((SELECT nama FROM supplier WHERE id = p_supplier_id), 'Tanpa Supplier'),
      v_idempotency_key
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id
  )
  SELECT id INTO v_pembelian_id
  FROM ins;

  -- If insert didn't happen (conflict), get existing id
  IF v_pembelian_id IS NULL THEN
    SELECT id INTO v_pembelian_id
    FROM pembelian
    WHERE idempotency_key = v_idempotency_key
    LIMIT 1;
  END IF;

  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Validate required fields
    IF v_item->>'nama_barang' IS NULL OR TRIM(v_item->>'nama_barang') = '' THEN
      RAISE EXCEPTION 'nama_barang tidak boleh kosong';
    END IF;
    IF (v_item->>'harga') IS NULL OR (v_item->>'harga')::NUMERIC IS NULL OR (v_item->>'harga')::NUMERIC < 0 THEN
      RAISE EXCEPTION 'harga tidak valid untuk item: %', v_item->>'nama_barang';
    END IF;
    IF (v_item->>'qty') IS NULL OR (v_item->>'qty')::INTEGER IS NULL OR (v_item->>'qty')::INTEGER <= 0 THEN
      RAISE EXCEPTION 'qty harus > 0 untuk item: %', v_item->>'nama_barang';
    END IF;

    -- Find or create inventory item
    v_inventory_id := (
      SELECT id FROM inventory 
      WHERE LOWER(nama_barang) = LOWER(v_item->>'nama_barang')
      LIMIT 1
    );

    -- Reactivate discontinued items
    IF v_inventory_id IS NOT NULL THEN
      UPDATE inventory 
      SET 
        is_discontinued = false,
        discontinued_at = NULL,
        discontinued_by = NULL,
        updated_at = NOW(),
        updated_by = p_user
      WHERE id = v_inventory_id AND is_discontinued = true;
    END IF;

    -- Create new inventory item if not found
    IF v_inventory_id IS NULL THEN
      INSERT INTO inventory (
        nama_barang,
        slug,
        harga_beli_terakhir,
        harga_jual,
        created_by,
        stok
      )
      VALUES (
        v_item->>'nama_barang',
        LOWER(REPLACE(REPLACE(v_item->>'nama_barang', ' ', '-'), '_', '-')) || '-' || EXTRACT(EPOCH FROM NOW())::TEXT,
        (v_item->>'harga')::NUMERIC,
        COALESCE((v_item->>'harga_jual')::NUMERIC, ((v_item->>'harga')::NUMERIC * 1.2)),
        p_user,
        0
      )
      RETURNING id INTO v_inventory_id;
    END IF;

    -- Calculate prices
    v_harga_beli := (v_item->>'harga')::NUMERIC;
    v_qty := (v_item->>'qty')::INTEGER;
    v_harga_final := v_harga_beli * v_qty;

    -- Add purchase item
    INSERT INTO pembelian_items (
      pembelian_id,
      inventory_id,
      nama_barang,
      qty,
      harga_beli,
      harga_final
    )
    VALUES (
      v_pembelian_id,
      v_inventory_id,
      v_item->>'nama_barang',
      v_qty,
      v_harga_beli,
      v_harga_final
    );

    -- Update inventory stock and last purchase price
    UPDATE inventory 
    SET 
      stok = COALESCE(stok, 0) + v_qty,
      harga_beli_terakhir = v_harga_beli,
      harga_jual = CASE 
        WHEN v_item->>'harga_jual' IS NOT NULL THEN (v_item->>'harga_jual')::NUMERIC 
        ELSE harga_jual 
      END,
      updated_by = p_user,
      updated_at = NOW()
    WHERE id = v_inventory_id;

    -- Record stock movement
    INSERT INTO stock_movements (
      inventory_id,
      tipe,
      qty,
      referensi
    )
    VALUES (
      v_inventory_id,
      'IN',
      v_qty,
      v_pembelian_id::TEXT
    );

    v_total_sistem := v_total_sistem + v_harga_final;
  END LOOP;

  -- Update the purchase total
  UPDATE pembelian 
  SET total_sistem = v_total_sistem 
  WHERE id = v_pembelian_id;

  RETURN v_pembelian_id;
END;
$$;

GRANT EXECUTE ON FUNCTION tambah_pembelian_batch(jsonb, uuid, date, uuid, uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.void_pembelian_return_item(uuid, text, uuid);
CREATE OR REPLACE FUNCTION public.void_pembelian_return_item(
  p_pembelian_return_item_id uuid,
  p_note text default null,
  p_created_by uuid default auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_item record;
  v_now timestamptz := now();
BEGIN
  -- Lock baris untuk update
  SELECT * INTO v_item
  FROM public.pembelian_return_items
  WHERE id = p_pembelian_return_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item pembelian return tidak ditemukan';
  END IF;

  -- Idempotent: jika sudah void, return tanpa error
  IF v_item.voided_at IS NOT NULL THEN
    RETURN v_item.id;
  END IF;

  -- Update status void
  UPDATE public.pembelian_return_items
  SET 
    voided_at = v_now,
    updated_by = p_created_by
  WHERE id = p_pembelian_return_item_id;

  -- Koreksi stok: kembalikan qty ke inventory
  UPDATE public.inventory
  SET 
    stok = stok + v_item.qty,
    updated_at = v_now,
    updated_by = p_created_by
  WHERE id = v_item.inventory_id;

  -- Catat pergerakan stok
  INSERT INTO public.stock_movements (
    inventory_id,
    tipe,
    qty,
    referensi,
    note,
    created_at,
    created_by
  ) VALUES (
    v_item.inventory_id,
    'IN',
    v_item.qty,
    'VOID_RETURN_ITEM:' || v_item.id::text,
    p_note,
    v_now,
    p_created_by
  );

  RETURN v_item.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.void_pembelian_return_item(uuid, text, uuid) TO authenticated;

-- Auth Trigger
-- Migration: Add trigger to sync last_sign_in_at from auth.users to public.profiles

-- Create the function that will sync last_sign_in_at
CREATE OR REPLACE FUNCTION public.sync_last_sign_in_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.profiles
    SET last_sign_in_at = NEW.last_sign_in_at
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_sign_in ON auth.users;

-- Create the trigger on auth.users
CREATE TRIGGER on_auth_user_sign_in
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_last_sign_in_at();


-- ============================================
GRANT USAGE ON SCHEMA rpc TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA rpc TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;


GRANT EXECUTE ON FUNCTION public.pay_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION public.pay_transaction TO service_role;

