-- Migration: 20260830140000_optimize_ledger_module.sql
-- Description: Optimizes ledger with composite indexes, operasional UPDATE trigger,
--              pembelian (purchase) ledger sync, payroll mutasi ledger sync, and opening balance RPC.

-- 1. Index Kinerja & Optimasi Query
CREATE INDEX IF NOT EXISTS idx_buku_besar_tanggal_created ON public.buku_besar(tanggal DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buku_besar_referensi_sumber ON public.buku_besar(referensi_id, sumber);

-- 2. Trigger UPDATE pada pengeluaran_operasional
CREATE OR REPLACE FUNCTION public.trigger_update_operasional_to_ledger()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.buku_besar
    SET tanggal = NEW.tanggal,
        nominal = NEW.nominal,
        keterangan = 'Biaya Operasional (' || NEW.kategori || '): ' || COALESCE(NEW.keterangan, ''),
        created_by = NEW.created_by
    WHERE referensi_id = NEW.id AND sumber = 'BIAYA_OPERASIONAL';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_pengeluaran_operasional_updated ON public.pengeluaran_operasional;
CREATE TRIGGER on_pengeluaran_operasional_updated
    AFTER UPDATE ON public.pengeluaran_operasional
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_operasional_to_ledger();

-- 3. Trigger Otomatis Pembelian Stok (Kulakan) ke Buku Besar
CREATE OR REPLACE FUNCTION public.trigger_sync_pembelian_to_ledger()
RETURNS TRIGGER AS $$
DECLARE
    v_nominal NUMERIC;
    v_ket TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_nominal := COALESCE(NEW.total_supplier, NEW.total_sistem, 0);
        IF v_nominal > 0 THEN
            v_ket := 'Pembelian Stok: ' || COALESCE(NEW.supplier_nama, 'Supplier') || 
                     CASE WHEN NEW.nomor_nota IS NOT NULL AND NEW.nomor_nota <> '' 
                          THEN ' (Nota: ' || NEW.nomor_nota || ')' 
                          ELSE '' 
                     END;
            INSERT INTO public.buku_besar (
                tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by
            ) VALUES (
                NEW.tanggal, 'PENGELUARAN', 'PEMBELIAN_STOK', NEW.id, v_ket, v_nominal, NEW.created_by
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        v_nominal := COALESCE(NEW.total_supplier, NEW.total_sistem, 0);
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
                    created_by = NEW.created_by
                WHERE referensi_id = NEW.id AND sumber = 'PEMBELIAN_STOK';
            ELSE
                DELETE FROM public.buku_besar
                WHERE referensi_id = NEW.id AND sumber = 'PEMBELIAN_STOK';
            END IF;
        ELSIF v_nominal > 0 THEN
            INSERT INTO public.buku_besar (
                tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by
            ) VALUES (
                NEW.tanggal, 'PENGELUARAN', 'PEMBELIAN_STOK', NEW.id, v_ket, v_nominal, NEW.created_by
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

DROP TRIGGER IF EXISTS on_pembelian_ledger_sync ON public.pembelian;
CREATE TRIGGER on_pembelian_ledger_sync
    AFTER INSERT OR UPDATE OR DELETE ON public.pembelian
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_sync_pembelian_to_ledger();

-- 4. Trigger Otomatis Payroll Mutasi (Kasbon & Pencairan Gaji/EWA) ke Buku Besar
CREATE OR REPLACE FUNCTION public.trigger_sync_payroll_mutasi_to_ledger()
RETURNS TRIGGER AS $$
DECLARE
    v_user_nama TEXT;
    v_sumber ledger_sumber;
    v_ket TEXT;
    v_tgl DATE;
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.buku_besar
        WHERE referensi_id = OLD.id AND sumber IN ('KASBON', 'GAJI');
        RETURN OLD;
    END IF;

    -- Hanya proses jika jenis = 'debit' (pengeluaran kas toko ke karyawan) dan status = 'disetujui'
    IF NEW.jenis = 'debit' AND NEW.status = 'disetujui' THEN
        SELECT COALESCE(nama, 'Karyawan') INTO v_user_nama
        FROM public.profiles
        WHERE id = NEW.user_id;

        IF NEW.kategori = 'kasbon' THEN
            v_sumber := 'KASBON';
            v_ket := 'Pencairan Kasbon: ' || COALESCE(v_user_nama, 'Karyawan') || 
                     CASE WHEN NEW.keterangan IS NOT NULL AND NEW.keterangan <> '' THEN ' - ' || NEW.keterangan ELSE '' END;
        ELSE
            v_sumber := 'GAJI';
            v_ket := 'Pembayaran Gaji/EWA: ' || COALESCE(v_user_nama, 'Karyawan') || 
                     CASE WHEN NEW.keterangan IS NOT NULL AND NEW.keterangan <> '' THEN ' - ' || NEW.keterangan ELSE '' END;
        END IF;

        v_tgl := (NEW.tanggal AT TIME ZONE 'Asia/Jakarta')::DATE;

        IF EXISTS (SELECT 1 FROM public.buku_besar WHERE referensi_id = NEW.id AND sumber IN ('KASBON', 'GAJI')) THEN
            UPDATE public.buku_besar
            SET tanggal = v_tgl,
                tipe_transaksi = 'PENGELUARAN',
                sumber = v_sumber,
                keterangan = v_ket,
                nominal = NEW.nominal
            WHERE referensi_id = NEW.id AND sumber IN ('KASBON', 'GAJI');
        ELSE
            INSERT INTO public.buku_besar (
                tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by
            ) VALUES (
                v_tgl, 'PENGELUARAN', v_sumber, NEW.id, v_ket, NEW.nominal, NEW.user_id
            );
        END IF;
    ELSE
        -- Jika status berubah jadi tidak disetujui atau bukan jenis debit, bersihkan dari buku besar
        DELETE FROM public.buku_besar
        WHERE referensi_id = NEW.id AND sumber IN ('KASBON', 'GAJI');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_payroll_mutasi_ledger_sync ON public.payroll_mutasi;
CREATE TRIGGER on_payroll_mutasi_ledger_sync
    AFTER INSERT OR UPDATE OR DELETE ON public.payroll_mutasi
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_sync_payroll_mutasi_to_ledger();

-- 5. RPC Saldo Awal Periode (Total akumulasi bersih sebelum tanggal tertentu)
CREATE OR REPLACE FUNCTION public.get_ledger_opening_balance(p_start_date DATE)
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
    WHERE tanggal < p_start_date;

    RETURN v_pemasukan - v_pengeluaran;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_ledger_opening_balance(DATE) TO authenticated;
