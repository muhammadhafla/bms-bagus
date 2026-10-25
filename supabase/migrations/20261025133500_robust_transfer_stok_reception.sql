-- Migration: 20261025133500_robust_transfer_stok_reception.sql
-- Description: Improve terima_transfer_stok & kirim_transfer_stok to handle flexible item ID matching, null caller fallback, and default parameter values.

CREATE OR REPLACE FUNCTION public.kirim_transfer_stok(
    p_transfer_id UUID,
    p_user UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller UUID;
    v_transfer RECORD;
    v_item RECORD;
    v_current_stock INT;
    v_user_gudang UUID;
BEGIN
    v_caller := COALESCE(auth.uid(), p_user);

    SELECT * INTO v_transfer
    FROM public.transfer_stok
    WHERE id = p_transfer_id
    FOR UPDATE;

    IF v_transfer IS NULL THEN
        RAISE EXCEPTION 'Dokumen transfer tidak ditemukan';
    END IF;

    IF v_caller IS NULL THEN
        v_caller := v_transfer.created_by;
    END IF;

    IF v_transfer.status NOT IN ('DRAFT', 'REQUESTED', 'APPROVED') THEN
        RAISE EXCEPTION 'Transfer tidak dapat dikirim karena status saat ini: %', v_transfer.status;
    END IF;

    v_user_gudang := public.get_auth_user_default_gudang();
    IF NOT public.is_admin() AND v_user_gudang IS NOT NULL AND v_transfer.gudang_asal_id != v_user_gudang THEN
        RAISE EXCEPTION 'Otoritas Ditolak: Hanya staf dari gudang asal atau Administrator yang dapat mengirim barang.';
    END IF;

    FOR v_item IN SELECT * FROM public.transfer_stok_items WHERE transfer_id = p_transfer_id
    LOOP
        SELECT stok INTO v_current_stock
        FROM public.inventory_stocks
        WHERE inventory_id = v_item.inventory_id AND gudang_id = v_transfer.gudang_asal_id
        FOR UPDATE;

        IF v_current_stock IS NULL OR v_current_stock < v_item.qty_kirim THEN
            RAISE EXCEPTION 'Stok tidak mencukupi untuk item % di gudang asal. Tersedia: %, Diminta: %', 
                v_item.inventory_id, COALESCE(v_current_stock, 0), v_item.qty_kirim;
        END IF;

        IF v_item.qty_kirim <= 0 THEN
            RAISE EXCEPTION 'Kuantitas kirim harus lebih besar dari 0 untuk item %', v_item.inventory_id;
        END IF;

        UPDATE public.inventory_stocks
        SET stok = stok - v_item.qty_kirim,
            updated_at = now()
        WHERE inventory_id = v_item.inventory_id AND gudang_id = v_transfer.gudang_asal_id;

        INSERT INTO public.stock_movements (
            inventory_id,
            tipe,
            qty,
            referensi,
            gudang_id,
            gudang_tujuan_id,
            created_at
        ) VALUES (
            v_item.inventory_id,
            'OUT',
            v_item.qty_kirim,
            'Transfer keluar: ' || v_transfer.nomor_transfer,
            v_transfer.gudang_asal_id,
            v_transfer.gudang_tujuan_id,
            now()
        );
    END LOOP;

    UPDATE public.transfer_stok
    SET status = 'IN_TRANSIT',
        approved_by = v_caller,
        tanggal_kirim = now(),
        updated_at = now()
    WHERE id = p_transfer_id;

    RETURN jsonb_build_object('success', true, 'status', 'IN_TRANSIT');
END;
$$;

CREATE OR REPLACE FUNCTION public.terima_transfer_stok(
    p_transfer_id UUID,
    p_items JSONB,
    p_user UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller UUID;
    v_transfer RECORD;
    v_item JSONB;
    v_inv_id UUID;
    v_real_inv_id UUID;
    v_qty_kirim INT;
    v_qty_terima INT;
    v_selisih INT;
    v_catatan TEXT;
    v_user_gudang UUID;
BEGIN
    v_caller := COALESCE(auth.uid(), p_user);

    SELECT * INTO v_transfer
    FROM public.transfer_stok
    WHERE id = p_transfer_id
    FOR UPDATE;

    IF v_transfer IS NULL THEN
        RAISE EXCEPTION 'Dokumen transfer tidak ditemukan';
    END IF;

    IF v_caller IS NULL THEN
        v_caller := v_transfer.created_by;
    END IF;

    IF v_transfer.status <> 'IN_TRANSIT' THEN
        RAISE EXCEPTION 'Transfer hanya dapat diterima saat berstatus IN_TRANSIT. Status saat ini: %', v_transfer.status;
    END IF;

    v_user_gudang := public.get_auth_user_default_gudang();
    IF NOT public.is_admin() AND v_user_gudang IS NOT NULL AND v_transfer.gudang_tujuan_id != v_user_gudang THEN
        RAISE EXCEPTION 'Otoritas Ditolak: Hanya staf dari cabang tujuan atau Administrator yang dapat mengonfirmasi penerimaan fisik.';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_inv_id := NULLIF(v_item->>'inventory_id', '')::UUID;
        v_qty_terima := (v_item->>'qty_terima')::INT;
        v_catatan := v_item->>'catatan';

        IF v_qty_terima IS NULL OR v_qty_terima < 0 THEN
            RAISE EXCEPTION 'Qty terima tidak boleh negatif';
        END IF;

        -- Cari item berdasarkan inventory_id atau id baris transfer_stok_items
        SELECT qty_kirim, inventory_id INTO v_qty_kirim, v_real_inv_id
        FROM public.transfer_stok_items
        WHERE transfer_id = p_transfer_id 
          AND (
            (v_inv_id IS NOT NULL AND inventory_id = v_inv_id)
            OR (v_inv_id IS NOT NULL AND id = v_inv_id)
          )
        LIMIT 1;

        -- Jika tidak ditemukan dengan v_inv_id, coba cocokkan fallback jika p_items punya 1 elemen dan transfer punya 1 item
        IF v_qty_kirim IS NULL AND jsonb_array_length(p_items) = 1 THEN
            SELECT qty_kirim, inventory_id INTO v_qty_kirim, v_real_inv_id
            FROM public.transfer_stok_items
            WHERE transfer_id = p_transfer_id
            LIMIT 1;
        END IF;

        IF v_qty_kirim IS NULL THEN
            RAISE EXCEPTION 'Item % tidak ditemukan pada dokumen transfer ini', COALESCE(v_inv_id::TEXT, 'unknown');
        END IF;

        IF v_qty_terima > v_qty_kirim THEN
            RAISE EXCEPTION 'Qty terima (%) tidak boleh melebihi qty kirim (%) untuk item %', v_qty_terima, v_qty_kirim, v_real_inv_id;
        END IF;

        UPDATE public.transfer_stok_items
        SET qty_terima = v_qty_terima,
            catatan = COALESCE(NULLIF(v_catatan, ''), catatan)
        WHERE transfer_id = p_transfer_id AND inventory_id = v_real_inv_id;

        IF v_qty_terima > 0 THEN
            INSERT INTO public.inventory_stocks (inventory_id, gudang_id, stok, updated_at)
            VALUES (v_real_inv_id, v_transfer.gudang_tujuan_id, v_qty_terima, now())
            ON CONFLICT (inventory_id, gudang_id)
            DO UPDATE SET stok = public.inventory_stocks.stok + v_qty_terima,
                          updated_at = now();

            INSERT INTO public.stock_movements (
                inventory_id,
                tipe,
                qty,
                referensi,
                gudang_id,
                gudang_tujuan_id,
                created_at
            ) VALUES (
                v_real_inv_id,
                'IN',
                v_qty_terima,
                'Transfer masuk: ' || v_transfer.nomor_transfer,
                v_transfer.gudang_tujuan_id,
                v_transfer.gudang_asal_id,
                now()
            );
        END IF;

        -- Catat selisih kurang (jika ada) ke stock_adjustments (Laporan Selisih)
        v_selisih := v_qty_kirim - v_qty_terima;
        IF v_selisih > 0 THEN
            INSERT INTO public.stock_adjustments (
                inventory_id,
                adjustment_qty,
                adjustment_type,
                reason,
                note,
                created_by
            ) VALUES (
                v_real_inv_id,
                v_selisih,
                'decrease',
                'Selisih Transfer Stok (' || v_transfer.nomor_transfer || ')',
                COALESCE(NULLIF(v_catatan, ''), 'Selisih kurang saat penerimaan transfer ' || v_transfer.nomor_transfer),
                v_caller
            );
        END IF;
    END LOOP;

    UPDATE public.transfer_stok
    SET status = 'RECEIVED',
        received_by = v_caller,
        tanggal_terima = now(),
        updated_at = now()
    WHERE id = p_transfer_id;

    RETURN jsonb_build_object('success', true, 'status', 'RECEIVED');
END;
$$;
