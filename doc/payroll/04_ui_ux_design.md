# 4. Rancangan UI/UX (Bagus Management System - Payroll)

Rancangan UI/UX ini mengusung konsep **Mobile-First** (karena karyawan mayoritas akan absen via HP) namun tetap responsif dan informatif saat diakses Admin via Desktop/Tablet. 

> [!IMPORTANT]
> **ATURAN KONSISTENSI UI:** Seluruh halaman dan komponen Payroll (baik di Mobile maupun Desktop) **wajib** terlihat konsisten 100% dengan halaman lain di BMS. Kita **harus** me-reuse (pakai ulang) komponen desain premium yang sudah ada (seperti `Card`, `Modal`, `DataTable`, `btn-modern`, *badges*, warna sistem, *dark mode*, dan *spacing*) dan tidak boleh membuat gaya desain baru yang melenceng dari tema utama aplikasi.

---

## 1. Halaman Karyawan (Tampilan Mobile)

### A. Dashboard Utama (`/payroll`)
Halaman pertama saat karyawan login. Didesain fokus pada aksi utama (Absensi) dan motivasi kerja (Estimasi Gaji).

- **Header / Salam:** "Halo Budi, selamat pagi! Jangan lupa absen."
- **Widget Utama (Action Card):**
  - Berisi jam digital berjalan secara real-time.
  - **Tombol Absen Raksasa (Circular/Rounded-XL):** 
    - Jika belum absen: Warna **Oranye** bertuliskan "Absen Masuk".
    - Jika sudah absen masuk: Warna **Merah** bertuliskan "Absen Pulang".
- **Widget Motivasi (Info Card):**
  - Menampilkan ringkasan: "Total Kehadiran Bulan Ini: 15 Hari" dan "Estimasi Gaji Sementara: Rp 1.500.000".
- **Tabel Riwayat 7 Hari Terakhir:**
  - Menggunakan list sederhana. Menampilkan Tanggal, Jam Masuk, Jam Pulang, dan *Badge* kehadiran.
  - **Lembur:** Hanya menampilkan nominal menit/jam lembur **apabila sudah disetujui** oleh Admin. (Status *Pending* atau *Ditolak* disembunyikan agar tampilan tetap rapi dan tidak membingungkan staf).

### B. Halaman Kasbon (`/payroll/kasbon`)
- **Card Sisa Gaji:** Menampilkan batas maksimal kasbon (opsional) atau gaji berjalan.
- **Form Pengajuan:** 
  - Input Nominal (Rp) bergaya *Modern Price Input*.
  - Catatan/Keterangan (Textarea).
  - Tombol Submit "Ajukan Kasbon".
- **Histori:**
  - List pengajuan sebelumnya dengan *Badge* status (🟡 Pending, 🟢 Disetujui, ⚪ Lunas).

### C. Halaman Slip Gaji (`/payroll/slip`)
- Daftar bulan (Agustus 2026, Juli 2026).
- Jika diklik, memunculkan **Modal** berdesain struk/slip gaji rapi dengan rincian (Gaji Pokok, Denda, Lembur, Potongan).
- Tersedia tombol "Download PDF".

---

## 2. Halaman Admin (Tampilan Desktop / Tablet)

Admin memiliki kontrol terpusat yang diintegrasikan ke *Sidebar* utama BMS dengan nama grup **HR & Payroll**.

### A. Dashboard HR (`/admin/payroll`)
Halaman ringkasan eksekutif (Overview).
- **Statistik Cepat:** Total pengeluaran gaji bulan lalu, jumlah staf masuk hari ini, dan **Notifikasi Review**.
- **Panel "Butuh Tinjauan" (Notification Center):**
  - Akan muncul alert merah: "2 Karyawan Telat > 30 Menit" atau "1 Pengajuan Lembur > 30 Menit".
  - Admin bisa langsung klik *Review* dari panel ini tanpa harus mencari datanya.

### B. Master Data Karyawan (`/admin/payroll/karyawan`)
- **Tabel Data:** Menggunakan komponen `DataTable`.
- **Kolom:** Nama, Jam Masuk, Jam Pulang, Gaji Harian, Status.
- **Aksi:** Tombol "Edit" (memunculkan *Modal* untuk ubah rate gaji harian, denda telat/jam, lembur/jam).

### C. Approval Kasbon (`/admin/payroll/kasbon`)
- **Tabel Antrean:** Menampilkan semua kasbon berstatus *Pending*.
- **Aksi Cepat:** Tombol [Setujui] dan [Tolak] di setiap baris. Jika disetujui, kasbon resmi menjadi hutang aktif karyawan.

### D. Rekap & Tutup Buku (`/admin/payroll/gaji`)
- **Filter Bulan & Tahun:** Menggunakan komponen `DateRangePicker` atau pemilih bulan.
- **Tabel Rekapitulasi (Draft):** 
  - Menampilkan daftar semua staf, Total Kehadiran, Total Lembur Disetujui, Total Denda, Total Potongan Kasbon, dan **Gaji Bersih**.
  - Admin bisa mengecek ulang di sini.
- **Tombol Aksi Utama:** **[Generate Slip Bulan Ini]**
  - Sistem akan mengunci data (menyimpan *snapshot* ke tabel `slip_gaji`).
  - Setelah di-generate, muncul opsi "Print Semua Struk/Slip" (PDF).
