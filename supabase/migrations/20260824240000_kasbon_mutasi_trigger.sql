-- Trigger for kasbon
CREATE OR REPLACE FUNCTION public.trg_sync_kasbon_to_mutasi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only sync if status is 'disetujui' or 'lunas' (which are both approved states)
    IF (TG_OP = 'INSERT' AND NEW.status IN ('disetujui', 'lunas')) OR 
       (TG_OP = 'UPDATE' AND NEW.status IN ('disetujui', 'lunas')) THEN
       
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
            NEW.tanggal,
            'debit',
            'kasbon',
            NEW.nominal,
            COALESCE(NEW.keterangan, 'Pengambilan Kasbon'),
            'disetujui',
            NEW.id
        )
        ON CONFLICT (referensi_id) DO UPDATE SET
            nominal = EXCLUDED.nominal,
            keterangan = EXCLUDED.keterangan,
            status = 'disetujui';
            
    ELSIF TG_OP = 'UPDATE' AND NEW.status = 'ditolak' THEN
        -- If rejected, we should either delete or mark as ditolak
        -- But since we only insert on disetujui, we might need to delete if it was previously disetujui and changed to ditolak
        DELETE FROM public.payroll_mutasi WHERE referensi_id = NEW.id;
    END IF;
        
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_kasbon_to_mutasi ON public.kasbon;
CREATE TRIGGER trg_sync_kasbon_to_mutasi
AFTER INSERT OR UPDATE ON public.kasbon
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_kasbon_to_mutasi();
