-- ==========================================================
-- Migration: 20260901100000_sync_finance_with_warehouse.sql
-- Description: Sinkronisasi Menyeluruh Modul Keuangan & Multi-Gudang
--              (Buku Besar, Arus Kas, Pengeluaran Operasional, Valuasi Stok)
-- ==========================================================

-- 1. ENUM UPDATES
ALTER TYPE public.ledger_sumber ADD VALUE IF NOT EXISTS 'BEBAN_SUSUT_GUDANG';

-- 2. SCHEMA ALTERATIONS
-- 2.1 Tambah gudang_id ke kas_log
ALTER TABLE public.kas_log 
  ADD COLUMN IF NOT EXISTS gudang_id UUID REFERENCES public.gudang(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_kas_log_gudang_id ON public.kas_log(gudang_id);

-- 2.2 Tambah gudang_id ke pengeluaran_operasional
ALTER TABLE public.pengeluaran_operasional 
  ADD COLUMN IF NOT EXISTS gudang_id UUID REFERENCES public.gudang(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pengeluaran_operasional_gudang_id ON public.pengeluaran_operasional(gudang_id);

-- 2.3 Tambah gudang_id ke buku_besar
ALTER TABLE public.buku_besar 
  ADD COLUMN IF NOT EXISTS gudang_id UUID REFERENCES public.gudang(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_buku_besar_gudang_id ON public.buku_besar(gudang_id);

-- 3. DATA BACKFILL KE GUDANG UTAMA / PUSAT (BASELINE DATA)
DO $$
DECLARE
    v_def_gudang_id UUID;
BEGIN
    SELECT id INTO v_def_gudang_id FROM public.gudang WHERE is_default = true LIMIT 1;
    IF v_def_gudang_id IS NOT NULL THEN
        UPDATE public.kas_log SET gudang_id = v_def_gudang_id WHERE gudang_id IS NULL;
        UPDATE public.pengeluaran_operasional SET gudang_id = v_def_gudang_id WHERE gudang_id IS NULL;
        UPDATE public.buku_besar SET gudang_id = v_def_gudang_id WHERE gudang_id IS NULL;
    END IF;
END $$;

-- 4. TRIGGERS: PENGELUARAN OPERASIONAL -> BUKU BESAR
CREATE OR REPLACE FUNCTION public.trigger_insert_operasional_to_ledger()
RETURNS TRIGGER AS $$
DECLARE
    v_gudang_id UUID;
BEGIN
    v_gudang_id := NEW.gudang_id;
    IF v_gudang_id IS NULL THEN
        SELECT id INTO v_gudang_id FROM public.gudang WHERE is_default = true LIMIT 1;
    END IF;

    INSERT INTO public.buku_besar (
        tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by, gudang_id
    ) VALUES (
        NEW.tanggal, 'PENGELUARAN', 'BIAYA_OPERASIONAL', NEW.id, 
        'Biaya Operasional (' || NEW.kategori || '): ' || COALESCE(NEW.keterangan, ''), 
        NEW.nominal, NEW.created_by, v_gudang_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.trigger_update_operasional_to_ledger()
RETURNS TRIGGER AS $$
DECLARE
    v_gudang_id UUID;
BEGIN
    v_gudang_id := NEW.gudang_id;
    IF v_gudang_id IS NULL THEN
        SELECT id INTO v_gudang_id FROM public.gudang WHERE is_default = true LIMIT 1;
    END IF;

    UPDATE public.buku_besar
    SET tanggal = NEW.tanggal,
        nominal = NEW.nominal,
        keterangan = 'Biaya Operasional (' || NEW.kategori || '): ' || COALESCE(NEW.keterangan, ''),
        created_by = NEW.created_by,
        gudang_id = v_gudang_id
    WHERE referensi_id = NEW.id AND sumber = 'BIAYA_OPERASIONAL';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. FUNCTION: TUTUP SHIFT KASIR -> BUKU BESAR
CREATE OR REPLACE FUNCTION public.record_shift_to_ledger(p_shift_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_penjualan NUMERIC;
    v_total_pengeluaran NUMERIC;
    v_total_retur NUMERIC;
    v_shift_record RECORD;
    v_shift_date DATE;
    v_kasir_name TEXT;
    v_gudang_id UUID;
    v_gudang_name TEXT;
    v_outlet_suffix TEXT := '';
BEGIN
    -- Ambil info shift
    SELECT * INTO v_shift_record FROM public.shift_sessions WHERE id = p_shift_id;
    IF v_shift_record IS NULL THEN
        RETURN;
    END IF;

    -- Tentukan tanggal shift dalam zona waktu WIB (Asia/Jakarta)
    v_shift_date := (COALESCE(v_shift_record.end_time, v_shift_record.start_time, NOW()) AT TIME ZONE 'Asia/Jakarta')::DATE;

    -- Ambil nama kasir
    v_kasir_name := COALESCE(v_shift_record.kasir_name, 'Kasir');
    IF v_kasir_name = 'Kasir' OR v_kasir_name IS NULL THEN
        SELECT COALESCE(nama, 'Kasir') INTO v_kasir_name 
        FROM public.profiles 
        WHERE id = v_shift_record.kasir_id;
    END IF;

    -- Ambil gudang / outlet
    v_gudang_id := v_shift_record.gudang_id;
    IF v_gudang_id IS NULL THEN
        SELECT id INTO v_gudang_id FROM public.gudang WHERE is_default = true LIMIT 1;
    END IF;

    IF v_gudang_id IS NOT NULL THEN
        SELECT nama INTO v_gudang_name FROM public.gudang WHERE id = v_gudang_id;
        IF v_gudang_name IS NOT NULL THEN
            v_outlet_suffix := ' - ' || v_gudang_name;
        END IF;
    END IF;

    -- A. Hitung total penjualan kotor
    SELECT COALESCE(SUM(total), 0) INTO v_total_penjualan
    FROM public.penjualan
    WHERE created_by = v_shift_record.kasir_id
      AND created_at >= v_shift_record.start_time
      AND created_at <= COALESCE(v_shift_record.end_time, NOW())
      AND status IN ('paid', 'LUNAS');

    -- B. Hitung total operasional kasir (TARIK)
    SELECT COALESCE(SUM(jumlah), 0) INTO v_total_pengeluaran
    FROM public.kas_log
    WHERE created_by = v_shift_record.kasir_id
      AND created_at >= v_shift_record.start_time
      AND created_at <= COALESCE(v_shift_record.end_time, NOW())
      AND tipe = 'TARIK';

    -- C. Hitung total retur kasir (RETURN)
    SELECT COALESCE(SUM(jumlah), 0) INTO v_total_retur
    FROM public.kas_log
    WHERE (created_by = v_shift_record.kasir_id OR created_by IS NULL)
      AND created_at >= v_shift_record.start_time
      AND created_at <= COALESCE(v_shift_record.end_time, NOW())
      AND tipe = 'RETURN';

    -- Idempotensi: Bersihkan entri lama jika shift ini sudah pernah dicatat sebelumnya
    DELETE FROM public.buku_besar 
    WHERE referensi_id = p_shift_id 
      AND sumber IN ('PENJUALAN_SHIFT', 'BIAYA_OPERASIONAL', 'RETUR_PENJUALAN');

    -- 1. Catat ke buku_besar: Pemasukan Penjualan Kotor
    IF v_total_penjualan > 0 THEN
        INSERT INTO public.buku_besar (
            tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by, gudang_id
        ) VALUES (
            v_shift_date, 'PEMASUKAN', 'PENJUALAN_SHIFT', p_shift_id,
            'Pendapatan Penjualan (Shift Kasir: ' || v_kasir_name || v_outlet_suffix || ')',
            v_total_penjualan, v_shift_record.kasir_id, v_gudang_id
        );
    END IF;

    -- 2. Catat ke buku_besar: Pengeluaran Operasional Kasir
    IF v_total_pengeluaran > 0 THEN
        INSERT INTO public.buku_besar (
            tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by, gudang_id
        ) VALUES (
            v_shift_date, 'PENGELUARAN', 'BIAYA_OPERASIONAL', p_shift_id,
            'Pengeluaran Operasional (Shift Kasir: ' || v_kasir_name || v_outlet_suffix || ')',
            v_total_pengeluaran, v_shift_record.kasir_id, v_gudang_id
        );
    END IF;

    -- 3. Catat ke buku_besar: Retur Penjualan
    IF v_total_retur > 0 THEN
        INSERT INTO public.buku_besar (
            tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by, gudang_id
        ) VALUES (
            v_shift_date, 'PENGELUARAN', 'RETUR_PENJUALAN', p_shift_id,
            'Retur Penjualan (Shift Kasir: ' || v_kasir_name || v_outlet_suffix || ')',
            v_total_retur, v_shift_record.kasir_id, v_gudang_id
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. TRIGGER: PEMBELIAN STOK TERPUSAT -> BUKU BESAR
CREATE OR REPLACE FUNCTION public.trigger_sync_pembelian_to_ledger()
RETURNS TRIGGER AS $$
DECLARE
    v_nominal NUMERIC;
    v_ket TEXT;
    v_gudang_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_nominal := COALESCE(NEW.total_supplier, NEW.total_sistem, 0);
        v_gudang_id := NEW.gudang_id;
        IF v_gudang_id IS NULL THEN
            SELECT id INTO v_gudang_id FROM public.gudang WHERE is_default = true LIMIT 1;
        END IF;

        IF v_nominal > 0 THEN
            v_ket := 'Pembelian Stok: ' || COALESCE(NEW.supplier_nama, 'Supplier') || 
                     CASE WHEN NEW.nomor_nota IS NOT NULL AND NEW.nomor_nota <> '' 
                          THEN ' (Nota: ' || NEW.nomor_nota || ')' 
                          ELSE '' 
                     END;
            INSERT INTO public.buku_besar (
                tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by, gudang_id
            ) VALUES (
                NEW.tanggal, 'PENGELUARAN', 'PEMBELIAN_STOK', NEW.id, v_ket, v_nominal, NEW.created_by, v_gudang_id
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        v_nominal := COALESCE(NEW.total_supplier, NEW.total_sistem, 0);
        v_gudang_id := NEW.gudang_id;
        IF v_gudang_id IS NULL THEN
            SELECT id INTO v_gudang_id FROM public.gudang WHERE is_default = true LIMIT 1;
        END IF;

        v_ket := 'Pembelian Stok: ' || COALESCE(NEW.supplier_nama, 'Supplier') || 
                 CASE WHEN NEW.nomor_nota IS NOT NULL AND NEW.nomor_nota <> '' 
                      THEN ' (Nota: ' || NEW.nomor_nota || ')' 
                      ELSE '' 
                 END;
        
        IF EXISTS (SELECT 1 FROM public.buku_besar WHERE referensi_id = NEW.id AND sumber = 'PEMBELIAN_STOK') THEN
            IF v_nominal > 0 THEN
                UPDATE public.buku_besar
                SET tanggal = NEW.tanggal,
                    nominal = v_nominal,
                    keterangan = v_ket,
                    created_by = NEW.created_by,
                    gudang_id = v_gudang_id
                WHERE referensi_id = NEW.id AND sumber = 'PEMBELIAN_STOK';
            ELSE
                DELETE FROM public.buku_besar
                WHERE referensi_id = NEW.id AND sumber = 'PEMBELIAN_STOK';
            END IF;
        ELSIF v_nominal > 0 THEN
            INSERT INTO public.buku_besar (
                tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by, gudang_id
            ) VALUES (
                NEW.tanggal, 'PENGELUARAN', 'PEMBELIAN_STOK', NEW.id, v_ket, v_nominal, NEW.created_by, v_gudang_id
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.buku_besar
        WHERE referensi_id = OLD.id AND sumber = 'PEMBELIAN_STOK';
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. RPC: EXECUTE PENGELUARAN GUDANG (OTOMATIS CATAT BEBAN KE BUKU BESAR)
CREATE OR REPLACE FUNCTION rpc.execute_pengeluaran_gudang(
    p_gudang_id UUID,
    p_tipe tipe_pengeluaran_gudang,
    p_catatan TEXT,
    p_items JSONB, -- Array of { inventory_id: UUID, qty: INT, harga_pokok?: NUMERIC, alasan?: TEXT }
    p_user UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, rpc
AS $$
DECLARE
    v_pengeluaran_id UUID;
    v_nomor TEXT;
    v_item JSONB;
    v_inv_id UUID;
    v_qty INT;
    v_hpp NUMERIC;
    v_alasan TEXT;
    v_current_stock INT;
    v_total_nominal NUMERIC := 0;
    v_gudang_nama TEXT;
BEGIN
    v_nomor := public.generate_nomor_pengeluaran_gudang();
    
    SELECT nama INTO v_gudang_nama FROM public.gudang WHERE id = p_gudang_id;

    INSERT INTO public.pengeluaran_gudang (
        nomor_dokumen,
        gudang_id,
        tipe,
        catatan,
        created_by,
        tanggal
    ) VALUES (
        v_nomor,
        p_gudang_id,
        p_tipe,
        p_catatan,
        p_user,
        CURRENT_DATE
    ) RETURNING id INTO v_pengeluaran_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_inv_id := (v_item->>'inventory_id')::UUID;
        v_qty := (v_item->>'qty')::INT;
        v_hpp := COALESCE((v_item->>'harga_pokok')::NUMERIC, 0);
        v_alasan := v_item->>'alasan';

        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'Qty pengeluaran harus > 0 untuk item %', v_inv_id;
        END IF;

        -- Validasi stok gudang
        SELECT stok INTO v_current_stock
        FROM public.inventory_stocks
        WHERE inventory_id = v_inv_id AND gudang_id = p_gudang_id;

        IF v_current_stock IS NULL OR v_current_stock < v_qty THEN
            RAISE EXCEPTION 'Stok di gudang tidak mencukupi untuk item %. Tersedia: %, Dikeluarkan: %',
                v_inv_id, COALESCE(v_current_stock, 0), v_qty;
        END IF;

        -- Kurangi stok gudang
        UPDATE public.inventory_stocks
        SET stok = stok - v_qty,
            updated_at = now()
        WHERE inventory_id = v_inv_id AND gudang_id = p_gudang_id;

        -- Insert item pengeluaran
        INSERT INTO public.pengeluaran_gudang_items (
            pengeluaran_id,
            inventory_id,
            qty,
            harga_pokok,
            alasan
        ) VALUES (
            v_pengeluaran_id,
            v_inv_id,
            v_qty,
            v_hpp,
            v_alasan
        );

        -- Log stock movements
        INSERT INTO public.stock_movements (
            inventory_id,
            tipe,
            qty,
            referensi,
            gudang_id,
            created_at
        ) VALUES (
            v_inv_id,
            'PENGELUARAN_' || p_tipe::TEXT,
            -v_qty,
            'Pengeluaran ' || p_tipe::TEXT || ': ' || v_nomor,
            p_gudang_id,
            now()
        );

        v_total_nominal := v_total_nominal + (v_qty * v_hpp);
    END LOOP;

    -- Catat otomatis ke buku_besar sebagai beban susut/pengeluaran gudang jika ada nilai HPP
    IF v_total_nominal > 0 THEN
        INSERT INTO public.buku_besar (
            tanggal,
            tipe_transaksi,
            sumber,
            referensi_id,
            keterangan,
            nominal,
            created_by,
            gudang_id
        ) VALUES (
            CURRENT_DATE,
            'PENGELUARAN',
            'BEBAN_SUSUT_GUDANG',
            v_pengeluaran_id,
            'Beban Susut Gudang (' || p_tipe::TEXT || ': ' || v_nomor || COALESCE(' - ' || v_gudang_nama, '') || ')',
            v_total_nominal,
            p_user,
            p_gudang_id
        );
    END IF;

    RETURN v_pengeluaran_id;
END;
$$;

-- 8. RPC: GET LEDGER OPENING BALANCE (SUPPORT MULTI-GUDANG)
CREATE OR REPLACE FUNCTION public.get_ledger_opening_balance(
    p_start_date DATE,
    p_gudang_id UUID DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
    v_pemasukan NUMERIC;
    v_pengeluaran NUMERIC;
BEGIN
    IF p_start_date IS NULL THEN
        RETURN 0;
    END IF;

    SELECT 
        COALESCE(SUM(CASE WHEN tipe_transaksi = 'PEMASUKAN' THEN nominal ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipe_transaksi = 'PENGELUARAN' THEN nominal ELSE 0 END), 0)
    INTO 
        v_pemasukan, 
        v_pengeluaran
    FROM public.buku_besar
    WHERE tanggal < p_start_date
      AND (p_gudang_id IS NULL OR gudang_id = p_gudang_id);

    RETURN v_pemasukan - v_pengeluaran;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_ledger_opening_balance(DATE, UUID) TO authenticated;

-- 9. RPC: GET INVENTORY SUMMARY (SUPPORT MULTI-GUDANG)
CREATE OR REPLACE FUNCTION public.get_inventory_summary(
    p_gudang_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_items BIGINT,
  total_stok BIGINT,
  total_value NUMERIC
) AS $$
BEGIN
  IF p_gudang_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      COUNT(DISTINCT s.inventory_id)::BIGINT as total_items,
      COALESCE(SUM(s.stok), 0)::BIGINT as total_stok,
      COALESCE(SUM(s.stok * COALESCE(i.harga_beli_terakhir, 0)), 0)::NUMERIC as total_value
    FROM public.inventory_stocks s
    JOIN public.inventory i ON s.inventory_id = i.id
    WHERE s.gudang_id = p_gudang_id
      AND i.is_discontinued = false;
  ELSE
    RETURN QUERY
    SELECT 
      COUNT(*)::BIGINT as total_items,
      COALESCE(SUM(stok), 0)::BIGINT as total_stok,
      COALESCE(SUM(stok * COALESCE(harga_beli_terakhir, 0)), 0)::NUMERIC as total_value
    FROM public.inventory
    WHERE is_discontinued = false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'pg_temp';

GRANT EXECUTE ON FUNCTION public.get_inventory_summary(UUID) TO authenticated;
