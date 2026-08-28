-- 1. Perbaiki Foreign Key untuk bisa join dengan profiles
ALTER TABLE public.buku_besar
  DROP CONSTRAINT IF EXISTS buku_besar_created_by_fkey;
ALTER TABLE public.buku_besar
  ADD CONSTRAINT buku_besar_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.pengeluaran_operasional
  DROP CONSTRAINT IF EXISTS pengeluaran_operasional_created_by_fkey;
ALTER TABLE public.pengeluaran_operasional
  ADD CONSTRAINT pengeluaran_operasional_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Perbaiki Trigger Kasbon agar mengarah ke payroll_mutasi dan menggunakan kolom 'nama'
CREATE OR REPLACE FUNCTION trigger_kasbon_approved_to_ledger()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
BEGIN
    -- Pastikan ini adalah kasbon dan baru saja disetujui
    IF NEW.kategori = 'kasbon' AND NEW.status = 'disetujui' AND OLD.status != 'disetujui' THEN
        -- Ambil nama karyawan dari profiles (kolomnya 'nama', bukan 'full_name')
        SELECT nama INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
        
        INSERT INTO public.buku_besar (
            tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by
        ) VALUES (
            CURRENT_DATE, 'PENGELUARAN', 'KASBON', NEW.id,
            'Pencairan Kasbon: ' || COALESCE(v_user_name, 'Unknown') || COALESCE(' - ' || NEW.keterangan, ''),
            NEW.nominal, auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_kasbon_approved_mutasi ON public.payroll_mutasi;
CREATE TRIGGER on_kasbon_approved_mutasi
    AFTER UPDATE ON public.payroll_mutasi
    FOR EACH ROW
    EXECUTE FUNCTION trigger_kasbon_approved_to_ledger();
