-- ==============================================================================
-- MIGRATION: 20261105151500_add_is_member_only_to_promosi.sql
-- DESKRIPSI:
-- 1. Tambah kolom is_member_only pada tabel public.promosi untuk membedakan
--    Promo Khusus Member vs Promo Umum Toko.
-- 2. Inisialisasi data promo yang sudah ada dengan nilai default false (Umum)
--    atau true jika nama promo mengandung indikasi khusus member.
-- ==============================================================================

ALTER TABLE public.promosi 
ADD COLUMN IF NOT EXISTS is_member_only BOOLEAN NOT NULL DEFAULT false;

-- Tandai promo lama sebagai khusus member jika judulnya mengandung kata kunci relevan
UPDATE public.promosi 
SET is_member_only = true 
WHERE LOWER(nama) LIKE '%member%' 
   OR LOWER(nama) LIKE '%eksklusif%' 
   OR LOWER(nama) LIKE '%spesial%';
