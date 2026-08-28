# 2. Skema Database & Keamanan (RLS)

Modul Payroll membutuhkan 4 tabel utama yang direlasikan ke dalam tabel otentikasi bawaan Supabase (`auth.users`) atau tabel `profiles` yang sudah ada. 

## 1. Tabel `karyawan`
Merupakan data HR spesifik untuk user.

- `id` (UUID, PK)
- `user_id` (UUID, FK ke `auth.users.id`, UNIQUE): Identitas akun.
- `jam_masuk` (TIME): Standar jam masuk (misal `08:00`).
- `jam_pulang` (TIME): Standar jam pulang (misal `17:00`).
- `gaji_harian` (NUMERIC): Nominal gaji tetap harian (Rp).
- `denda_telat_per_jam` (NUMERIC): Nominal potongan jika datang terlambat per jam.
- `lembur_per_jam` (NUMERIC): Nominal uang lembur per jam.
- `nama_bank` (VARCHAR): Nama bank pencairan gaji (opsional).
- `no_rekening` (VARCHAR): Nomor rekening pencairan gaji (opsional).
- `status_karyawan` (VARCHAR): `aktif` atau `nonaktif`.
- `created_at`, `updated_at` (TIMESTAMPTZ).

**Kebijakan RLS (Row Level Security):**
- **SELECT:** `user_id = auth.uid() OR is_admin()`
- **INSERT/UPDATE/DELETE:** `is_admin()`

---

## 2. Tabel `kehadiran`
Log harian absensi.

- `id` (UUID, PK)
- `user_id` (UUID, FK ke `auth.users.id`)
- `tanggal` (DATE)
- `waktu_masuk` (TIMESTAMPTZ, Nullable)
- `waktu_pulang` (TIMESTAMPTZ, Nullable)
- `status_hadir` (VARCHAR): `hadir`, `izin`, `sakit`, `alpha`, `off`
- `menit_kerja` (INTEGER)
- `menit_telat` (INTEGER)
- `menit_lembur_aktual` (INTEGER): Selisih jam pulang dengan standar.
- `menit_lembur_disetujui` (INTEGER): Menit lembur yang disetujui admin (Nullable).
- `status_lembur` (VARCHAR): `tidak_ada`, `pending`, `disetujui`, `ditolak`
- `created_at` (TIMESTAMPTZ)

*Catatan: Kombinasi `user_id` dan `tanggal` bersifat unik (UNIQUE).*

**Kebijakan RLS:**
- **SELECT:** `user_id = auth.uid() OR is_admin()`
- **INSERT:** `user_id = auth.uid() OR is_admin()`
- **UPDATE:** `user_id = auth.uid() OR is_admin()` (Hanya bisa update jika `waktu_pulang` belum terisi).
- **DELETE:** `is_admin()`

---

## 3. Tabel `payroll_mutasi`
Pencatatan ledger untuk Early Wage Access (EWA), gaji, dan penarikan/kasbon. Menggantikan tabel `kasbon`.

- `id` (UUID, PK)
- `user_id` (UUID, FK ke `auth.users.id`)
- `tanggal` (TIMESTAMPTZ)
- `jenis` (ENUM): `kredit` (penambahan), `debit` (pengurangan/penarikan)
- `kategori` (ENUM): `gaji`, `kasbon`, `pencairan`, `lainnya`
- `nominal` (NUMERIC)
- `keterangan` (TEXT)
- `status` (ENUM): `pending`, `disetujui`, `ditolak`
- `referensi_id` (TEXT, UNIQUE): ID referensi (misal dari ID kehadiran).
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Kebijakan RLS:**
- **SELECT:** `user_id = auth.uid() OR is_admin()`
- **INSERT:** `user_id = auth.uid()` (Hanya untuk `status = 'pending'`) atau `is_admin()`
- **UPDATE/DELETE:** `is_admin()`

---

## 4. Tabel `slip_gaji`
Riwayat dan rekapitulasi gaji bulanan (Snapshot).

- `id` (UUID, PK)
- `user_id` (UUID, FK ke `auth.users.id`)
- `periode_bulan` (VARCHAR): misal `2026-08`
- `total_hari_hadir` (INTEGER)
- `total_jam_telat` (NUMERIC)
- `total_jam_lembur` (NUMERIC)
- `total_gaji_harian` (NUMERIC): (total_hari_hadir * gaji_harian)
- `total_denda_telat` (NUMERIC): (total_jam_telat * denda_telat_per_jam)
- `total_gaji_lembur` (NUMERIC): (total_jam_lembur * lembur_per_jam)
- `total_potongan_kasbon` (NUMERIC)
- `saldo_awal` (NUMERIC): Saldo EWA dari bulan sebelumnya
- `total_pendapatan_bersih` (NUMERIC): Total mutasi kredit yang disetujui
- `total_penarikan` (NUMERIC): Total mutasi debit yang disetujui
- `sisa_saldo_akhir` (NUMERIC): Saldo EWA akhir bulan (saldo_awal + total_pendapatan_bersih - total_penarikan)
- `gaji_bersih` (NUMERIC): Pendapatan bersih di bulan berjalan
- `status_pembayaran` (VARCHAR): `draft`, `dibayar`
- `dibayar_pada` (TIMESTAMPTZ, Nullable)
- `created_at` (TIMESTAMPTZ)

*Catatan: Kombinasi `user_id` dan `periode_bulan` bersifat unik (UNIQUE).*

**Kebijakan RLS:**
- **SELECT:** `user_id = auth.uid() OR is_admin()`
- **INSERT/UPDATE/DELETE:** `is_admin()`
