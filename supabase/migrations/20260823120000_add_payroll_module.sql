-- Migration: Tambah Modul Payroll (Karyawan, Kehadiran, Kasbon, Slip Gaji)

CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA extensions;

-- ==========================================
-- 1. Tabel Karyawan
-- ==========================================
CREATE TABLE public.karyawan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    jam_masuk TIME NOT NULL DEFAULT '08:00:00',
    jam_pulang TIME NOT NULL DEFAULT '17:00:00',
    gaji_harian NUMERIC NOT NULL DEFAULT 0,
    denda_telat_per_jam NUMERIC NOT NULL DEFAULT 0,
    lembur_per_jam NUMERIC NOT NULL DEFAULT 0,
    nama_bank VARCHAR(100),
    no_rekening VARCHAR(100),
    status_karyawan VARCHAR(20) NOT NULL DEFAULT 'aktif' CHECK (status_karyawan IN ('aktif', 'nonaktif')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger auto-update updated_at
CREATE TRIGGER handle_updated_at_karyawan
  BEFORE UPDATE ON public.karyawan
  FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime(updated_at);

-- ==========================================
-- 2. Tabel Kehadiran
-- ==========================================
CREATE TABLE public.kehadiran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    waktu_masuk TIMESTAMPTZ NOT NULL DEFAULT now(),
    waktu_pulang TIMESTAMPTZ,
    status_hadir VARCHAR(20) NOT NULL DEFAULT 'hadir' CHECK (status_hadir IN ('hadir', 'izin', 'sakit', 'alpha', 'off')),
    menit_kerja INTEGER DEFAULT 0,
    menit_telat INTEGER DEFAULT 0,
    menit_lembur_aktual INTEGER DEFAULT 0,
    menit_lembur_disetujui INTEGER,
    status_lembur VARCHAR(20) NOT NULL DEFAULT 'tidak_ada' CHECK (status_lembur IN ('tidak_ada', 'pending', 'disetujui', 'ditolak')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, tanggal) -- Aturan: Satu user hanya boleh punya 1 record per hari
);

-- ==========================================
-- 3. Tabel Kasbon
-- ==========================================
CREATE TABLE public.kasbon (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    nominal NUMERIC NOT NULL,
    keterangan TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'disetujui', 'ditolak', 'lunas')),
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER handle_updated_at_kasbon
  BEFORE UPDATE ON public.kasbon
  FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime(updated_at);

-- ==========================================
-- 4. Tabel Slip Gaji
-- ==========================================
CREATE TABLE public.slip_gaji (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    periode_bulan VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    total_hari_hadir INTEGER NOT NULL DEFAULT 0,
    total_jam_telat NUMERIC NOT NULL DEFAULT 0,
    total_jam_lembur NUMERIC NOT NULL DEFAULT 0,
    total_gaji_harian NUMERIC NOT NULL DEFAULT 0,
    total_denda_telat NUMERIC NOT NULL DEFAULT 0,
    total_gaji_lembur NUMERIC NOT NULL DEFAULT 0,
    total_potongan_kasbon NUMERIC NOT NULL DEFAULT 0,
    gaji_bersih NUMERIC NOT NULL DEFAULT 0,
    status_pembayaran VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status_pembayaran IN ('draft', 'dibayar')),
    dibayar_pada TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, periode_bulan) -- Aturan: Satu user hanya boleh punya 1 slip per bulan
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Karyawan RLS
ALTER TABLE public.karyawan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "karyawan_select" ON public.karyawan FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "karyawan_insert_admin" ON public.karyawan FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "karyawan_update_admin" ON public.karyawan FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "karyawan_delete_admin" ON public.karyawan FOR DELETE TO authenticated USING (is_admin());

-- Kehadiran RLS
ALTER TABLE public.kehadiran ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kehadiran_select" ON public.kehadiran FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "kehadiran_insert" ON public.kehadiran FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR is_admin());
CREATE POLICY "kehadiran_update" ON public.kehadiran FOR UPDATE TO authenticated USING (user_id = auth.uid() OR is_admin()) WITH CHECK (user_id = auth.uid() OR is_admin());
CREATE POLICY "kehadiran_delete_admin" ON public.kehadiran FOR DELETE TO authenticated USING (is_admin());

-- Kasbon RLS
ALTER TABLE public.kasbon ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kasbon_select" ON public.kasbon FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "kasbon_insert" ON public.kasbon FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR is_admin());
CREATE POLICY "kasbon_update_admin" ON public.kasbon FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "kasbon_delete_admin" ON public.kasbon FOR DELETE TO authenticated USING (is_admin());

-- Slip Gaji RLS
ALTER TABLE public.slip_gaji ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slip_gaji_select" ON public.slip_gaji FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "slip_gaji_insert_admin" ON public.slip_gaji FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "slip_gaji_update_admin" ON public.slip_gaji FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "slip_gaji_delete_admin" ON public.slip_gaji FOR DELETE TO authenticated USING (is_admin());
