-- ==========================================================
-- Migration: 20260902111500_fix_database_functions_roles_and_nama.sql
-- Description: Perbaikan fungsi database yang masih merujuk ke kolom
--              legacy 'role' dan 'full_name' pada tabel profiles.
-- ==========================================================

-- 1. Perbaiki handle_new_user (auth user signup trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, nama, roles)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'nama', split_part(NEW.email, '@', 1), 'user'),
    ARRAY['kasir', 'staff_gudang']
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert ke karyawan
  INSERT INTO public.karyawan (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 2. Perbaiki update_pembelian_batch (validasi admin via roles)
CREATE OR REPLACE FUNCTION public.update_pembelian_batch(
  p_pembelian_id uuid,
  p_items jsonb,
  p_supplier_id uuid,
  p_tanggal date,
  p_user uuid,
  p_nomor_nota text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
DECLARE
  v_item JSONB;
  v_inventory_id UUID;
  v_total_sistem NUMERIC := 0;
  v_harga_beli NUMERIC;
  v_qty INTEGER;
  v_diskon NUMERIC;
  v_harga_final NUMERIC;
  v_subtotal NUMERIC;
  
  v_existing_item RECORD;
  v_found BOOLEAN;
  v_stock_opname_id UUID := NULL;
  v_current_system_stock INTEGER;
  v_qty_diff INTEGER;
BEGIN
  -- Validate user role using roles array
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user AND 'admin' = ANY(roles)) THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya admin yang dapat mengubah transaksi pembelian.';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'p_items harus berupa JSON array';
  END IF;

  -- Lock the pembelian record
  PERFORM id FROM pembelian WHERE id = p_pembelian_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi pembelian tidak ditemukan.';
  END IF;

  -- If empty items, delete the whole pembelian and revert stock via draft opname
  IF jsonb_array_length(p_items) = 0 THEN
    FOR v_existing_item IN SELECT inventory_id, qty, nama_barang FROM pembelian_items WHERE pembelian_id = p_pembelian_id
    LOOP
      SELECT stok INTO v_current_system_stock FROM inventory WHERE id = v_existing_item.inventory_id;
      
      IF v_stock_opname_id IS NULL THEN
        SELECT id INTO v_stock_opname_id FROM stock_opname WHERE opname_date = CURRENT_DATE AND status = 'draft' AND created_by = p_user LIMIT 1;
        IF v_stock_opname_id IS NULL THEN
          INSERT INTO stock_opname (opname_date, status, created_by) VALUES (CURRENT_DATE, 'draft', p_user) RETURNING id INTO v_stock_opname_id;
        END IF;
      END IF;

      INSERT INTO stock_opname_items (stock_opname_id, inventory_id, system_stock, physical_stock, difference, reason, note)
      VALUES (v_stock_opname_id, v_existing_item.inventory_id, v_current_system_stock, v_current_system_stock - v_existing_item.qty, -v_existing_item.qty, 'lainnya', 'Pembatalan Transaksi Pembelian (No. Nota: ' || COALESCE(p_nomor_nota, 'Tidak ada') || ')');
    END LOOP;
    
    DELETE FROM pembelian WHERE id = p_pembelian_id;
    RETURN jsonb_build_object('success', true, 'is_deleted', true);
  END IF;

  -- Update pembelian header
  UPDATE pembelian
  SET supplier_id = p_supplier_id,
      supplier_nama = COALESCE((SELECT nama FROM supplier WHERE id = p_supplier_id), 'Tanpa Supplier'),
      tanggal = p_tanggal,
      nomor_nota = p_nomor_nota
  WHERE id = p_pembelian_id;

  -- Process deletions & updates
  FOR v_existing_item IN SELECT id, inventory_id, qty, nama_barang, harga_beli, diskon, harga_final FROM pembelian_items WHERE pembelian_id = p_pembelian_id
  LOOP
    v_found := false;
    
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      -- Compare by inventory_id if available, otherwise by name
      IF (v_item->>'inventory_id' IS NOT NULL AND (v_item->>'inventory_id')::UUID = v_existing_item.inventory_id) OR 
         (LOWER(v_item->>'nama_barang') = LOWER(v_existing_item.nama_barang)) THEN
        
        v_found := true;
        v_qty := (v_item->>'qty')::INTEGER;
        v_harga_beli := (v_item->>'harga')::NUMERIC;
        v_diskon := COALESCE((v_item->>'diskon')::NUMERIC, 0);
        v_harga_final := v_harga_beli - v_diskon;
        v_qty_diff := v_qty - v_existing_item.qty;
        
        -- Update the item row
        UPDATE pembelian_items
        SET qty = v_qty,
            harga_beli = v_harga_beli,
            diskon = v_diskon,
            harga_final = v_harga_final
        WHERE id = v_existing_item.id;
        
        -- If qty changed, draft stock opname
        IF v_qty_diff <> 0 THEN
          SELECT stok INTO v_current_system_stock FROM inventory WHERE id = v_existing_item.inventory_id;
          
          IF v_stock_opname_id IS NULL THEN
            SELECT id INTO v_stock_opname_id FROM stock_opname WHERE opname_date = CURRENT_DATE AND status = 'draft' AND created_by = p_user LIMIT 1;
            IF v_stock_opname_id IS NULL THEN
              INSERT INTO stock_opname (opname_date, status, created_by) VALUES (CURRENT_DATE, 'draft', p_user) RETURNING id INTO v_stock_opname_id;
            END IF;
          END IF;

          INSERT INTO stock_opname_items (stock_opname_id, inventory_id, system_stock, physical_stock, difference, reason, note)
          VALUES (v_stock_opname_id, v_existing_item.inventory_id, v_current_system_stock, v_current_system_stock + v_qty_diff, v_qty_diff, 'lainnya', 'Koreksi Transaksi Pembelian (No. Nota: ' || COALESCE(p_nomor_nota, 'Tidak ada') || ')');
        END IF;
        
        EXIT; -- item found and processed
      END IF;
    END LOOP;

    -- If not found in new items, it means it was deleted
    IF NOT v_found THEN
      SELECT stok INTO v_current_system_stock FROM inventory WHERE id = v_existing_item.inventory_id;
      
      IF v_stock_opname_id IS NULL THEN
        SELECT id INTO v_stock_opname_id FROM stock_opname WHERE opname_date = CURRENT_DATE AND status = 'draft' AND created_by = p_user LIMIT 1;
        IF v_stock_opname_id IS NULL THEN
          INSERT INTO stock_opname (opname_date, status, created_by) VALUES (CURRENT_DATE, 'draft', p_user) RETURNING id INTO v_stock_opname_id;
        END IF;
      END IF;

      INSERT INTO stock_opname_items (stock_opname_id, inventory_id, system_stock, physical_stock, difference, reason, note)
      VALUES (v_stock_opname_id, v_existing_item.inventory_id, v_current_system_stock, v_current_system_stock - v_existing_item.qty, -v_existing_item.qty, 'lainnya', 'Koreksi Hapus Item Transaksi Pembelian (No. Nota: ' || COALESCE(p_nomor_nota, 'Tidak ada') || ')');
      
      DELETE FROM pembelian_items WHERE id = v_existing_item.id;
    END IF;
  END LOOP;

  -- Process insertions (items in JSON that do not exist in DB for this pembelian)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_found := false;
    
    -- Does it exist in the DB for this pembelian?
    FOR v_existing_item IN SELECT inventory_id, nama_barang FROM pembelian_items WHERE pembelian_id = p_pembelian_id
    LOOP
      IF (v_item->>'inventory_id' IS NOT NULL AND (v_item->>'inventory_id')::UUID = v_existing_item.inventory_id) OR 
         (LOWER(v_item->>'nama_barang') = LOWER(v_existing_item.nama_barang)) THEN
        v_found := true;
        EXIT;
      END IF;
    END LOOP;
    
    -- New item!
    IF NOT v_found THEN
      -- Get or create inventory
      IF v_item->>'inventory_id' IS NOT NULL THEN
        v_inventory_id := (v_item->>'inventory_id')::UUID;
      ELSE
        v_inventory_id := (SELECT id FROM inventory WHERE LOWER(nama_barang) = LOWER(v_item->>'nama_barang') LIMIT 1);
      END IF;
      
      IF v_inventory_id IS NOT NULL THEN
        UPDATE inventory 
        SET is_discontinued = false, discontinued_at = NULL, discontinued_by = NULL, updated_at = NOW(), updated_by = p_user
        WHERE id = v_inventory_id AND is_discontinued = true;
      ELSE
        -- Insert new inventory
        INSERT INTO inventory (nama_barang, slug, harga_beli_terakhir, harga_jual, created_by, stok)
        VALUES (
          v_item->>'nama_barang',
          LOWER(REPLACE(REPLACE(v_item->>'nama_barang', ' ', '-'), '_', '-')) || '-' || EXTRACT(EPOCH FROM NOW())::TEXT,
          (v_item->>'harga')::NUMERIC,
          ((v_item->>'harga')::NUMERIC * 1.2),
          p_user,
          0
        ) RETURNING id INTO v_inventory_id;
      END IF;
      
      v_harga_beli := (v_item->>'harga')::NUMERIC;
      v_qty := (v_item->>'qty')::INTEGER;
      v_diskon := COALESCE((v_item->>'diskon')::NUMERIC, 0);
      v_harga_final := v_harga_beli - v_diskon;
      
      -- Insert new pembelian_item
      INSERT INTO pembelian_items (pembelian_id, inventory_id, nama_barang, qty, harga_beli, diskon, harga_final)
      VALUES (p_pembelian_id, v_inventory_id, v_item->>'nama_barang', v_qty, v_harga_beli, v_diskon, v_harga_final);
      
      -- For completely new items in a purchase, we ADD to stok directly (just like normal purchase)
      UPDATE inventory 
      SET stok = COALESCE(stok, 0) + v_qty,
          harga_beli_terakhir = v_harga_beli,
          updated_by = p_user,
          updated_at = NOW()
      WHERE id = v_inventory_id;

      INSERT INTO stock_movements (inventory_id, tipe, qty, referensi)
      VALUES (v_inventory_id, 'IN', v_qty, p_pembelian_id::TEXT);
      
    END IF;
  END LOOP;
  
  -- Recalculate total_sistem
  SELECT COALESCE(SUM(harga_final * qty), 0) INTO v_total_sistem FROM pembelian_items WHERE pembelian_id = p_pembelian_id;
  
  UPDATE pembelian SET total_sistem = v_total_sistem WHERE id = p_pembelian_id;

  RETURN jsonb_build_object('success', true, 'pembelian_id', p_pembelian_id, 'is_deleted', false);
END;
$function$;

-- 3. Perbaiki pay_transaction (ganti full_name -> nama)
CREATE OR REPLACE FUNCTION public.pay_transaction(
  p_idempotency_key uuid,
  p_items jsonb,
  p_payment_method text,
  p_cash_amount numeric,
  p_qris_amount numeric,
  p_diskon_nominal numeric,
  p_diskon_persen numeric,
  p_catatan text,
  p_created_by uuid,
  p_created_at timestamp with time zone DEFAULT now(),
  p_member_id uuid DEFAULT NULL::uuid,
  p_points_earned numeric DEFAULT 0,
  p_points_redeemed numeric DEFAULT 0,
  p_discount_member_amount numeric DEFAULT 0,
  p_receipt_sent_via_wa boolean DEFAULT false,
  p_gudang_id uuid DEFAULT NULL::uuid,
  p_shift_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
    v_penjualan_id UUID;
    v_subtotal NUMERIC := 0;
    v_total NUMERIC := 0;
    v_kembalian NUMERIC := 0;
    v_net_cash NUMERIC := 0;
    v_item JSONB;
    v_inventory RECORD;
    v_existing UUID;
    v_gudang_id UUID;
    v_shift_id UUID;
    v_stock_exists BOOLEAN;
    v_current_stock INT;
BEGIN
    IF p_created_by = '00000000-0000-0000-0000-000000000000'::UUID THEN
        p_created_by := NULL;
    END IF;

    IF p_created_at IS NULL THEN
        p_created_at := NOW();
    END IF;

    -- Resolve gudang_id fallback if null
    v_gudang_id := p_gudang_id;
    IF v_gudang_id IS NULL THEN
        SELECT id INTO v_gudang_id FROM public.gudang WHERE is_default = true LIMIT 1;
        IF v_gudang_id IS NULL THEN
            SELECT id INTO v_gudang_id FROM public.gudang ORDER BY created_at ASC LIMIT 1;
        END IF;
    END IF;

    -- Resolve shift_id safely to avoid foreign key violation (code 23503)
    v_shift_id := p_shift_id;
    IF v_shift_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.shift_sessions WHERE id = v_shift_id) THEN
            IF p_created_by IS NOT NULL THEN
                INSERT INTO public.shift_sessions (
                    id, kasir_id, kasir_name, gudang_id, start_time, opening_cash, status, created_at
                ) VALUES (
                    v_shift_id,
                    p_created_by,
                    COALESCE((SELECT nama FROM public.profiles WHERE id = p_created_by), 'Kasir'),
                    v_gudang_id,
                    p_created_at,
                    0,
                    'OPEN',
                    p_created_at
                ) ON CONFLICT (id) DO NOTHING;
            ELSE
                v_shift_id := NULL;
            END IF;
        END IF;

        -- Fallback guard: if shift session still does not exist, fallback to NULL
        IF v_shift_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.shift_sessions WHERE id = v_shift_id) THEN
            v_shift_id := NULL;
        END IF;
    END IF;

    -- Idempotency check
    SELECT id INTO v_existing FROM public.penjualan 
    WHERE idempotency_key = p_idempotency_key AND status = 'paid';
    IF v_existing IS NOT NULL THEN
        RETURN v_existing; 
    END IF;

    v_penjualan_id := p_idempotency_key;
    
    INSERT INTO public.penjualan (
        id, total, status, paid_at, tanggal, payment_method,
        diskon_nominal, diskon_persen, subtotal_sebelum_diskon,
        cash_amount, qris_amount, kembalian, created_by, 
        idempotency_key, created_at, member_id, points_earned,
        points_redeemed, discount_member_amount, receipt_sent_via_wa,
        gudang_id, shift_id
    )
    VALUES (
        v_penjualan_id, 0, 'paid', p_created_at, p_created_at::DATE, p_payment_method,
        p_diskon_nominal, p_diskon_persen, 0,
        p_cash_amount, p_qris_amount, 0, p_created_by, 
        p_idempotency_key, p_created_at, p_member_id, COALESCE(p_points_earned,0),
        COALESCE(p_points_redeemed,0), COALESCE(p_discount_member_amount,0), COALESCE(p_receipt_sent_via_wa, false),
        v_gudang_id, v_shift_id
    );

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO v_inventory FROM public.inventory 
        WHERE id = (v_item->>'inventory_id')::UUID FOR UPDATE;
        
        IF v_inventory IS NULL THEN
            RAISE EXCEPTION 'Barang tidak ditemukan: %', (v_item->>'inventory_id')::UUID;
        END IF;

        -- Check warehouse stock if inventory_stocks table exists and has row
        IF v_gudang_id IS NOT NULL THEN
            SELECT EXISTS(SELECT 1 FROM public.inventory_stocks WHERE inventory_id = v_inventory.id AND gudang_id = v_gudang_id) INTO v_stock_exists;
            IF v_stock_exists THEN
                SELECT stok INTO v_current_stock FROM public.inventory_stocks WHERE inventory_id = v_inventory.id AND gudang_id = v_gudang_id FOR UPDATE;
                IF v_current_stock < (v_item->>'qty')::INT THEN
                    RAISE EXCEPTION 'Stok di gudang tidak cukup untuk % (Stok Gudang: %, Diminta: %)', 
                        v_inventory.nama_barang, v_current_stock, (v_item->>'qty')::INT;
                END IF;
                UPDATE public.inventory_stocks
                SET stok = stok - (v_item->>'qty')::INT,
                    updated_at = NOW()
                WHERE inventory_id = v_inventory.id AND gudang_id = v_gudang_id;
            ELSE
                -- Create record in inventory_stocks with initial remaining
                INSERT INTO public.inventory_stocks (id, inventory_id, gudang_id, stok, created_at, updated_at)
                VALUES (gen_random_uuid(), v_inventory.id, v_gudang_id, GREATEST(v_inventory.stok - (v_item->>'qty')::INT, 0), NOW(), NOW());
            END IF;
        END IF;
        
        UPDATE public.inventory 
        SET stok = GREATEST(stok - (v_item->>'qty')::INT, 0),
            updated_at = NOW() 
        WHERE id = v_inventory.id;
        
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
        
        INSERT INTO public.stock_movements (id, inventory_id, tipe, qty, referensi, gudang_id, created_at)
        VALUES (gen_random_uuid(), v_inventory.id, 'OUT', (v_item->>'qty')::INT, v_penjualan_id::TEXT, v_gudang_id, p_created_at);
        
        v_subtotal := v_subtotal + ((v_item->>'harga_final')::NUMERIC * (v_item->>'qty')::INT);
    END LOOP;
    
    v_total := v_subtotal - COALESCE(p_diskon_nominal, 0) - (v_subtotal * COALESCE(p_diskon_persen, 0) / 100) - COALESCE(p_discount_member_amount, 0) - COALESCE(p_points_redeemed, 0);
    v_total := GREATEST(v_total, 0);
    
    v_kembalian := (p_cash_amount + p_qris_amount) - v_total;
    
    IF (p_cash_amount + p_qris_amount) < v_total THEN
        RAISE EXCEPTION 'Pembayaran kurang: total=%, dibayar=%', 
            v_total, p_cash_amount + p_qris_amount;
    END IF;
    
    UPDATE public.penjualan
    SET 
        total = v_total,
        subtotal_sebelum_diskon = v_subtotal,
        kembalian = v_kembalian
    WHERE id = v_penjualan_id;
    
    IF upper(p_payment_method) = 'QRIS' THEN
        v_net_cash := 0;
    ELSIF upper(p_payment_method) = 'CASH' THEN
        v_net_cash := v_total;
    ELSIF upper(p_payment_method) = 'CASH_QRIS' THEN
        v_net_cash := v_total - p_qris_amount;
    ELSE
        v_net_cash := v_total;
    END IF;
    
    INSERT INTO public.kas_log (id, tipe, jumlah, payment_method, referensi_id, catatan, created_by, created_at)
    VALUES (v_penjualan_id, 'JUAL', v_net_cash, p_payment_method, v_penjualan_id, p_catatan, p_created_by, p_created_at);
    
    RETURN v_penjualan_id;
END;
$function$;

-- 4. Perbaiki trg_pencairan_to_ledger (ganti full_name -> nama)
CREATE OR REPLACE FUNCTION public.trg_pencairan_to_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_user_name TEXT;
BEGIN
    IF NEW.jenis = 'debit' AND NEW.status = 'disetujui' AND OLD.status != 'disetujui' THEN
        SELECT nama INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
        
        INSERT INTO public.buku_besar (
            tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by
        ) VALUES (
            CURRENT_DATE, 'PENGELUARAN', 'GAJI', NEW.id::uuid,
            'Penarikan Dana / Kasbon: ' || COALESCE(v_user_name, 'Karyawan') || COALESCE(' - ' || NEW.keterangan, ''),
            NEW.nominal, NEW.user_id 
        );
    END IF;
    RETURN NEW;
END;
$function$;
