-- ==========================================================
-- Migration: 20261012120000_add_gudang_to_print_jobs.sql
-- Description: Menambahkan isolasi gudang (gudang_id), metadata device,
--              dan pesan error pada tabel print_jobs untuk POS multi-gudang
-- ==========================================================

-- 1. Tambah kolom gudang_id, device_name, dan error_message
ALTER TABLE public.print_jobs 
  ADD COLUMN IF NOT EXISTS gudang_id UUID REFERENCES public.gudang(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS device_name TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 2. Safe Backfill untuk baris data lama (jika ada) ke gudang default / gudang utama
DO $$
DECLARE
    v_default_gudang_id UUID;
BEGIN
    -- Ambil gudang default terlebih dahulu
    SELECT id INTO v_default_gudang_id FROM public.gudang WHERE is_default = true LIMIT 1;
    
    -- Fallback ke gudang pertama jika belum ada yang is_default = true
    IF v_default_gudang_id IS NULL THEN
        SELECT id INTO v_default_gudang_id FROM public.gudang ORDER BY created_at ASC LIMIT 1;
    END IF;

    -- Update baris print_jobs yang gudang_id nya masih NULL
    IF v_default_gudang_id IS NOT NULL THEN
        UPDATE public.print_jobs
        SET gudang_id = v_default_gudang_id
        WHERE gudang_id IS NULL;
    END IF;
END $$;

-- 3. Terapkan NOT NULL pada gudang_id setelah backfill berhasil
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'print_jobs' 
          AND column_name = 'gudang_id'
          AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE public.print_jobs ALTER COLUMN gudang_id SET NOT NULL;
    END IF;
END $$;

-- 4. Indexing untuk optimasi query polling POS dan filter riwayat cetak
CREATE INDEX IF NOT EXISTS idx_print_jobs_gudang_status_created 
  ON public.print_jobs(gudang_id, status, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_print_jobs_gudang_id 
  ON public.print_jobs(gudang_id);
