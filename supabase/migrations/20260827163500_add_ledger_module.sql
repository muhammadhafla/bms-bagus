-- 1.1 Tipe Data Baru (ENUM)
CREATE TYPE ledger_tipe AS ENUM (
    'PEMASUKAN', 
    'PENGELUARAN'
);

CREATE TYPE ledger_sumber AS ENUM (
    'PENJUALAN_SHIFT', 
    'PEMBELIAN_STOK', 
    'BIAYA_OPERASIONAL', 
    'KASBON', 
    'GAJI', 
    'MODAL',
    'LAIN_LAIN'
);

-- 1.2 Pembuatan Tabel pengeluaran_operasional
CREATE TABLE public.pengeluaran_operasional (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kategori TEXT NOT NULL, -- Contoh: 'Listrik', 'Sewa', 'Konsumsi', 'Internet', 'ATK'
    nominal NUMERIC NOT NULL CHECK (nominal > 0),
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    keterangan TEXT,
    metode_pembayaran TEXT DEFAULT 'CASH',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger untuk update `updated_at`
CREATE TRIGGER handle_updated_at_pengeluaran_operasional
  BEFORE UPDATE ON public.pengeluaran_operasional
  FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime(updated_at);

-- 1.3 Pembuatan Tabel buku_besar (General Ledger)
CREATE TABLE public.buku_besar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    tipe_transaksi ledger_tipe NOT NULL,
    sumber ledger_sumber NOT NULL,
    referensi_id UUID, -- Fleksibel, ID dari tabel asal
    keterangan TEXT NOT NULL,
    nominal NUMERIC NOT NULL CHECK (nominal >= 0),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeks untuk mempercepat query laporan berdasarkan waktu dan tipe
CREATE INDEX idx_buku_besar_tanggal ON public.buku_besar(tanggal);
CREATE INDEX idx_buku_besar_tipe ON public.buku_besar(tipe_transaksi);
CREATE INDEX idx_buku_besar_sumber ON public.buku_besar(sumber);

-- 1.4 Row Level Security (RLS)
ALTER TABLE public.pengeluaran_operasional ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pengeluaran_operasional_select_policy" ON public.pengeluaran_operasional FOR SELECT TO authenticated USING (true);
CREATE POLICY "pengeluaran_operasional_insert_policy" ON public.pengeluaran_operasional FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pengeluaran_operasional_update_policy" ON public.pengeluaran_operasional FOR UPDATE TO authenticated USING (true);

ALTER TABLE public.buku_besar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buku_besar_select_policy" ON public.buku_besar FOR SELECT TO authenticated USING (true);
CREATE POLICY "buku_besar_insert_policy" ON public.buku_besar FOR INSERT TO authenticated WITH CHECK (true);

-- 1.5 Database Triggers & Otomatisasi (RPC)

-- A. Trigger Pengeluaran Operasional
CREATE OR REPLACE FUNCTION trigger_insert_operasional_to_ledger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.buku_besar (
        tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by
    ) VALUES (
        NEW.tanggal, 'PENGELUARAN', 'BIAYA_OPERASIONAL', NEW.id, 
        'Biaya Operasional (' || NEW.kategori || '): ' || COALESCE(NEW.keterangan, ''), 
        NEW.nominal, NEW.created_by
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_pengeluaran_operasional_created
    AFTER INSERT ON public.pengeluaran_operasional
    FOR EACH ROW
    EXECUTE FUNCTION trigger_insert_operasional_to_ledger();

-- B. Integrasi Tutup Shift (Modifikasi Logika Tutup Shift yang Ada)
CREATE OR REPLACE FUNCTION record_shift_to_ledger(p_shift_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_penjualan NUMERIC;
    v_shift_record RECORD;
BEGIN
    -- Ambil info shift
    SELECT * INTO v_shift_record FROM public.shift_sessions WHERE id = p_shift_id;
    
    -- Hitung total penjualan dari `penjualan` atau `kas_log` di rentang waktu shift tersebut
    SELECT COALESCE(SUM(total), 0) INTO v_total_penjualan
    FROM public.penjualan
    WHERE created_by = v_shift_record.kasir_id
      AND created_at >= v_shift_record.start_time
      AND created_at <= COALESCE(v_shift_record.end_time, NOW())
      AND status = 'LUNAS';

    -- Catat ke buku_besar jika ada penjualan
    IF v_total_penjualan > 0 THEN
        INSERT INTO public.buku_besar (
            tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by
        ) VALUES (
            CURRENT_DATE, 'PEMASUKAN', 'PENJUALAN_SHIFT', p_shift_id,
            'Pendapatan Penjualan (Shift Kasir: ' || v_shift_record.kasir_name || ')',
            v_total_penjualan, v_shift_record.kasir_id
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- C. Trigger Kasbon (Modul HR)
CREATE OR REPLACE FUNCTION trigger_kasbon_approved_to_ledger()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
BEGIN
    IF NEW.status = 'disetujui' AND OLD.status != 'disetujui' THEN
        -- Ambil nama karyawan
        SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
        
        INSERT INTO public.buku_besar (
            tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by
        ) VALUES (
            CURRENT_DATE, 'PENGELUARAN', 'KASBON', NEW.id,
            'Pencairan Kasbon: ' || v_user_name || COALESCE(' - ' || NEW.keterangan, ''),
            NEW.nominal, NEW.approved_by
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_kasbon_approved
    AFTER UPDATE ON public.kasbon
    FOR EACH ROW
    EXECUTE FUNCTION trigger_kasbon_approved_to_ledger();

-- 1.6 Penanganan Koreksi (Hard-Delete)
CREATE OR REPLACE FUNCTION trigger_delete_operasional_from_ledger()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.buku_besar 
    WHERE referensi_id = OLD.id AND sumber = 'BIAYA_OPERASIONAL';
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_pengeluaran_operasional_deleted
    AFTER DELETE ON public.pengeluaran_operasional
    FOR EACH ROW
    EXECUTE FUNCTION trigger_delete_operasional_from_ledger();
