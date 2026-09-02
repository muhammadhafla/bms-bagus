-- Migration: Fix penjualan shift_id foreign key constraint and pay_transaction safe resolution
-- Description: Ensures pay_transaction does not fail when shift_id is not yet synced in shift_sessions,
--              by creating a stub shift_session record if missing or safely setting shift_id to NULL.

-- 1. Update foreign key constraint on penjualan.shift_id to ON DELETE SET NULL
ALTER TABLE public.penjualan
  DROP CONSTRAINT IF EXISTS penjualan_shift_id_fkey;

ALTER TABLE public.penjualan
  ADD CONSTRAINT penjualan_shift_id_fkey 
  FOREIGN KEY (shift_id) REFERENCES public.shift_sessions(id) 
  ON DELETE SET NULL;

-- 2. Update pay_transaction function with safe shift_id resolution and auto-stub creation
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
                    COALESCE((SELECT full_name FROM public.profiles WHERE id = p_created_by), 'Kasir'),
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
