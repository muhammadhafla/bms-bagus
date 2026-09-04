-- Migration: Fix Kehadiran Insert Trigger to Sync Saldo & Mutasi
-- Menjamin saat admin membuat entri kehadiran manual (INSERT), saldo karyawan langsung bertambah ke payroll_mutasi

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
    v_menit_lembur INTEGER;
BEGIN
    -- Jika operasi adalah DELETE
    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.payroll_mutasi 
        WHERE referensi_id IN (OLD.id::text || '-pokok', OLD.id::text || '-lembur');
        RETURN OLD;
    END IF;

    -- Jika belum absen pulang, atau status bukan 'hadir', hapus mutasi yang mungkin ada sebelumnya
    IF NEW.waktu_pulang IS NULL OR NEW.status_hadir != 'hadir' THEN
        DELETE FROM public.payroll_mutasi 
        WHERE referensi_id IN (NEW.id::text || '-pokok', NEW.id::text || '-lembur');
        RETURN NEW;
    END IF;

    -- Ambil tarif gaji karyawan
    SELECT gaji_harian, denda_telat_per_jam, lembur_per_jam 
    INTO v_gaji_harian, v_denda_telat_per_jam, v_lembur_per_jam
    FROM public.karyawan
    WHERE user_id = NEW.user_id;

    -- 1. Hitung Gaji Pokok Harian
    v_nominal_pokok := COALESCE(v_gaji_harian, 0) - (COALESCE(NEW.menit_telat, 0) / 60.0 * COALESCE(v_denda_telat_per_jam, 0));
    IF v_nominal_pokok < 0 THEN 
        v_nominal_pokok := 0; 
    END IF;

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

    -- 2. Hitung Lembur (Mendukung input manual admin menit_lembur_disetujui dan menit_lembur_aktual)
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
        -- Hapus mutasi lembur jika tidak memenuhi kriteria
        DELETE FROM public.payroll_mutasi WHERE referensi_id = NEW.id::text || '-lembur';
    END IF;

    RETURN NEW;
END;
$$;

-- Drop trigger lama
DROP TRIGGER IF EXISTS on_kehadiran_updated_mutasi ON public.kehadiran;
DROP TRIGGER IF EXISTS on_kehadiran_mutasi_sync ON public.kehadiran;

-- Buat trigger baru untuk INSERT, UPDATE, dan DELETE
CREATE TRIGGER on_kehadiran_mutasi_sync
AFTER INSERT OR UPDATE OR DELETE ON public.kehadiran
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_kehadiran_to_mutasi();

-- Backfill untuk data kehadiran yang berstatus hadir & memiliki waktu_pulang tetapi belum tercatat mutasinya
DO $$
DECLARE
    r RECORD;
    v_gaji_harian NUMERIC;
    v_denda_telat_per_jam NUMERIC;
    v_lembur_per_jam NUMERIC;
    v_nominal_pokok NUMERIC;
    v_nominal_lembur NUMERIC;
    v_menit_lembur INTEGER;
BEGIN
    FOR r IN 
        SELECT k.* 
        FROM public.kehadiran k
        LEFT JOIN public.payroll_mutasi m ON m.referensi_id = (k.id::text || '-pokok')
        WHERE k.status_hadir = 'hadir' AND k.waktu_pulang IS NOT NULL AND m.id IS NULL
    LOOP
        SELECT gaji_harian, denda_telat_per_jam, lembur_per_jam 
        INTO v_gaji_harian, v_denda_telat_per_jam, v_lembur_per_jam
        FROM public.karyawan
        WHERE user_id = r.user_id;

        v_nominal_pokok := COALESCE(v_gaji_harian, 0) - (COALESCE(r.menit_telat, 0) / 60.0 * COALESCE(v_denda_telat_per_jam, 0));
        IF v_nominal_pokok < 0 THEN 
            v_nominal_pokok := 0; 
        END IF;

        INSERT INTO public.payroll_mutasi (
            user_id, tanggal, jenis, kategori, nominal, keterangan, status, referensi_id
        ) VALUES (
            r.user_id, r.tanggal, 'kredit', 'gaji', v_nominal_pokok, 
            'Gaji Pokok (' || to_char(r.tanggal, 'DD/MM/YYYY') || ')', 'disetujui', 
            r.id::text || '-pokok'
        )
        ON CONFLICT (referensi_id) DO UPDATE SET nominal = EXCLUDED.nominal;

        v_menit_lembur := COALESCE(NULLIF(r.menit_lembur_disetujui, 0), r.menit_lembur_aktual, 0);
        IF v_menit_lembur > 0 AND (r.status_lembur IN ('disetujui', 'pending') OR r.menit_lembur_aktual > 30) THEN
            v_nominal_lembur := (v_menit_lembur / 60.0 * COALESCE(v_lembur_per_jam, 0));
            IF r.status_lembur = 'ditolak' THEN 
                v_nominal_lembur := 0; 
            END IF;

            INSERT INTO public.payroll_mutasi (
                user_id, tanggal, jenis, kategori, nominal, keterangan, status, referensi_id
            ) VALUES (
                r.user_id, r.tanggal, 'kredit', 'gaji', v_nominal_lembur, 
                'Lembur (' || to_char(r.tanggal, 'DD/MM/YYYY') || ')', 
                CASE WHEN r.status_lembur = 'disetujui' THEN 'disetujui'::payroll_mutasi_status 
                     WHEN r.status_lembur = 'ditolak' THEN 'ditolak'::payroll_mutasi_status 
                     ELSE 'pending'::payroll_mutasi_status END, 
                r.id::text || '-lembur'
            )
            ON CONFLICT (referensi_id) DO UPDATE SET nominal = EXCLUDED.nominal, status = EXCLUDED.status;
        END IF;
    END LOOP;
END $$;
