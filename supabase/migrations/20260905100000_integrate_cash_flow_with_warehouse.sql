-- ====================================================================
-- Migration: 20260905100000_integrate_cash_flow_with_warehouse.sql
-- Description: Integrasi Penuh Arus Kas (kas_log) dengan Modul Gudang
--              (Zero POS Changes, Safe Fallback Trigger, Backfill Data)
-- ====================================================================

-- 1. PERBAIKI RPC: public.pay_transaction
-- Menambahkan v_gudang_id pada INSERT INTO public.kas_log
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
SECURITY DEFINER
SET search_path = public
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
    
    -- Menambahkan v_gudang_id secara eksplisit ke kas_log
    INSERT INTO public.kas_log (id, tipe, jumlah, payment_method, referensi_id, catatan, created_by, created_at, gudang_id)
    VALUES (v_penjualan_id, 'JUAL', v_net_cash, p_payment_method, v_penjualan_id, p_catatan, p_created_by, p_created_at, v_gudang_id);
    
    RETURN v_penjualan_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.pay_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION public.pay_transaction TO service_role;


-- 2. PERBAIKI RPC: public.create_penjualan_return & public.process_return
-- Mengembalikan stok ke inventory_stocks gudang dan mencatat gudang_id ke kas_log & stock_movements
CREATE OR REPLACE FUNCTION public.create_penjualan_return(
  p_penjualan_id UUID,
  p_tanggal DATE,
  p_note TEXT,
  p_created_by UUID,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  v_total_refund NUMERIC := 0;
  v_gudang_id UUID;
BEGIN
  -- original penjualan must be paid
  SELECT gudang_id INTO v_gudang_id
  FROM public.penjualan
  WHERE id = p_penjualan_id AND status IN ('paid', 'LUNAS');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Penjualan not found or not paid';
  END IF;

  IF v_gudang_id IS NULL THEN
    SELECT id INTO v_gudang_id FROM public.gudang WHERE is_default = true LIMIT 1;
    IF v_gudang_id IS NULL THEN
        SELECT id INTO v_gudang_id FROM public.gudang ORDER BY created_at ASC LIMIT 1;
    END IF;
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
    v_penjualan_item_id := NULLIF(v_item->>'penjualan_item_id', '')::UUID;
    v_inventory_id := NULLIF(v_item->>'inventory_id', '')::UUID;
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

    -- 1. Try matching by penjualan_item_id
    v_original_qty := NULL;
    IF v_penjualan_item_id IS NOT NULL THEN
      SELECT inventory_id, qty INTO v_inventory_id, v_original_qty
      FROM public.penjualan_items
      WHERE id = v_penjualan_item_id AND penjualan_id = p_penjualan_id;
    END IF;

    -- 2. Fallback: match by (penjualan_id, inventory_id)
    IF v_original_qty IS NULL AND v_inventory_id IS NOT NULL THEN
      SELECT id, qty INTO v_penjualan_item_id, v_original_qty
      FROM public.penjualan_items
      WHERE penjualan_id = p_penjualan_id AND inventory_id = v_inventory_id
      LIMIT 1;
    END IF;

    IF v_original_qty IS NULL THEN
      RAISE EXCEPTION 'Item tidak ada di transaksi original';
    END IF;

    SELECT COALESCE(SUM(pri.qty), 0) INTO v_return_qty
    FROM public.penjualan_return pr
    JOIN public.penjualan_return_items pri
      ON pri.penjualan_return_id = pr.id
    WHERE pr.penjualan_id = p_penjualan_id
      AND pri.penjualan_item_id = v_penjualan_item_id;

    IF v_qty > (v_original_qty - v_return_qty) THEN
      RAISE EXCEPTION 'Qty return melebihi yang bisa dikembalikan. Maks: %', v_original_qty - v_return_qty;
    END IF;

    -- Insert return item
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

    -- Restore stok master
    UPDATE public.inventory
    SET stok = stok + v_qty,
        updated_at = NOW()
    WHERE id = v_inventory_id;

    -- Restore stok gudang terkait
    IF v_gudang_id IS NOT NULL THEN
      INSERT INTO public.inventory_stocks (inventory_id, gudang_id, stok, updated_at)
      VALUES (v_inventory_id, v_gudang_id, v_qty, NOW())
      ON CONFLICT (inventory_id, gudang_id)
      DO UPDATE SET stok = public.inventory_stocks.stok + v_qty,
                    updated_at = NOW();
    END IF;

    -- Stock movement IN dengan gudang_id
    INSERT INTO public.stock_movements (
      id,
      inventory_id,
      tipe,
      qty,
      referensi,
      gudang_id,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      v_inventory_id,
      'IN',
      v_qty,
      v_return_id::text,
      v_gudang_id,
      NOW()
    );

    v_total_refund := v_total_refund + (v_harga_final * v_qty);
  END LOOP;

  -- Kas log for return dengan gudang_id
  INSERT INTO public.kas_log (id, tipe, jumlah, payment_method, referensi_id, catatan, created_by, created_at, gudang_id)
  VALUES (gen_random_uuid(), 'RETURN', v_total_refund, 'CASH', v_return_id, COALESCE(p_note, 'Retur Penjualan'), p_created_by, NOW(), v_gudang_id);

  RETURN v_return_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_penjualan_return TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_penjualan_return TO service_role;

-- Sinkronkan juga fungsi alias public.process_return
CREATE OR REPLACE FUNCTION public.process_return(
  p_penjualan_id uuid,
  p_items jsonb,
  p_note text DEFAULT NULL::text,
  p_created_by uuid DEFAULT NULL::uuid,
  p_idempotency_key uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.create_penjualan_return(
    p_penjualan_id,
    CURRENT_DATE,
    p_note,
    p_created_by,
    p_items
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_return TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_return TO service_role;


-- 3. TRIGGER PENGAMAN OTOMATIS: AUTO-FILL GUDANG_ID PADA KAS_LOG
-- Menjamin semua input kas_log dari mana pun (POS, script, dsb) selalu terisi gudang_id
CREATE OR REPLACE FUNCTION public.auto_fill_kas_log_gudang()
RETURNS TRIGGER AS $$
DECLARE
    v_resolved_gudang_id UUID;
BEGIN
    IF NEW.gudang_id IS NULL THEN
        -- 1. Cek referensi_id ke penjualan jika tipe JUAL
        IF NEW.referensi_id IS NOT NULL AND NEW.tipe = 'JUAL' THEN
            SELECT gudang_id INTO v_resolved_gudang_id FROM public.penjualan WHERE id = NEW.referensi_id;
            IF v_resolved_gudang_id IS NOT NULL THEN
                NEW.gudang_id := v_resolved_gudang_id;
                RETURN NEW;
            END IF;
        END IF;

        -- 2. Cek referensi_id ke penjualan_return jika tipe RETURN
        IF NEW.referensi_id IS NOT NULL AND NEW.tipe = 'RETURN' THEN
            SELECT p.gudang_id INTO v_resolved_gudang_id
            FROM public.penjualan_return pr
            JOIN public.penjualan p ON pr.penjualan_id = p.id
            WHERE pr.id = NEW.referensi_id;

            IF v_resolved_gudang_id IS NOT NULL THEN
                NEW.gudang_id := v_resolved_gudang_id;
                RETURN NEW;
            END IF;
        END IF;

        -- 3. Cek shift aktif / terakhir dari kasir (untuk SETOR, TARIK, TUTUP_SHIFT)
        IF NEW.created_by IS NOT NULL THEN
            SELECT gudang_id INTO v_resolved_gudang_id
            FROM public.shift_sessions
            WHERE kasir_id = NEW.created_by
            ORDER BY start_time DESC
            LIMIT 1;

            IF v_resolved_gudang_id IS NOT NULL THEN
                NEW.gudang_id := v_resolved_gudang_id;
                RETURN NEW;
            END IF;
        END IF;

        -- 4. Fallback ke default gudang
        SELECT id INTO v_resolved_gudang_id FROM public.gudang WHERE is_default = true LIMIT 1;
        IF v_resolved_gudang_id IS NULL THEN
            SELECT id INTO v_resolved_gudang_id FROM public.gudang ORDER BY created_at ASC LIMIT 1;
        END IF;
        NEW.gudang_id := v_resolved_gudang_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_auto_fill_kas_log_gudang ON public.kas_log;
CREATE TRIGGER trg_auto_fill_kas_log_gudang
    BEFORE INSERT ON public.kas_log
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_fill_kas_log_gudang();


-- 4. TRIGGER: PENGELUARAN OPERASIONAL CASH -> ARUS KAS (kas_log)
-- Otomatis mencatat pengeluaran kas operasional toko/gudang ke kas_log
CREATE OR REPLACE FUNCTION public.sync_operasional_to_kas_log()
RETURNS TRIGGER AS $$
DECLARE
    v_gudang_id UUID;
    v_catatan TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF UPPER(COALESCE(NEW.metode_pembayaran, 'CASH')) = 'CASH' THEN
            v_gudang_id := NEW.gudang_id;
            IF v_gudang_id IS NULL THEN
                SELECT id INTO v_gudang_id FROM public.gudang WHERE is_default = true LIMIT 1;
            END IF;
            v_catatan := 'Operasional [' || NEW.kategori || ']: ' || COALESCE(NEW.keterangan, '');

            INSERT INTO public.kas_log (
                id, tipe, jumlah, payment_method, referensi_id, catatan, created_by, created_at, gudang_id
            ) VALUES (
                gen_random_uuid(), 'TARIK', NEW.nominal, 'CASH', NEW.id, v_catatan, NEW.created_by, NEW.created_at, v_gudang_id
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        v_gudang_id := NEW.gudang_id;
        IF v_gudang_id IS NULL THEN
            SELECT id INTO v_gudang_id FROM public.gudang WHERE is_default = true LIMIT 1;
        END IF;
        v_catatan := 'Operasional [' || NEW.kategori || ']: ' || COALESCE(NEW.keterangan, '');

        IF UPPER(COALESCE(NEW.metode_pembayaran, 'CASH')) = 'CASH' THEN
            IF EXISTS (SELECT 1 FROM public.kas_log WHERE referensi_id = NEW.id AND tipe = 'TARIK') THEN
                UPDATE public.kas_log
                SET jumlah = NEW.nominal,
                    catatan = v_catatan,
                    gudang_id = v_gudang_id,
                    created_by = NEW.created_by
                WHERE referensi_id = NEW.id AND tipe = 'TARIK';
            ELSE
                INSERT INTO public.kas_log (
                    id, tipe, jumlah, payment_method, referensi_id, catatan, created_by, created_at, gudang_id
                ) VALUES (
                    gen_random_uuid(), 'TARIK', NEW.nominal, 'CASH', NEW.id, v_catatan, NEW.created_by, NEW.created_at, v_gudang_id
                );
            END IF;
        ELSE
            -- Jika metode pembayaran diubah dari CASH menjadi transfer/non-tunai, hapus dari kas_log
            DELETE FROM public.kas_log WHERE referensi_id = NEW.id AND tipe = 'TARIK';
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.kas_log WHERE referensi_id = OLD.id AND tipe = 'TARIK';
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_operasional_to_kas_log ON public.pengeluaran_operasional;
CREATE TRIGGER trg_sync_operasional_to_kas_log
    AFTER INSERT OR UPDATE OR DELETE ON public.pengeluaran_operasional
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_operasional_to_kas_log();


-- 5. DATA BACKFILL HISTORIS
-- Memulihkan 246 data kas_log yang gudang_id-nya NULL

-- A. Sinkronkan dari penjualan (JUAL)
UPDATE public.kas_log k
SET gudang_id = p.gudang_id
FROM public.penjualan p
WHERE k.referensi_id = p.id 
  AND k.gudang_id IS NULL 
  AND p.gudang_id IS NOT NULL;

-- B. Sinkronkan dari retur penjualan (RETURN)
UPDATE public.kas_log k
SET gudang_id = p.gudang_id
FROM public.penjualan_return r
JOIN public.penjualan p ON r.penjualan_id = p.id
WHERE k.referensi_id = r.id 
  AND k.tipe = 'RETURN' 
  AND k.gudang_id IS NULL 
  AND p.gudang_id IS NOT NULL;

-- C. Sinkronkan kasir SETOR / TARIK / TUTUP_SHIFT berdasarkan shift_sessions kasir
UPDATE public.kas_log k
SET gudang_id = s.gudang_id
FROM (
    SELECT DISTINCT ON (kasir_id) kasir_id, gudang_id
    FROM public.shift_sessions
    WHERE gudang_id IS NOT NULL
    ORDER BY kasir_id, start_time DESC
) s
WHERE k.created_by = s.kasir_id 
  AND k.gudang_id IS NULL;

-- D. Fallback sisanya ke default gudang jika masih ada yang NULL
DO $$
DECLARE
    v_def_id UUID;
BEGIN
    SELECT id INTO v_def_id FROM public.gudang WHERE is_default = true LIMIT 1;
    IF v_def_id IS NULL THEN
        SELECT id INTO v_def_id FROM public.gudang ORDER BY created_at ASC LIMIT 1;
    END IF;
    
    IF v_def_id IS NOT NULL THEN
        UPDATE public.kas_log
        SET gudang_id = v_def_id
        WHERE gudang_id IS NULL;
    END IF;
END $$;
