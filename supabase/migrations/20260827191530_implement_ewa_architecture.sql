-- 1. Alter referensi_id in payroll_mutasi to TEXT to support composite IDs
ALTER TABLE public.payroll_mutasi DROP CONSTRAINT IF EXISTS payroll_mutasi_referensi_id_key;
ALTER TABLE public.payroll_mutasi ALTER COLUMN referensi_id TYPE TEXT;
ALTER TABLE public.payroll_mutasi ADD CONSTRAINT payroll_mutasi_referensi_id_key UNIQUE (referensi_id);

-- 2. Drop old triggers
DROP TRIGGER IF EXISTS trg_sync_slip_gaji_to_mutasi ON public.slip_gaji;
DROP FUNCTION IF EXISTS public.trg_sync_slip_gaji_to_mutasi();

-- 3. Trigger for EWA Daily on kehadiran
CREATE OR REPLACE FUNCTION public.trg_sync_kehadiran_to_mutasi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_gaji_harian NUMERIC;
    v_denda_telat_per_jam NUMERIC;
    v_lembur_per_jam NUMERIC;
    v_nominal_pokok NUMERIC;
    v_nominal_lembur NUMERIC;
BEGIN
    -- Only process if waktu_pulang is filled
    IF NEW.waktu_pulang IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get employee rates
    SELECT gaji_harian, denda_telat_per_jam, lembur_per_jam 
    INTO v_gaji_harian, v_denda_telat_per_jam, v_lembur_per_jam
    FROM public.karyawan
    WHERE user_id = NEW.user_id;

    -- 3.1 Process Basic Salary
    v_nominal_pokok := v_gaji_harian - (NEW.menit_telat / 60.0 * v_denda_telat_per_jam);
    IF v_nominal_pokok < 0 THEN v_nominal_pokok := 0; END IF;

    INSERT INTO public.payroll_mutasi (
        user_id, tanggal, jenis, kategori, nominal, keterangan, status, referensi_id
    ) VALUES (
        NEW.user_id, NEW.tanggal, 'kredit', 'gaji', v_nominal_pokok, 
        'Gaji Pokok (' || to_char(NEW.tanggal, 'DD/MM/YYYY') || ')', 'disetujui', 
        NEW.id::text || '-pokok'
    )
    ON CONFLICT (referensi_id) DO UPDATE SET
        nominal = EXCLUDED.nominal;

    -- 3.2 Process Overtime
    IF NEW.menit_lembur_aktual > 30 THEN
        v_nominal_lembur := (NEW.menit_lembur_aktual / 60.0 * v_lembur_per_jam);
        
        IF NEW.status_lembur = 'ditolak' THEN
            v_nominal_lembur := 0;
        END IF;

        INSERT INTO public.payroll_mutasi (
            user_id, tanggal, jenis, kategori, nominal, keterangan, status, referensi_id
        ) VALUES (
            NEW.user_id, NEW.tanggal, 'kredit', 'gaji', v_nominal_lembur, 
            'Lembur (' || to_char(NEW.tanggal, 'DD/MM/YYYY') || ')', 
            CASE WHEN NEW.status_lembur = 'disetujui' THEN 'disetujui'::payroll_mutasi_status 
                 WHEN NEW.status_lembur = 'ditolak' THEN 'ditolak'::payroll_mutasi_status 
                 ELSE 'pending'::payroll_mutasi_status END, 
            NEW.id::text || '-lembur'
        )
        ON CONFLICT (referensi_id) DO UPDATE SET
            nominal = EXCLUDED.nominal,
            status = EXCLUDED.status;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_kehadiran_updated_mutasi ON public.kehadiran;
CREATE TRIGGER on_kehadiran_updated_mutasi
AFTER UPDATE OF waktu_pulang, menit_telat, status_lembur, menit_lembur_aktual ON public.kehadiran
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_kehadiran_to_mutasi();

-- 4. Centralize Kasbon and Drop Kasbon Table
DROP TRIGGER IF EXISTS on_kasbon_approved ON public.kasbon;
DROP FUNCTION IF EXISTS public.trigger_kasbon_approved_to_ledger();
DROP TRIGGER IF EXISTS trg_sync_kasbon_to_mutasi ON public.kasbon;
DROP FUNCTION IF EXISTS public.trg_sync_kasbon_to_mutasi();

DROP POLICY IF EXISTS "kasbon_select" ON public.kasbon;
DROP POLICY IF EXISTS "kasbon_insert" ON public.kasbon;
DROP POLICY IF EXISTS "kasbon_update_admin" ON public.kasbon;
DROP POLICY IF EXISTS "kasbon_delete_admin" ON public.kasbon;

DROP TABLE IF EXISTS public.kasbon CASCADE;

-- 5. Trigger Pencairan to Ledger
CREATE OR REPLACE FUNCTION public.trg_pencairan_to_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_name TEXT;
BEGIN
    IF NEW.jenis = 'debit' AND NEW.status = 'disetujui' AND OLD.status != 'disetujui' THEN
        SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
        
        INSERT INTO public.buku_besar (
            tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by
        ) VALUES (
            CURRENT_DATE, 'PENGELUARAN', 'GAJI', NEW.id::uuid,
            'Penarikan Dana / Kasbon: ' || v_user_name || COALESCE(' - ' || NEW.keterangan, ''),
            NEW.nominal, NEW.user_id 
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_mutasi_pencairan_approved ON public.payroll_mutasi;
CREATE TRIGGER on_mutasi_pencairan_approved
AFTER UPDATE ON public.payroll_mutasi
FOR EACH ROW
EXECUTE FUNCTION public.trg_pencairan_to_ledger();

-- 6. Setup Monthly Slip Cron
ALTER TABLE public.slip_gaji ADD COLUMN IF NOT EXISTS saldo_awal NUMERIC DEFAULT 0;
ALTER TABLE public.slip_gaji ADD COLUMN IF NOT EXISTS total_pendapatan_bersih NUMERIC DEFAULT 0;
ALTER TABLE public.slip_gaji ADD COLUMN IF NOT EXISTS total_penarikan NUMERIC DEFAULT 0;
ALTER TABLE public.slip_gaji ADD COLUMN IF NOT EXISTS sisa_saldo_akhir NUMERIC DEFAULT 0;

CREATE OR REPLACE FUNCTION public.generate_monthly_slips(p_periode VARCHAR)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    r RECORD;
    v_total_hari_hadir INTEGER;
    v_total_menit_telat INTEGER;
    v_total_menit_lembur INTEGER;
    v_total_jam_telat NUMERIC;
    v_total_jam_lembur NUMERIC;
    v_total_gaji_harian NUMERIC;
    v_total_denda_telat NUMERIC;
    v_total_gaji_lembur NUMERIC;
    v_total_pendapatan_bersih NUMERIC;
    v_total_penarikan NUMERIC;
    v_saldo_awal NUMERIC;
    v_sisa_saldo_akhir NUMERIC;
BEGIN
    v_start_date := to_date(p_periode || '-01', 'YYYY-MM-DD');
    v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    FOR r IN (SELECT k.* FROM public.karyawan k WHERE k.status_karyawan = 'aktif')
    LOOP
        SELECT 
            COUNT(id), COALESCE(SUM(menit_telat), 0), COALESCE(SUM(CASE WHEN status_lembur = 'disetujui' THEN menit_lembur_aktual ELSE 0 END), 0)
        INTO 
            v_total_hari_hadir, v_total_menit_telat, v_total_menit_lembur
        FROM public.kehadiran
        WHERE user_id = r.user_id AND tanggal >= v_start_date AND tanggal <= v_end_date AND status_hadir = 'hadir';

        v_total_jam_telat := v_total_menit_telat / 60.0;
        v_total_jam_lembur := v_total_menit_lembur / 60.0;

        v_total_gaji_harian := v_total_hari_hadir * r.gaji_harian;
        v_total_denda_telat := v_total_jam_telat * r.denda_telat_per_jam;
        v_total_gaji_lembur := v_total_jam_lembur * r.lembur_per_jam;

        SELECT 
            COALESCE(SUM(CASE WHEN jenis = 'kredit' AND status = 'disetujui' THEN nominal ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN jenis = 'debit' AND status = 'disetujui' THEN nominal ELSE 0 END), 0)
        INTO 
            v_total_pendapatan_bersih, v_total_penarikan
        FROM public.payroll_mutasi
        WHERE user_id = r.user_id AND tanggal >= v_start_date AND tanggal <= v_end_date;

        SELECT 
            COALESCE(SUM(CASE WHEN jenis = 'kredit' AND status = 'disetujui' THEN nominal ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN jenis = 'debit' AND status = 'disetujui' THEN nominal ELSE 0 END), 0)
        INTO v_saldo_awal
        FROM public.payroll_mutasi
        WHERE user_id = r.user_id AND tanggal < v_start_date;

        v_sisa_saldo_akhir := v_saldo_awal + v_total_pendapatan_bersih - v_total_penarikan;

        INSERT INTO public.slip_gaji (
            user_id, periode_bulan, total_hari_hadir, total_jam_telat, total_jam_lembur,
            total_gaji_harian, total_denda_telat, total_gaji_lembur, total_potongan_kasbon,
            saldo_awal, total_pendapatan_bersih, total_penarikan, sisa_saldo_akhir,
            gaji_bersih, status_pembayaran
        ) VALUES (
            r.user_id, p_periode, v_total_hari_hadir, v_total_jam_telat, v_total_jam_lembur,
            v_total_gaji_harian, v_total_denda_telat, v_total_gaji_lembur, 0,
            v_saldo_awal, v_total_pendapatan_bersih, v_total_penarikan, v_sisa_saldo_akhir,
            v_total_pendapatan_bersih, 'dibayar'
        )
        ON CONFLICT (user_id, periode_bulan) DO UPDATE SET
            total_hari_hadir = EXCLUDED.total_hari_hadir,
            total_jam_telat = EXCLUDED.total_jam_telat,
            total_jam_lembur = EXCLUDED.total_jam_lembur,
            total_gaji_harian = EXCLUDED.total_gaji_harian,
            total_denda_telat = EXCLUDED.total_denda_telat,
            total_gaji_lembur = EXCLUDED.total_gaji_lembur,
            total_potongan_kasbon = EXCLUDED.total_potongan_kasbon,
            saldo_awal = EXCLUDED.saldo_awal,
            total_pendapatan_bersih = EXCLUDED.total_pendapatan_bersih,
            total_penarikan = EXCLUDED.total_penarikan,
            sisa_saldo_akhir = EXCLUDED.sisa_saldo_akhir,
            gaji_bersih = EXCLUDED.gaji_bersih;
    END LOOP;
END;
$$;
