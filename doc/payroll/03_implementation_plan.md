# 3. Rencana Implementasi (Implementation Plan)

Dokumen ini berisi daftar langkah-langkah teknis untuk mengeksekusi integrasi sistem Payroll ke dalam project BMS.

## Fase 1: Backend & Database (Supabase)
1. **Membuat File Migrasi (SQL):**
   - Membuat file migrasi baru di direktori `supabase/migrations/` (contoh: `20260824000000_add_payroll_module.sql`).
   - Mendifinisikan 4 tabel baru (`karyawan`, `kehadiran`, `kasbon`, `slip_gaji`).
   - Membuat Foreign Keys yang menunjuk ke `auth.users`.
2. **Mengatur Row Level Security (RLS):**
   - Mengaktifkan `ENABLE ROW LEVEL SECURITY` pada keempat tabel.
   - Mengimplementasikan *policies* dengan memanfaatkan fungsi `is_admin()` yang sudah tersedia, dan fungsi `auth.uid()` untuk pengguna umum.
3. **Menerapkan Migrasi:**
   - Menjalankan perintah `supabase db push` atau apply migrasi di environment lokal.

## Fase 2: Library & API Layer (Next.js)
1. **Membuat API Hooks / Fetchers di `lib/api/`:**
   - `lib/api/payroll/karyawan.ts`: Fungsi untuk mengambil dan meng-update profil karyawan (rates, jam).
   - `lib/api/payroll/kehadiran.ts`: Fungsi untuk mencatat jam masuk, pulang, dan riwayat absensi.
   - `lib/api/payroll/kasbon.ts`: Fungsi pengajuan kasbon, list persetujuan (untuk admin), dan riwayat kasbon (untuk user).
   - `lib/api/payroll/gaji.ts`: Logika kalkulasi generate slip gaji dan mengambil riwayat.

## Fase 3: User Interface (Frontend Next.js)
1. **Integrasi Navigasi & Dashboard Utama (Existing):**
   - Mengedit `components/dashboard/MobileLaunchpad.tsx` untuk menambahkan menu "Absensi" (ikon jam) ke dalam `staffMenus`.
   - Mengedit `components/layout/Sidebar.tsx` untuk menambahkan grup menu "HR & Payroll" bagi Admin.
   - Mengedit `app/(main)/dashboard/page.tsx` untuk menambahkan widget "HR Alerts" (Notifikasi telat >30m & lembur >30m) di Bento Grid Admin.
2. **Dashboard Payroll Personal (Untuk Karyawan):**
   - Halaman `app/(main)/payroll/page.tsx`
   - Menampilkan tombol besar **Absen Masuk** / **Absen Pulang**.
   - Widget menampilkan "Gaji Berjalan (Estimasi)" bulan ini.
   - Tabel riwayat absensi personal.
3. **Menu Kasbon Personal:**
   - Halaman `app/(main)/payroll/kasbon/page.tsx`
   - Form untuk mengajukan nominal kasbon.
   - Status riwayat kasbon (Pending/Disetujui/Lunas).
4. **Dashboard Admin (HR):**
   - Halaman `app/(main)/admin/payroll/karyawan/page.tsx`: Manajemen rate gaji harian dan denda/lembur.
   - Halaman `app/(main)/admin/payroll/kasbon/page.tsx`: Modals/Tabel untuk me-review (Approve/Reject) ajuan kasbon.
   - Halaman `app/(main)/admin/payroll/gaji/page.tsx`: Tabel rekap akhir bulan untuk generate slip (PDF) dan approval lembur.

## Fase 4: Integrasi & Polishing
- **Konsistensi UI (Wajib):** Menerapkan desain komponen yang sudah ada di folder `components/ui/` (seperti `Card`, `Modal`, `DataTable`, dll) tanpa membuat CSS custom baru agar UI Payroll 100% seragam dengan desain Inventory yang telah ditingkatkan.
- Menyusun fungsi pembacaan durasi absensi dengan `date-fns` sesuai aturan Grace Period 30 menit.
- Pengujian akses: Memastikan staf biasa tidak bisa menembus halaman `/admin/payroll`.
