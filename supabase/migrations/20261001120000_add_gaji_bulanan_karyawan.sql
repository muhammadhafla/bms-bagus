-- 1. Modify Karyawan Table
ALTER TABLE public.karyawan 
ADD COLUMN tipe_gaji VARCHAR(20) NOT NULL DEFAULT 'harian' CHECK (tipe_gaji IN ('harian', 'bulanan')),
ADD COLUMN gaji_bulanan NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN jatah_libur_bulanan INTEGER NOT NULL DEFAULT 0;

-- 2. Modify Slip Gaji Table
ALTER TABLE public.slip_gaji
ADD COLUMN tipe_gaji VARCHAR(20) NOT NULL DEFAULT 'harian',
ADD COLUMN gaji_bulanan NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN total_hari_libur INTEGER NOT NULL DEFAULT 0,
ADD COLUMN total_potongan_libur NUMERIC NOT NULL DEFAULT 0;

-- 3. Update trg_sync_kehadiran_to_mutasi (EWA Trigger)
CREATE OR REPLACE FUNCTION public.trg_sync_kehadiran_to_mutasi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_gaji_harian NUMERIC;
    v_denda_telat_per_jam NUMERIC;
    v_lembur_per_jam NUMERIC;
    v_tipe_gaji VARCHAR(20);
    v_nominal_pokok NUMERIC;
    v_nominal_lembur NUMERIC;
BEGIN
    -- Only process if waktu_pulang is filled
    IF NEW.waktu_pulang IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get employee rates
    SELECT gaji_harian, denda_telat_per_jam, lembur_per_jam, tipe_gaji 
    INTO v_gaji_harian, v_denda_telat_per_jam, v_lembur_per_jam, v_tipe_gaji
    FROM public.karyawan
    WHERE user_id = NEW.user_id;

    -- 3.1 Process Basic Salary and Lateness Penalty
    v_nominal_pokok := v_gaji_harian - (NEW.menit_telat / 60.0 * v_denda_telat_per_jam);
    IF v_nominal_pokok < 0 THEN v_nominal_pokok := 0; END IF;

    -- ONLY insert daily base salary if tipe_gaji is harian
    IF v_tipe_gaji = 'harian' THEN
        INSERT INTO public.payroll_mutasi (
            user_id, tanggal, jenis, kategori, nominal, keterangan, status, referensi_id
        ) VALUES (
            NEW.user_id, NEW.tanggal, 'kredit', 'gaji', v_nominal_pokok, 
            'Gaji Pokok (' || to_char(NEW.tanggal, 'DD/MM/YYYY') || ')', 'disetujui', 
            NEW.id::text || '-pokok'
        )
        ON CONFLICT (referensi_id) DO UPDATE SET
            nominal = EXCLUDED.nominal;
    ELSE
        -- If bulanan, we only insert the negative denda as a separate debit IF there's any lateness
        -- Because we don't insert Gaji Pokok, denda should reduce their overall EWA balance immediately.
        IF (NEW.menit_telat / 60.0 * v_denda_telat_per_jam) > 0 THEN
            INSERT INTO public.payroll_mutasi (
                user_id, tanggal, jenis, kategori, nominal, keterangan, status, referensi_id
            ) VALUES (
                NEW.user_id, NEW.tanggal, 'debit', 'gaji', (NEW.menit_telat / 60.0 * v_denda_telat_per_jam), 
                'Denda Telat (' || to_char(NEW.tanggal, 'DD/MM/YYYY') || ')', 'disetujui', 
                NEW.id::text || '-denda'
            )
            ON CONFLICT (referensi_id) DO UPDATE SET
                nominal = EXCLUDED.nominal;
        END IF;
    END IF;

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


-- 4. Replace preview_gaji RPC
DROP FUNCTION IF EXISTS public.preview_gaji(VARCHAR);
CREATE OR REPLACE FUNCTION public.preview_gaji(p_periode VARCHAR)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    periode_bulan VARCHAR,
    total_hari_hadir INTEGER,
    total_jam_telat NUMERIC,
    total_jam_lembur NUMERIC,
    total_gaji_harian NUMERIC,
    total_denda_telat NUMERIC,
    total_gaji_lembur NUMERIC,
    total_potongan_kasbon NUMERIC,
    gaji_bersih NUMERIC,
    status_pembayaran VARCHAR,
    dibayar_pada TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    nama VARCHAR,
    tipe_gaji VARCHAR,
    gaji_bulanan NUMERIC,
    total_hari_libur INTEGER,
    total_potongan_libur NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
    v_total_potongan_kasbon NUMERIC;
    v_gaji_bersih NUMERIC;
    
    v_total_hari_dalam_sebulan INTEGER;
    v_total_hari_libur INTEGER;
    v_hari_potongan INTEGER;
    v_total_potongan_libur NUMERIC;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya admin yang bisa melihat preview gaji.';
    END IF;

    v_start_date := to_date(p_periode || '-01', 'YYYY-MM-DD');
    v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    v_total_hari_dalam_sebulan := extract(day from v_end_date);

    FOR r IN (
        SELECT k.*, p.nama as user_nama 
        FROM public.karyawan k 
        JOIN public.profiles p ON k.user_id = p.id
        WHERE k.status_karyawan = 'aktif'
    )
    LOOP
        -- Hitung Kehadiran (Denda telat hanya jika menit_telat > 30 menit)
        SELECT 
            COUNT(k_hadir.id),
            COALESCE(SUM(CASE WHEN k_hadir.menit_telat > 30 THEN k_hadir.menit_telat ELSE 0 END), 0),
            COALESCE(SUM(k_hadir.menit_lembur_disetujui), 0)
        INTO 
            v_total_hari_hadir,
            v_total_menit_telat,
            v_total_menit_lembur
        FROM public.kehadiran k_hadir
        WHERE k_hadir.user_id = r.user_id 
          AND k_hadir.tanggal >= v_start_date AND k_hadir.tanggal <= v_end_date
          AND k_hadir.status_hadir = 'hadir';
        
        -- Hitung Potongan Kasbon / Pencairan dari payroll_mutasi
        -- PENTING: Hanya menghitung 'debit' di mana kategori tidak 'gaji'.
        -- Wait! Di EWA sebelumnya, denda telat dipotong langsung dari Gaji Pokok Harian. 
        -- Tapi untuk tipe_gaji = 'bulanan', denda telat di-insert sebagai mutasi debit 'gaji'.
        -- Oleh karena itu, kita tidak boleh mengambil Denda Telat ini sebagai 'Potongan Kasbon' agar tidak double deduct, 
        -- karena denda telat sudah akan dihitung mandiri di bawah.
        SELECT COALESCE(SUM(pm.nominal), 0)
        INTO v_total_potongan_kasbon
        FROM public.payroll_mutasi pm
        WHERE pm.user_id = r.user_id
          AND pm.jenis = 'debit'
          AND pm.status = 'disetujui'
          AND pm.kategori != 'gaji'
          AND pm.tanggal >= v_start_date AND pm.tanggal < (v_end_date + INTERVAL '1 day');

        v_total_jam_telat := v_total_menit_telat / 60.0;
        v_total_jam_lembur := v_total_menit_lembur / 60.0;

        v_total_denda_telat := v_total_jam_telat * r.denda_telat_per_jam;
        v_total_gaji_lembur := v_total_jam_lembur * r.lembur_per_jam;

        v_total_hari_libur := v_total_hari_dalam_sebulan - v_total_hari_hadir;

        IF r.tipe_gaji = 'bulanan' THEN
            v_hari_potongan := GREATEST(0, v_total_hari_libur - r.jatah_libur_bulanan);
            v_total_potongan_libur := v_hari_potongan * r.gaji_harian;
            v_total_gaji_harian := r.gaji_bulanan;
        ELSE
            v_total_potongan_libur := 0;
            v_total_gaji_harian := v_total_hari_hadir * r.gaji_harian;
        END IF;

        v_gaji_bersih := v_total_gaji_harian + v_total_gaji_lembur - v_total_potongan_libur - v_total_denda_telat - v_total_potongan_kasbon;

        id := gen_random_uuid();
        user_id := r.user_id;
        periode_bulan := p_periode;
        total_hari_hadir := v_total_hari_hadir;
        total_jam_telat := v_total_jam_telat;
        total_jam_lembur := v_total_jam_lembur;
        total_gaji_harian := v_total_gaji_harian;
        total_denda_telat := v_total_denda_telat;
        total_gaji_lembur := v_total_gaji_lembur;
        total_potongan_kasbon := v_total_potongan_kasbon;
        gaji_bersih := v_gaji_bersih;
        status_pembayaran := 'draft';
        dibayar_pada := NULL;
        created_at := now();
        nama := r.user_nama;
        tipe_gaji := r.tipe_gaji;
        gaji_bulanan := r.gaji_bulanan;
        total_hari_libur := v_total_hari_libur;
        total_potongan_libur := v_total_potongan_libur;

        RETURN NEXT;
    END LOOP;
END;
$$;

-- 5. Replace proses_gaji RPC
CREATE OR REPLACE FUNCTION public.proses_gaji(p_periode VARCHAR)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
    v_total_potongan_kasbon NUMERIC;
    v_gaji_bersih NUMERIC;
    
    v_total_hari_dalam_sebulan INTEGER;
    v_total_hari_libur INTEGER;
    v_hari_potongan INTEGER;
    v_total_potongan_libur NUMERIC;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya admin yang bisa memproses gaji.';
    END IF;

    v_start_date := to_date(p_periode || '-01', 'YYYY-MM-DD');
    v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    v_total_hari_dalam_sebulan := extract(day from v_end_date);

    FOR r IN (SELECT k.* FROM public.karyawan k WHERE k.status_karyawan = 'aktif')
    LOOP
        SELECT 
            COUNT(id),
            COALESCE(SUM(CASE WHEN menit_telat > 30 THEN menit_telat ELSE 0 END), 0),
            COALESCE(SUM(menit_lembur_disetujui), 0)
        INTO 
            v_total_hari_hadir,
            v_total_menit_telat,
            v_total_menit_lembur
        FROM public.kehadiran
        WHERE user_id = r.user_id 
          AND tanggal >= v_start_date AND tanggal <= v_end_date
          AND status_hadir = 'hadir';
        
        -- Ignore Denda Telat mutasi here to avoid double deduction
        SELECT COALESCE(SUM(nominal), 0)
        INTO v_total_potongan_kasbon
        FROM public.payroll_mutasi
        WHERE user_id = r.user_id
          AND jenis = 'debit'
          AND status = 'disetujui'
          AND kategori != 'gaji'
          AND tanggal >= v_start_date AND tanggal < (v_end_date + INTERVAL '1 day');

        v_total_jam_telat := v_total_menit_telat / 60.0;
        v_total_jam_lembur := v_total_menit_lembur / 60.0;

        v_total_denda_telat := v_total_jam_telat * r.denda_telat_per_jam;
        v_total_gaji_lembur := v_total_jam_lembur * r.lembur_per_jam;

        v_total_hari_libur := v_total_hari_dalam_sebulan - v_total_hari_hadir;

        IF r.tipe_gaji = 'bulanan' THEN
            v_hari_potongan := GREATEST(0, v_total_hari_libur - r.jatah_libur_bulanan);
            v_total_potongan_libur := v_hari_potongan * r.gaji_harian;
            v_total_gaji_harian := r.gaji_bulanan;
            
            -- Insert mutasi kredit for EWA for the Base Salary minus Potongan Libur
            INSERT INTO public.payroll_mutasi (
                user_id, tanggal, jenis, kategori, nominal, keterangan, status, referensi_id
            ) VALUES (
                r.user_id, v_end_date, 'kredit', 'gaji', (v_total_gaji_harian - v_total_potongan_libur), 
                'Gaji Pokok Bulanan (' || p_periode || ')', 'disetujui', 
                'gaji_bulanan_' || r.user_id::text || '_' || p_periode
            )
            ON CONFLICT (referensi_id) DO UPDATE SET
                nominal = EXCLUDED.nominal;
        ELSE
            v_total_potongan_libur := 0;
            v_total_gaji_harian := v_total_hari_hadir * r.gaji_harian;
        END IF;

        v_gaji_bersih := v_total_gaji_harian + v_total_gaji_lembur - v_total_potongan_libur - v_total_denda_telat - v_total_potongan_kasbon;

        -- 3. Upsert Slip Gaji
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
            gaji_bersih,
            status_pembayaran,
            tipe_gaji,
            gaji_bulanan,
            total_hari_libur,
            total_potongan_libur
        ) VALUES (
            r.user_id,
            p_periode,
            v_total_hari_hadir,
            v_total_jam_telat,
            v_total_jam_lembur,
            v_total_gaji_harian,
            v_total_denda_telat,
            v_total_gaji_lembur,
            v_total_potongan_kasbon,
            v_gaji_bersih,
            'draft',
            r.tipe_gaji,
            r.gaji_bulanan,
            v_total_hari_libur,
            v_total_potongan_libur
        )
        ON CONFLICT (user_id, periode_bulan) DO UPDATE SET
            total_hari_hadir = EXCLUDED.total_hari_hadir,
            total_jam_telat = EXCLUDED.total_jam_telat,
            total_jam_lembur = EXCLUDED.total_jam_lembur,
            total_gaji_harian = EXCLUDED.total_gaji_harian,
            total_denda_telat = EXCLUDED.total_denda_telat,
            total_gaji_lembur = EXCLUDED.total_gaji_lembur,
            total_potongan_kasbon = EXCLUDED.total_potongan_kasbon,
            gaji_bersih = EXCLUDED.gaji_bersih,
            tipe_gaji = EXCLUDED.tipe_gaji,
            gaji_bulanan = EXCLUDED.gaji_bulanan,
            total_hari_libur = EXCLUDED.total_hari_libur,
            total_potongan_libur = EXCLUDED.total_potongan_libur;

    END LOOP;
END;
$$;
