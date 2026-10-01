-- Replace proses_gaji RPC to include mutasi cleanup
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
            -- CLEANUP: Delete any daily 'Gaji Pokok' credits for this month if they exist 
            -- (e.g. if the user was previously 'harian' and switched to 'bulanan' retroactively)
            DELETE FROM public.payroll_mutasi
            WHERE user_id = r.user_id 
              AND tanggal >= v_start_date AND tanggal <= v_end_date
              AND jenis = 'kredit' 
              AND kategori = 'gaji' 
              AND referensi_id NOT LIKE 'gaji_bulanan_%'
              AND keterangan ILIKE 'Gaji Pokok%';

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
