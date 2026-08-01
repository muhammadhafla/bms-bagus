-- Update pay_transaction to support membership gamification and member discount

CREATE OR REPLACE FUNCTION public.pay_transaction(
    p_idempotency_key UUID,
    p_items JSONB,
    p_payment_method TEXT,
    p_cash_amount NUMERIC,
    p_qris_amount NUMERIC,
    p_diskon_nominal NUMERIC,
    p_diskon_persen NUMERIC,
    p_catatan TEXT,
    p_created_by UUID,
    p_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    p_member_id UUID DEFAULT NULL,
    p_points_earned NUMERIC DEFAULT 0,
    p_points_redeemed NUMERIC DEFAULT 0,
    p_discount_member_amount NUMERIC DEFAULT 0,
    p_receipt_sent_via_wa BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
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
        idempotency_key, created_at, member_id, points_earned,
        points_redeemed, discount_member_amount, receipt_sent_via_wa
    )
    VALUES (
        v_penjualan_id, 0, 'paid', p_created_at, p_created_at::DATE, p_payment_method,
        p_diskon_nominal, p_diskon_persen, 0,
        p_cash_amount, p_qris_amount, 0, p_created_by, 
        p_idempotency_key, p_created_at, p_member_id, COALESCE(p_points_earned,0),
        COALESCE(p_points_redeemed,0), COALESCE(p_discount_member_amount,0), COALESCE(p_receipt_sent_via_wa, false)
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
    
    -- Calculate total after global discount and member discount
    v_total := v_subtotal - p_diskon_nominal - COALESCE(p_discount_member_amount, 0);
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
    
    -- Member gamification / points
    IF p_member_id IS NOT NULL THEN
        UPDATE public.members
        SET points = points + COALESCE(p_points_earned, 0) - COALESCE(p_points_redeemed, 0),
            updated_at = NOW()
        WHERE id = p_member_id;
    END IF;
    
    RETURN v_penjualan_id;
END;
$$ LANGUAGE plpgsql;
