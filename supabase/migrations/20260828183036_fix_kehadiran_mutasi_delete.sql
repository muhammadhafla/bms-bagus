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
    -- If they didn't clock out, or status is not 'hadir', delete any existing mutasi
    IF NEW.waktu_pulang IS NULL OR NEW.status_hadir != 'hadir' THEN
        DELETE FROM public.payroll_mutasi WHERE referensi_id IN (NEW.id::text || '-pokok', NEW.id::text || '-lembur');
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
    ELSE
        -- Delete lembur mutasi if it previously existed but now doesn't meet the criteria
        DELETE FROM public.payroll_mutasi WHERE referensi_id = NEW.id::text || '-lembur';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_kehadiran_updated_mutasi ON public.kehadiran;
CREATE TRIGGER on_kehadiran_updated_mutasi
AFTER UPDATE OF status_hadir, waktu_pulang, menit_telat, status_lembur, menit_lembur_aktual ON public.kehadiran
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_kehadiran_to_mutasi();
