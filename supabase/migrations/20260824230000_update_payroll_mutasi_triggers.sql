-- 1. Create a unique constraint on referensi_id in payroll_mutasi if we want to upsert
ALTER TABLE public.payroll_mutasi ADD CONSTRAINT payroll_mutasi_referensi_id_key UNIQUE (referensi_id);

-- 2. Trigger for slip_gaji
CREATE OR REPLACE FUNCTION public.trg_sync_slip_gaji_to_mutasi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only sync if it's 'dibayar' or 'draft'? 
    -- In Ledger model, once it's processed (draft/dibayar), it's a Kredit to their Saldo.
    -- We can just treat it as 'disetujui' in mutasi.
    
    INSERT INTO public.payroll_mutasi (
        user_id,
        tanggal,
        jenis,
        kategori,
        nominal,
        keterangan,
        status,
        referensi_id
    ) VALUES (
        NEW.user_id,
        (NEW.periode_bulan || '-01')::DATE + INTERVAL '1 month' - INTERVAL '1 day',
        'kredit',
        'gaji',
        NEW.gaji_bersih,
        'Gaji Pokok & Lembur (' || NEW.periode_bulan || ')',
        'disetujui',
        NEW.id
    )
    ON CONFLICT (referensi_id) DO UPDATE SET
        nominal = EXCLUDED.nominal,
        keterangan = EXCLUDED.keterangan;
        
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_slip_gaji_to_mutasi ON public.slip_gaji;
CREATE TRIGGER trg_sync_slip_gaji_to_mutasi
AFTER INSERT OR UPDATE ON public.slip_gaji
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_slip_gaji_to_mutasi();

-- 3. Update proses_gaji RPC to NOT deduct Kasbon (because Kasbon is a separate Debit mutasi)
CREATE OR REPLACE FUNCTION public.proses_gaji(p_periode VARCHAR)
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
    v_gaji_bersih NUMERIC;
BEGIN
    -- Validasi admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya admin yang bisa memproses gaji.';
    END IF;

    v_start_date := to_date(p_periode || '-01', 'YYYY-MM-DD');
    v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    FOR r IN (SELECT k.* FROM public.karyawan k WHERE k.status_karyawan = 'aktif')
    LOOP
        -- Hitung Kehadiran
        SELECT 
            COUNT(id),
            COALESCE(SUM(menit_telat), 0),
            COALESCE(SUM(menit_lembur_disetujui), 0)
        INTO 
            v_total_hari_hadir,
            v_total_menit_telat,
            v_total_menit_lembur
        FROM public.kehadiran
        WHERE user_id = r.user_id 
          AND tanggal >= v_start_date AND tanggal <= v_end_date
          AND status_hadir = 'hadir';

        v_total_jam_telat := v_total_menit_telat / 60.0;
        v_total_jam_lembur := v_total_menit_lembur / 60.0;

        v_total_gaji_harian := v_total_hari_hadir * r.gaji_harian;
        v_total_denda_telat := v_total_jam_telat * r.denda_telat_per_jam;
        v_total_gaji_lembur := v_total_jam_lembur * r.lembur_per_jam;

        -- Gaji Bersih tanpa potongan kasbon
        v_gaji_bersih := v_total_gaji_harian + v_total_gaji_lembur - v_total_denda_telat;

        IF v_gaji_bersih < 0 THEN
            v_gaji_bersih := 0;
        END IF;

        INSERT INTO public.slip_gaji (
            user_id,
            periode_bulan,
            total_hari_hadir,
            total_jam_telat,
            total_jam_lembur,
            total_gaji_harian,
            total_denda_telat,
            total_gaji_lembur,
            total_potongan_kasbon, -- set 0 in ledger model
            gaji_bersih,
            status_pembayaran
        ) VALUES (
            r.user_id,
            p_periode,
            v_total_hari_hadir,
            v_total_jam_telat,
            v_total_jam_lembur,
            v_total_gaji_harian,
            v_total_denda_telat,
            v_total_gaji_lembur,
            0,
            v_gaji_bersih,
            'draft'
        )
        ON CONFLICT (user_id, periode_bulan) DO UPDATE SET
            total_hari_hadir = EXCLUDED.total_hari_hadir,
            total_jam_telat = EXCLUDED.total_jam_telat,
            total_jam_lembur = EXCLUDED.total_jam_lembur,
            total_gaji_harian = EXCLUDED.total_gaji_harian,
            total_denda_telat = EXCLUDED.total_denda_telat,
            total_gaji_lembur = EXCLUDED.total_gaji_lembur,
            total_potongan_kasbon = 0,
            gaji_bersih = EXCLUDED.gaji_bersih;

    END LOOP;
END;
$$;
