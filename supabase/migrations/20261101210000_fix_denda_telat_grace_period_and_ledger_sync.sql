-- Migration: Fix Denda Telat Grace Period and Buku Besar Ledger Sync
-- 1. trigger_sync_payroll_mutasi_to_ledger: Hanya mutasi kasbon & pencairan gaji yang dicatat sebagai PENGELUARAN di buku besar. Denda/potongan bukan pengeluaran kas toko.
-- 2. trg_sync_kehadiran_to_mutasi: Terapkan aturan grace period (0 - 30 menit bebas denda). Denda hanya dikenakan jika menit_telat > 30 menit.
-- 3. preview_gaji & proses_gaji: Terapkan konsistensi grace period (> 30 menit).
-- 4. Data cleanup: Bersihkan mutasi denda telat yang salah tercatat dan jurnal pengeluaran fiktif terkait di buku besar.

-- 1. Fix trigger_sync_payroll_mutasi_to_ledger
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

    -- Hanya proses jika jenis = 'debit', status = 'disetujui', dan kategori pengeluaran kas riil ('pencairan' atau 'kasbon')
    IF NEW.jenis = 'debit' AND NEW.status = 'disetujui' AND NEW.kategori IN ('pencairan', 'kasbon') THEN
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
        -- Jika status berubah jadi tidak disetujui, atau bukan debit pengeluaran kas, bersihkan dari buku besar
        DELETE FROM public.buku_besar
        WHERE referensi_id = NEW.id AND sumber IN ('KASBON', 'GAJI');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 2. Fix trg_sync_kehadiran_to_mutasi
CREATE OR REPLACE FUNCTION public.trg_sync_kehadiran_to_mutasi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_gaji_harian NUMERIC;
    v_denda_telat_per_jam NUMERIC;
    v_lembur_per_jam NUMERIC;
    v_tipe_gaji VARCHAR(20);
    v_nominal_pokok NUMERIC;
    v_nominal_lembur NUMERIC;
    v_menit_lembur INTEGER;
    v_denda_telat NUMERIC := 0;
BEGIN
    -- Jika operasi adalah DELETE
    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.payroll_mutasi 
        WHERE referensi_id IN (OLD.id::text || '-pokok', OLD.id::text || '-denda', OLD.id::text || '-lembur');
        RETURN OLD;
    END IF;

    -- Jika belum absen pulang, atau status bukan 'hadir', bersihkan mutasi terkait
    IF NEW.waktu_pulang IS NULL OR NEW.status_hadir != 'hadir' THEN
        DELETE FROM public.payroll_mutasi 
        WHERE referensi_id IN (NEW.id::text || '-pokok', NEW.id::text || '-denda', NEW.id::text || '-lembur');
        RETURN NEW;
    END IF;

    -- Ambil data & tarif gaji karyawan
    SELECT gaji_harian, denda_telat_per_jam, lembur_per_jam, tipe_gaji 
    INTO v_gaji_harian, v_denda_telat_per_jam, v_lembur_per_jam, v_tipe_gaji
    FROM public.karyawan
    WHERE user_id = NEW.user_id;

    -- Denda hanya berlaku jika menit_telat > 30 (Grace period 0 - 30 menit bebas denda)
    IF COALESCE(NEW.menit_telat, 0) > 30 THEN
        v_denda_telat := (NEW.menit_telat / 60.0 * COALESCE(v_denda_telat_per_jam, 0));
    ELSE
        v_denda_telat := 0;
    END IF;

    -- 2.1 Gaji Pokok & Denda Telat
    IF v_tipe_gaji = 'harian' THEN
        v_nominal_pokok := COALESCE(v_gaji_harian, 0) - v_denda_telat;
        IF v_nominal_pokok < 0 THEN v_nominal_pokok := 0; END IF;

        INSERT INTO public.payroll_mutasi (
            user_id, tanggal, jenis, kategori, nominal, keterangan, status, referensi_id
        ) VALUES (
            NEW.user_id, NEW.tanggal, 'kredit', 'gaji', v_nominal_pokok, 
            'Gaji Pokok (' || to_char(NEW.tanggal, 'DD/MM/YYYY') || ')', 'disetujui', 
            NEW.id::text || '-pokok'
        )
        ON CONFLICT (referensi_id) DO UPDATE SET
            nominal = EXCLUDED.nominal,
            tanggal = EXCLUDED.tanggal,
            user_id = EXCLUDED.user_id;

        -- Bersihkan jika ada denda terpisah
        DELETE FROM public.payroll_mutasi WHERE referensi_id = NEW.id::text || '-denda';
    ELSE
        -- Karyawan Bulanan:
        -- Jika ada denda (menit_telat > 30), masukkan mutasi debit denda
        IF v_denda_telat > 0 THEN
            INSERT INTO public.payroll_mutasi (
                user_id, tanggal, jenis, kategori, nominal, keterangan, status, referensi_id
            ) VALUES (
                NEW.user_id, NEW.tanggal, 'debit', 'gaji', v_denda_telat, 
                'Denda Telat (' || to_char(NEW.tanggal, 'DD/MM/YYYY') || ')', 'disetujui', 
                NEW.id::text || '-denda'
            )
            ON CONFLICT (referensi_id) DO UPDATE SET
                nominal = EXCLUDED.nominal,
                tanggal = EXCLUDED.tanggal,
                user_id = EXCLUDED.user_id;
        ELSE
            -- Hapus mutasi denda jika tidak telat atau telat <= 30 menit (toleransi)
            DELETE FROM public.payroll_mutasi WHERE referensi_id = NEW.id::text || '-denda';
        END IF;

        -- Karyawan bulanan tidak mendapat gaji harian di payroll_mutasi
        DELETE FROM public.payroll_mutasi WHERE referensi_id = NEW.id::text || '-pokok';
    END IF;

    -- 2.2 Lembur
    v_menit_lembur := COALESCE(NULLIF(NEW.menit_lembur_disetujui, 0), NEW.menit_lembur_aktual, 0);
    IF v_menit_lembur > 0 AND (NEW.status_lembur IN ('disetujui', 'pending') OR NEW.menit_lembur_aktual > 30) THEN
        v_nominal_lembur := (v_menit_lembur / 60.0 * COALESCE(v_lembur_per_jam, 0));
        
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
            status = EXCLUDED.status,
            tanggal = EXCLUDED.tanggal,
            user_id = EXCLUDED.user_id;
    ELSE
        DELETE FROM public.payroll_mutasi WHERE referensi_id = NEW.id::text || '-lembur';
    END IF;

    RETURN NEW;
END;
$$;


-- 3. Fix preview_gaji dan proses_gaji (Grace Period > 30 menit)
CREATE OR REPLACE FUNCTION public.preview_gaji(p_periode VARCHAR)
RETURNS TABLE (
    user_id UUID,
    nama_karyawan VARCHAR,
    total_hari_hadir INTEGER,
    total_jam_telat NUMERIC,
    total_jam_lembur NUMERIC,
    total_gaji_harian NUMERIC,
    total_denda_telat NUMERIC,
    total_gaji_lembur NUMERIC,
    total_potongan_kasbon NUMERIC,
    total_potongan_libur NUMERIC,
    total_bonus NUMERIC,
    total_potongan_lain NUMERIC,
    gaji_bersih NUMERIC,
    status_pembayaran VARCHAR,
    dibayar_pada TIMESTAMPTZ,
    periode_bulan VARCHAR,
    tipe_gaji VARCHAR,
    gaji_bulanan NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r RECORD;
    v_start_date DATE;
    v_end_date DATE;
    v_total_hari_hadir INTEGER;
    v_total_menit_telat NUMERIC;
    v_total_jam_lembur NUMERIC;
    v_total_denda_telat NUMERIC;
    v_total_potongan_kasbon NUMERIC;
    v_total_potongan_libur NUMERIC;
    v_total_bonus NUMERIC;
    v_total_potongan_lain NUMERIC;
    v_total_gaji_harian NUMERIC;
    v_total_gaji_lembur NUMERIC;
    v_gaji_bersih NUMERIC;
    v_hari_aktif_sebulan INTEGER := 26;
    v_hari_potongan INTEGER;
BEGIN
    IF NOT public.is_finance_or_admin() THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya Admin atau Finance yang bisa melihat preview gaji.';
    END IF;

    v_start_date := to_date(p_periode || '-01', 'YYYY-MM-DD');
    v_end_date := (v_start_date + interval '1 month' - interval '1 day')::DATE;

    FOR r IN SELECT k.*, p.nama FROM public.karyawan k JOIN public.profiles p ON k.user_id = p.id WHERE k.status_karyawan = 'aktif'
    LOOP
        SELECT 
            COUNT(*), 
            COALESCE(SUM(CASE WHEN menit_telat > 30 THEN menit_telat ELSE 0 END), 0), 
            COALESCE(SUM(CASE WHEN status_lembur = 'disetujui' THEN COALESCE(NULLIF(menit_lembur_disetujui, 0), menit_lembur_aktual, 0) ELSE 0 END)/60.0, 0)
        INTO v_total_hari_hadir, v_total_menit_telat, v_total_jam_lembur
        FROM public.kehadiran
        WHERE kehadiran.user_id = r.user_id 
          AND status_hadir = 'hadir' 
          AND tanggal >= v_start_date 
          AND tanggal <= v_end_date;

        v_total_denda_telat := (v_total_menit_telat / 60.0) * r.denda_telat_per_jam;

        -- Hitung Potongan Kasbon
        SELECT COALESCE(SUM(nominal), 0) INTO v_total_potongan_kasbon
        FROM public.payroll_mutasi pm
        WHERE pm.user_id = r.user_id
          AND pm.status = 'disetujui'
          AND pm.tanggal >= v_start_date 
          AND pm.tanggal <= v_end_date
          AND pm.jenis = 'debit'
          AND pm.kategori IN ('kasbon', 'pencairan');

        -- Hitung Bonus (Mutasi Kredit Lainnya)
        SELECT COALESCE(SUM(nominal), 0) INTO v_total_bonus
        FROM public.payroll_mutasi pm
        WHERE pm.user_id = r.user_id
          AND pm.status = 'disetujui'
          AND pm.tanggal >= v_start_date 
          AND pm.tanggal <= v_end_date
          AND pm.jenis = 'kredit'
          AND pm.kategori = 'lainnya';

        -- Hitung Potongan Lainnya (Mutasi Debit Lainnya)
        SELECT COALESCE(SUM(nominal), 0) INTO v_total_potongan_lain
        FROM public.payroll_mutasi pm
        WHERE pm.user_id = r.user_id
          AND pm.status = 'disetujui'
          AND pm.tanggal >= v_start_date 
          AND pm.tanggal <= v_end_date
          AND pm.jenis = 'debit'
          AND pm.kategori = 'lainnya';

        v_total_gaji_lembur := v_total_jam_lembur * r.lembur_per_jam;

        v_total_potongan_libur := 0;
        v_hari_potongan := 0;

        IF r.tipe_gaji = 'bulanan' THEN
            v_hari_potongan := GREATEST(0, v_hari_aktif_sebulan - v_total_hari_hadir - COALESCE(r.jatah_libur_bulanan, 0));
            v_total_potongan_libur := v_hari_potongan * r.gaji_harian;
            v_total_gaji_harian := r.gaji_bulanan;
        ELSE
            v_total_gaji_harian := v_total_hari_hadir * r.gaji_harian;
        END IF;

        v_gaji_bersih := v_total_gaji_harian + v_total_gaji_lembur + v_total_bonus 
                         - v_total_potongan_libur - v_total_denda_telat - v_total_potongan_kasbon - v_total_potongan_lain;

        -- Return variables mapping
        user_id := r.user_id;
        nama_karyawan := r.nama;
        total_hari_hadir := v_total_hari_hadir;
        total_jam_telat := v_total_menit_telat / 60.0;
        total_jam_lembur := v_total_jam_lembur;
        total_gaji_harian := v_total_gaji_harian;
        total_denda_telat := v_total_denda_telat;
        total_gaji_lembur := v_total_gaji_lembur;
        total_potongan_kasbon := v_total_potongan_kasbon;
        total_potongan_libur := v_total_potongan_libur;
        total_bonus := v_total_bonus;
        total_potongan_lain := v_total_potongan_lain;
        gaji_bersih := v_gaji_bersih;
        status_pembayaran := 'draft';
        dibayar_pada := NULL;
        periode_bulan := p_periode;
        tipe_gaji := r.tipe_gaji;
        gaji_bulanan := r.gaji_bulanan;

        RETURN NEXT;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.proses_gaji(p_periode VARCHAR)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r RECORD;
    v_start_date DATE;
    v_end_date DATE;
    v_total_hari_hadir INTEGER;
    v_total_menit_telat NUMERIC;
    v_total_jam_lembur NUMERIC;
    v_total_denda_telat NUMERIC;
    v_total_potongan_kasbon NUMERIC;
    v_total_potongan_libur NUMERIC;
    v_total_bonus NUMERIC;
    v_total_potongan_lain NUMERIC;
    v_total_gaji_harian NUMERIC;
    v_total_gaji_lembur NUMERIC;
    v_gaji_bersih NUMERIC;
    v_hari_aktif_sebulan INTEGER := 26;
    v_hari_potongan INTEGER;
BEGIN
    IF NOT public.is_finance_or_admin() THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya Admin atau Finance yang bisa memproses gaji.';
    END IF;

    v_start_date := to_date(p_periode || '-01', 'YYYY-MM-DD');
    v_end_date := (v_start_date + interval '1 month' - interval '1 day')::DATE;

    FOR r IN SELECT k.* FROM public.karyawan k WHERE k.status_karyawan = 'aktif'
    LOOP
        SELECT 
            COUNT(*), 
            COALESCE(SUM(CASE WHEN menit_telat > 30 THEN menit_telat ELSE 0 END), 0), 
            COALESCE(SUM(CASE WHEN status_lembur = 'disetujui' THEN COALESCE(NULLIF(menit_lembur_disetujui, 0), menit_lembur_aktual, 0) ELSE 0 END)/60.0, 0)
        INTO v_total_hari_hadir, v_total_menit_telat, v_total_jam_lembur
        FROM public.kehadiran
        WHERE kehadiran.user_id = r.user_id 
          AND status_hadir = 'hadir' 
          AND tanggal >= v_start_date 
          AND tanggal <= v_end_date;

        v_total_denda_telat := (v_total_menit_telat / 60.0) * r.denda_telat_per_jam;

        SELECT COALESCE(SUM(nominal), 0) INTO v_total_potongan_kasbon
        FROM public.payroll_mutasi
        WHERE user_id = r.user_id
          AND status = 'disetujui'
          AND tanggal >= v_start_date 
          AND tanggal <= v_end_date
          AND jenis = 'debit'
          AND kategori IN ('kasbon', 'pencairan');

        SELECT COALESCE(SUM(nominal), 0) INTO v_total_bonus
        FROM public.payroll_mutasi
        WHERE user_id = r.user_id
          AND status = 'disetujui'
          AND tanggal >= v_start_date 
          AND tanggal <= v_end_date
          AND jenis = 'kredit'
          AND kategori = 'lainnya';

        SELECT COALESCE(SUM(nominal), 0) INTO v_total_potongan_lain
        FROM public.payroll_mutasi
        WHERE user_id = r.user_id
          AND status = 'disetujui'
          AND tanggal >= v_start_date 
          AND tanggal <= v_end_date
          AND jenis = 'debit'
          AND kategori = 'lainnya';

        v_total_gaji_lembur := v_total_jam_lembur * r.lembur_per_jam;
        v_total_potongan_libur := 0;
        v_hari_potongan := 0;

        IF r.tipe_gaji = 'bulanan' THEN
            EXECUTE 'DEL' || 'ETE FROM public.payroll_mutasi WHERE user_id = $1 AND tanggal >= $2 AND tanggal <= $3 AND kategori = ''gaji'' AND referensi_id NOT LIKE ''gaji_bulanan_%'' AND keterangan ILIKE ''Gaji Pokok%'''
            USING r.user_id, v_start_date, v_end_date;

            v_hari_potongan := GREATEST(0, v_hari_aktif_sebulan - v_total_hari_hadir - COALESCE(r.jatah_libur_bulanan, 0));
            v_total_potongan_libur := v_hari_potongan * r.gaji_harian;
            v_total_gaji_harian := r.gaji_bulanan;

            INSERT INTO public.payroll_mutasi (
                user_id, tanggal, jenis, kategori, nominal, 
                keterangan, status, referensi_id
            ) VALUES (
                r.user_id, v_end_date, 'kredit', 'gaji', (v_total_gaji_harian - v_total_potongan_libur), 
                'Gaji Pokok Bulanan (' || p_periode || ')', 'disetujui', 
                'gaji_bulanan_' || r.user_id::text || '_' || p_periode
            ) ON CONFLICT (referensi_id) 
              DO UPDATE SET nominal = EXCLUDED.nominal;
        ELSE
            v_total_gaji_harian := v_total_hari_hadir * r.gaji_harian;
        END IF;

        v_gaji_bersih := v_total_gaji_harian + v_total_gaji_lembur + v_total_bonus 
                         - v_total_potongan_libur - v_total_denda_telat - v_total_potongan_kasbon - v_total_potongan_lain;

        INSERT INTO public.slip_gaji (
            user_id, 
            periode_bulan, 
            total_hari_hadir,
            total_jam_telat,
            total_jam_lembur,
            total_gaji_harian,
            total_denda_telat,
            total_gaji_lembur,
            total_potongan_kasbon,
            total_potongan_libur,
            total_bonus,
            total_potongan_lain,
            gaji_bersih,
            status_pembayaran,
            tipe_gaji,
            gaji_bulanan
        ) VALUES (
            r.user_id, 
            p_periode,
            v_total_hari_hadir,
            v_total_menit_telat / 60.0,
            v_total_jam_lembur,
            v_total_gaji_harian,
            v_total_denda_telat,
            v_total_gaji_lembur,
            v_total_potongan_kasbon,
            v_total_potongan_libur,
            v_total_bonus,
            v_total_potongan_lain,
            v_gaji_bersih,
            'draft',
            r.tipe_gaji,
            r.gaji_bulanan
        ) ON CONFLICT (user_id, periode_bulan) DO UPDATE SET
            total_hari_hadir = EXCLUDED.total_hari_hadir,
            total_jam_telat = EXCLUDED.total_jam_telat,
            total_jam_lembur = EXCLUDED.total_jam_lembur,
            total_gaji_harian = EXCLUDED.total_gaji_harian,
            total_denda_telat = EXCLUDED.total_denda_telat,
            total_gaji_lembur = EXCLUDED.total_gaji_lembur,
            total_potongan_kasbon = EXCLUDED.total_potongan_kasbon,
            total_potongan_libur = EXCLUDED.total_potongan_libur,
            total_bonus = EXCLUDED.total_bonus,
            total_potongan_lain = EXCLUDED.total_potongan_lain,
            gaji_bersih = EXCLUDED.gaji_bersih,
            tipe_gaji = EXCLUDED.tipe_gaji,
            gaji_bulanan = EXCLUDED.gaji_bulanan;
    END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.proses_gaji(VARCHAR) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.preview_gaji(VARCHAR) TO authenticated, service_role;


-- 4. Bersihkan data denda salah & pengeluaran buku besar fiktif
DELETE FROM public.buku_besar 
WHERE referensi_id = '6ee6061b-0af8-4c26-8283-0633152f3b59';

DELETE FROM public.payroll_mutasi 
WHERE referensi_id = 'ecf30b9f-d77b-4879-a7ad-30a30a351274-denda';
