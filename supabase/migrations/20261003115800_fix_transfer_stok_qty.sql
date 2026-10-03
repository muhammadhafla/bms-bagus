-- Perbaiki fungsi kirim_transfer_stok dan terima_transfer_stok
-- karena sebelumnya salah memasukkan nilai negatif ke dalam field qty
-- dan salah menggunakan tipe 'TRANSFER_OUT' / 'TRANSFER_IN' yang melanggar CHECK constraint.

CREATE OR REPLACE FUNCTION public.kirim_transfer_stok(
    p_transfer_id UUID,
    p_user UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_transfer RECORD;
    v_item RECORD;
    v_current_stock INT;
BEGIN
    SELECT * INTO v_transfer
    FROM public.transfer_stok
    WHERE id = p_transfer_id;

    IF v_transfer IS NULL THEN
        RAISE EXCEPTION 'Dokumen transfer tidak ditemukan';
    END IF;

    IF v_transfer.status NOT IN ('DRAFT', 'REQUESTED', 'APPROVED') THEN
        RAISE EXCEPTION 'Transfer tidak dapat dikirim karena status saat ini: %', v_transfer.status;
    END IF;

    -- Validasi dan kurangi stok gudang asal
    FOR v_item IN SELECT * FROM public.transfer_stok_items WHERE transfer_id = p_transfer_id
    LOOP
        SELECT stok INTO v_current_stock
        FROM public.inventory_stocks
        WHERE inventory_id = v_item.inventory_id AND gudang_id = v_transfer.gudang_asal_id;

        IF v_current_stock IS NULL OR v_current_stock < v_item.qty_kirim THEN
            RAISE EXCEPTION 'Stok tidak mencukupi untuk item % di gudang asal. Tersedia: %, Diminta: %', 
                v_item.inventory_id, COALESCE(v_current_stock, 0), v_item.qty_kirim;
        END IF;

        IF v_item.qty_kirim <= 0 THEN
            RAISE EXCEPTION 'Kuantitas kirim harus lebih besar dari 0 untuk item %', v_item.inventory_id;
        END IF;

        -- Kurangi stok gudang asal
        UPDATE public.inventory_stocks
        SET stok = stok - v_item.qty_kirim,
            updated_at = now()
        WHERE inventory_id = v_item.inventory_id AND gudang_id = v_transfer.gudang_asal_id;

        -- Catat pergerakan stok
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

    -- Update status transfer
    UPDATE public.transfer_stok
    SET status = 'IN_TRANSIT',
        approved_by = p_user,
        tanggal_kirim = now(),
        updated_at = now()
    WHERE id = p_transfer_id;

    RETURN jsonb_build_object('success', true, 'status', 'IN_TRANSIT');
END;
$$;


CREATE OR REPLACE FUNCTION public.terima_transfer_stok(
    p_transfer_id UUID,
    p_items JSONB, -- Array of { inventory_id: UUID, qty_terima: INT, catatan?: TEXT }
    p_user UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_transfer RECORD;
    v_item JSONB;
    v_inv_id UUID;
    v_qty_terima INT;
    v_catatan TEXT;
BEGIN
    SELECT * INTO v_transfer
    FROM public.transfer_stok
    WHERE id = p_transfer_id;

    IF v_transfer IS NULL THEN
        RAISE EXCEPTION 'Dokumen transfer tidak ditemukan';
    END IF;

    IF v_transfer.status <> 'IN_TRANSIT' THEN
        RAISE EXCEPTION 'Transfer hanya dapat diterima saat berstatus IN_TRANSIT. Status saat ini: %', v_transfer.status;
    END IF;

    -- Proses penerimaan tiap item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_inv_id := (v_item->>'inventory_id')::UUID;
        v_qty_terima := (v_item->>'qty_terima')::INT;
        v_catatan := v_item->>'catatan';

        IF v_qty_terima IS NULL OR v_qty_terima <= 0 THEN
            RAISE EXCEPTION 'Qty terima harus lebih besar dari 0 untuk item %', v_inv_id;
        END IF;

        -- Update record item
        UPDATE public.transfer_stok_items
        SET qty_terima = v_qty_terima,
            catatan = COALESCE(v_catatan, catatan)
        WHERE transfer_id = p_transfer_id AND inventory_id = v_inv_id;

        -- Tambah stok di gudang tujuan (UPSERT)
        INSERT INTO public.inventory_stocks (inventory_id, gudang_id, stok, updated_at)
        VALUES (v_inv_id, v_transfer.gudang_tujuan_id, v_qty_terima, now())
        ON CONFLICT (inventory_id, gudang_id)
        DO UPDATE SET stok = public.inventory_stocks.stok + v_qty_terima,
                      updated_at = now();

        -- Catat pergerakan stok
        INSERT INTO public.stock_movements (
            inventory_id,
            tipe,
            qty,
            referensi,
            gudang_id,
            gudang_tujuan_id,
            created_at
        ) VALUES (
            v_inv_id,
            'IN',
            v_qty_terima,
            'Transfer masuk: ' || v_transfer.nomor_transfer,
            v_transfer.gudang_tujuan_id,
            v_transfer.gudang_asal_id,
            now()
        );
    END LOOP;

    -- Update status transfer
    UPDATE public.transfer_stok
    SET status = 'RECEIVED',
        received_by = p_user,
        tanggal_terima = now(),
        updated_at = now()
    WHERE id = p_transfer_id;

    RETURN jsonb_build_object('success', true, 'status', 'RECEIVED');
END;
$$;
