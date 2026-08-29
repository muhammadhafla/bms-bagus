-- ==========================================================
-- Migration: 20260830100000_add_warehouse_module.sql
-- Description: Modul Gudang & Multi-Outlet Management System
-- ==========================================================

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE tipe_gudang AS ENUM ('PUSAT', 'CABANG', 'RETUR', 'TRANSIT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_transfer AS ENUM ('DRAFT', 'REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'REJECTED', 'CANCELED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tipe_pengeluaran_gudang AS ENUM ('RUSAK', 'KADALUARSA', 'PEMAKAIAN_SENDIRI', 'SAMPEL_PROMOSI', 'SELISIH_HILANG', 'LAINNYA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABEL MASTER GUDANG
CREATE TABLE IF NOT EXISTS public.gudang (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_gudang TEXT NOT NULL UNIQUE,
    nama TEXT NOT NULL,
    tipe tipe_gudang NOT NULL DEFAULT 'PUSAT',
    alamat TEXT,
    penanggung_jawab TEXT,
    kontak_pj TEXT,
    lokasi_kerja_id UUID REFERENCES public.lokasi_kerja(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger auto-update updated_at pada gudang
DROP TRIGGER IF EXISTS handle_updated_at_gudang ON public.gudang;
CREATE TRIGGER handle_updated_at_gudang
  BEFORE UPDATE ON public.gudang
  FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime(updated_at);

-- 3. TABEL INVENTORY STOCKS (STOK PER GUDANG)
CREATE TABLE IF NOT EXISTS public.inventory_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
    gudang_id UUID NOT NULL REFERENCES public.gudang(id) ON DELETE RESTRICT,
    stok INT NOT NULL DEFAULT 0,
    min_stok INT DEFAULT 0,
    max_stok INT,
    rak_lokasi TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_inventory_gudang UNIQUE (inventory_id, gudang_id)
);

CREATE INDEX IF NOT EXISTS idx_inv_stocks_inventory_id ON public.inventory_stocks(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inv_stocks_gudang_id ON public.inventory_stocks(gudang_id);

DROP TRIGGER IF EXISTS handle_updated_at_inventory_stocks ON public.inventory_stocks;
CREATE TRIGGER handle_updated_at_inventory_stocks
  BEFORE UPDATE ON public.inventory_stocks
  FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime(updated_at);

-- 4. TABEL TRANSFER STOK
CREATE TABLE IF NOT EXISTS public.transfer_stok (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor_transfer TEXT NOT NULL UNIQUE,
    gudang_asal_id UUID NOT NULL REFERENCES public.gudang(id) ON DELETE RESTRICT,
    gudang_tujuan_id UUID NOT NULL REFERENCES public.gudang(id) ON DELETE RESTRICT,
    status status_transfer NOT NULL DEFAULT 'DRAFT',
    tanggal_kirim TIMESTAMPTZ,
    tanggal_terima TIMESTAMPTZ,
    kurir_pengirim TEXT,
    catatan TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    received_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_gudang_berbeda CHECK (gudang_asal_id <> gudang_tujuan_id)
);

CREATE INDEX IF NOT EXISTS idx_transfer_stok_asal ON public.transfer_stok(gudang_asal_id);
CREATE INDEX IF NOT EXISTS idx_transfer_stok_tujuan ON public.transfer_stok(gudang_tujuan_id);
CREATE INDEX IF NOT EXISTS idx_transfer_stok_status ON public.transfer_stok(status);

DROP TRIGGER IF EXISTS handle_updated_at_transfer_stok ON public.transfer_stok;
CREATE TRIGGER handle_updated_at_transfer_stok
  BEFORE UPDATE ON public.transfer_stok
  FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime(updated_at);

-- 5. TABEL TRANSFER STOK ITEMS
CREATE TABLE IF NOT EXISTS public.transfer_stok_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES public.transfer_stok(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE RESTRICT,
    qty_kirim INT NOT NULL CHECK (qty_kirim > 0),
    qty_terima INT DEFAULT 0 CHECK (qty_terima >= 0),
    catatan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_transfer_item UNIQUE (transfer_id, inventory_id)
);

CREATE INDEX IF NOT EXISTS idx_transfer_items_transfer ON public.transfer_stok_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_inventory ON public.transfer_stok_items(inventory_id);

-- 6. TABEL PENGELUARAN GUDANG (SCRAP / RUSAK / KADALUARSA)
CREATE TABLE IF NOT EXISTS public.pengeluaran_gudang (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor_dokumen TEXT NOT NULL UNIQUE,
    gudang_id UUID NOT NULL REFERENCES public.gudang(id) ON DELETE RESTRICT,
    tipe tipe_pengeluaran_gudang NOT NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    catatan TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pengeluaran_gudang_gudang ON public.pengeluaran_gudang(gudang_id);

DROP TRIGGER IF EXISTS handle_updated_at_pengeluaran_gudang ON public.pengeluaran_gudang;
CREATE TRIGGER handle_updated_at_pengeluaran_gudang
  BEFORE UPDATE ON public.pengeluaran_gudang
  FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime(updated_at);

-- 7. TABEL PENGELUARAN GUDANG ITEMS
CREATE TABLE IF NOT EXISTS public.pengeluaran_gudang_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pengeluaran_id UUID NOT NULL REFERENCES public.pengeluaran_gudang(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE RESTRICT,
    qty INT NOT NULL CHECK (qty > 0),
    harga_pokok NUMERIC NOT NULL DEFAULT 0,
    alasan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_pengeluaran_item UNIQUE (pengeluaran_id, inventory_id)
);

CREATE INDEX IF NOT EXISTS idx_pengeluaran_items_id ON public.pengeluaran_gudang_items(pengeluaran_id);

-- 8. EXTEND EXISTING TABLES
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS gudang_id UUID REFERENCES public.gudang(id) ON DELETE SET NULL;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS gudang_tujuan_id UUID REFERENCES public.gudang(id) ON DELETE SET NULL;
ALTER TABLE public.shift_sessions ADD COLUMN IF NOT EXISTS gudang_id UUID REFERENCES public.gudang(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_movements_gudang_id ON public.stock_movements(gudang_id);

-- 9. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.gudang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_stok ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_stok_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengeluaran_gudang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengeluaran_gudang_items ENABLE ROW LEVEL SECURITY;

-- Policies for gudang
DROP POLICY IF EXISTS "gudang_select" ON public.gudang;
CREATE POLICY "gudang_select" ON public.gudang FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "gudang_admin_all" ON public.gudang;
CREATE POLICY "gudang_admin_all" ON public.gudang FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Policies for inventory_stocks
DROP POLICY IF EXISTS "inv_stocks_select" ON public.inventory_stocks;
CREATE POLICY "inv_stocks_select" ON public.inventory_stocks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "inv_stocks_auth_insert" ON public.inventory_stocks;
CREATE POLICY "inv_stocks_auth_insert" ON public.inventory_stocks FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "inv_stocks_auth_update" ON public.inventory_stocks;
CREATE POLICY "inv_stocks_auth_update" ON public.inventory_stocks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "inv_stocks_admin_delete" ON public.inventory_stocks;
CREATE POLICY "inv_stocks_admin_delete" ON public.inventory_stocks FOR DELETE TO authenticated USING (is_admin());

-- Policies for transfer_stok & items
DROP POLICY IF EXISTS "transfer_stok_select" ON public.transfer_stok;
CREATE POLICY "transfer_stok_select" ON public.transfer_stok FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "transfer_stok_all_auth" ON public.transfer_stok;
CREATE POLICY "transfer_stok_all_auth" ON public.transfer_stok FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "transfer_items_select" ON public.transfer_stok_items;
CREATE POLICY "transfer_items_select" ON public.transfer_stok_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "transfer_items_all_auth" ON public.transfer_stok_items;
CREATE POLICY "transfer_items_all_auth" ON public.transfer_stok_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies for pengeluaran_gudang & items
DROP POLICY IF EXISTS "pengeluaran_gudang_select" ON public.pengeluaran_gudang;
CREATE POLICY "pengeluaran_gudang_select" ON public.pengeluaran_gudang FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "pengeluaran_gudang_all_auth" ON public.pengeluaran_gudang;
CREATE POLICY "pengeluaran_gudang_all_auth" ON public.pengeluaran_gudang FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pengeluaran_items_select" ON public.pengeluaran_gudang_items;
CREATE POLICY "pengeluaran_items_select" ON public.pengeluaran_gudang_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "pengeluaran_items_all_auth" ON public.pengeluaran_gudang_items;
CREATE POLICY "pengeluaran_items_all_auth" ON public.pengeluaran_gudang_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 10. TRIGGER SINKRONISASI STOK GLOBAL (BACKWARD COMPATIBILITY)
CREATE OR REPLACE FUNCTION public.sync_inventory_global_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inv_id UUID;
    v_total_stock INT;
BEGIN
    v_inv_id := COALESCE(NEW.inventory_id, OLD.inventory_id);
    
    SELECT COALESCE(SUM(stok), 0)
    INTO v_total_stock
    FROM public.inventory_stocks
    WHERE inventory_id = v_inv_id;

    UPDATE public.inventory
    SET stok = v_total_stock,
        updated_at = now()
    WHERE id = v_inv_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_inventory_global_stock ON public.inventory_stocks;
CREATE TRIGGER trg_sync_inventory_global_stock
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory_stocks
  FOR EACH ROW EXECUTE PROCEDURE public.sync_inventory_global_stock();

-- 11. RPC HELPER FUNCTIONS
-- 11.1 Generate Unique Transfer Number
CREATE OR REPLACE FUNCTION public.generate_nomor_transfer()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_prefix TEXT;
    v_count INT;
    v_result TEXT;
BEGIN
    v_prefix := 'TRF/' || to_char(now(), 'YYYYMM') || '/';
    SELECT COUNT(*) + 1 INTO v_count
    FROM public.transfer_stok
    WHERE nomor_transfer LIKE v_prefix || '%';
    
    v_result := v_prefix || lpad(v_count::TEXT, 4, '0');
    RETURN v_result;
END;
$$;

-- 11.2 Generate Unique Outbound Number
CREATE OR REPLACE FUNCTION public.generate_nomor_pengeluaran_gudang()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_prefix TEXT;
    v_count INT;
    v_result TEXT;
BEGIN
    v_prefix := 'OUT/' || to_char(now(), 'YYYYMM') || '/';
    SELECT COUNT(*) + 1 INTO v_count
    FROM public.pengeluaran_gudang
    WHERE nomor_dokumen LIKE v_prefix || '%';
    
    v_result := v_prefix || lpad(v_count::TEXT, 4, '0');
    RETURN v_result;
END;
$$;

-- 11.3 RPC: Kirim Transfer Stok (Gudang Asal berkurang, Status IN_TRANSIT)
CREATE OR REPLACE FUNCTION rpc.kirim_transfer_stok(
    p_transfer_id UUID,
    p_user UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, rpc
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
            'TRANSFER_OUT',
            -v_item.qty_kirim,
            'Transfer keluar: ' || v_transfer.nomor_transfer,
            v_transfer.gudang_asal_id,
            v_transfer.gudang_tujuan_id,
            now()
        );
    END LOOP;

    -- Update status transfer
    UPDATE public.transfer_stok
    SET status = 'IN_TRANSIT',
        tanggal_kirim = now(),
        approved_by = p_user,
        updated_at = now()
    WHERE id = p_transfer_id;

    RETURN jsonb_build_object('success', true, 'status', 'IN_TRANSIT');
END;
$$;

-- 11.4 RPC: Terima Transfer Stok (Gudang Tujuan bertambah, Status RECEIVED)
CREATE OR REPLACE FUNCTION rpc.terima_transfer_stok(
    p_transfer_id UUID,
    p_items JSONB, -- Array of { inventory_id: UUID, qty_terima: INT, catatan?: TEXT }
    p_user UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, rpc
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

        IF v_qty_terima IS NULL OR v_qty_terima < 0 THEN
            RAISE EXCEPTION 'Qty terima tidak valid untuk item %', v_inv_id;
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
            'TRANSFER_IN',
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
        tanggal_terima = now(),
        received_by = p_user,
        updated_at = now()
    WHERE id = p_transfer_id;

    RETURN jsonb_build_object('success', true, 'status', 'RECEIVED');
END;
$$;

-- 11.5 RPC: Eksekusi Pengeluaran Gudang (Waste / Rusak / Expired)
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
BEGIN
    v_nomor := public.generate_nomor_pengeluaran_gudang();
    
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
    END LOOP;

    RETURN v_pengeluaran_id;
END;
$$;

-- 12. SEED DEFAULT WAREHOUSES & INITIAL DATA MIGRATION
DO $$
DECLARE
    v_pusat_id UUID;
    v_cabang_id UUID;
BEGIN
    -- 12.1 Insert Gudang Utama & Toko Pusat jika belum ada
    INSERT INTO public.gudang (kode_gudang, nama, tipe, alamat, penanggung_jawab, is_default, is_active)
    VALUES ('GD-PST', 'Gudang Utama & Toko Pusat', 'PUSAT', 'Lokasi Utama', 'Admin Pusat', true, true)
    ON CONFLICT (kode_gudang) DO UPDATE SET is_default = true, is_active = true
    RETURNING id INTO v_pusat_id;

    -- 12.2 Insert Gudang Toko 2 (Cabang) jika belum ada
    INSERT INTO public.gudang (kode_gudang, nama, tipe, alamat, penanggung_jawab, is_default, is_active)
    VALUES ('GD-TK2', 'Gudang Toko 2 (Cabang)', 'CABANG', 'Cabang 2', 'Staf Cabang', false, true)
    ON CONFLICT (kode_gudang) DO NOTHING
    RETURNING id INTO v_cabang_id;

    IF v_cabang_id IS NULL THEN
        SELECT id INTO v_cabang_id FROM public.gudang WHERE kode_gudang = 'GD-TK2';
    END IF;

    -- 12.3 Migrasikan seluruh saldo stok inventory eksisting ke Gudang Utama
    INSERT INTO public.inventory_stocks (inventory_id, gudang_id, stok, min_stok, updated_at)
    SELECT id, v_pusat_id, COALESCE(stok, 0), COALESCE(minimum_stock, 0), now()
    FROM public.inventory
    ON CONFLICT (inventory_id, gudang_id)
    DO UPDATE SET stok = EXCLUDED.stok;

    -- 12.4 Inisialisasi entri stok untuk Toko 2 dengan saldo 0 (jika belum ada)
    INSERT INTO public.inventory_stocks (inventory_id, gudang_id, stok, min_stok, updated_at)
    SELECT id, v_cabang_id, 0, COALESCE(minimum_stock, 0), now()
    FROM public.inventory
    ON CONFLICT (inventory_id, gudang_id)
    DO NOTHING;
END $$;
