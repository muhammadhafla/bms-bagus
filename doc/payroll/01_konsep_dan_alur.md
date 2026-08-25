# 1. Konsep dan Alur Sistem Payroll BMS

## Latar Belakang
Modul Payroll ini memigrasikan sistem absensi dan kasbon yang sebelumnya berjalan di Google Apps Script (berbasis Google Spreadsheet) ke dalam ekosistem Next.js & Supabase milik Bagus Management System (BMS). 

Perubahan mendasar pada modul baru ini adalah pergeseran dari sistem **Shared-Device (Kiosk)** menjadi **User-Based Login**. Karena saat ini setiap karyawan sudah memiliki akun untuk login ke BMS, proses pencatatan data menjadi jauh lebih aman, akurat, dan dapat dilindungi secara ketat di level database.

---

## Pembagian Peran (Role-Based Access Control)
Sistem menggunakan otentikasi bawaan Supabase. Peran dipisahkan antara `Admin` (melalui fungsi `is_admin()`) dan `Karyawan` (berdasarkan `auth.uid()`).

| Fitur | Karyawan (Staf) | Admin |
| :--- | :--- | :--- |
| **Profil & Rate Gaji** | Hanya bisa melihat profil sendiri (Read-only). | Full Access (Bisa mengubah rate gaji, jadwal). |
| **Absensi** | Bisa absen masuk/pulang untuk dirinya sendiri & melihat histori. | Full Access (Bisa mengedit absen jika ada kesalahan). |
| **Kasbon** | Bisa mengajukan kasbon (status *Pending*) & melihat histori hutang. | Full Access (Menerima/menolak kasbon, menandai lunas). |
| **Slip Gaji** | Hanya bisa melihat dan mengunduh slip gajinya sendiri. | Full Access (Generate slip tiap bulan & rekapitulasi). |

---

## Visualisasi Alur Data (Data Flow)

```mermaid
flowchart TD
    %% Entitas
    Admin([Admin])
    Karyawan([Karyawan / Login Mandiri])
    
    %% Proses Master Data
    subgraph MasterData [1. Persiapan Master Data]
        A1[Setup Profil & Rate Gaji] -->|Admin Insert/Update| DB_K[Tabel: karyawan]
    end
    
    %% Proses Harian
    subgraph Harian [2. Operasional Harian]
        K1[Klik Absen Masuk] -->|Insert waktu_masuk| DB_H[Tabel: kehadiran]
        K2[Klik Absen Pulang] -->|Update waktu_pulang| DB_H
        K2 -.->|Auto-kalkulasi Menit Kerja & Lembur| DB_H
        
        K3[Ajukan Kasbon] -->|Insert (Status: Pending)| DB_B[Tabel: kasbon]
        A_B[Approve Kasbon] -->|Update (Status: Disetujui)| DB_B
    end
    
    %% Proses Akhir Bulan
    subgraph AkhirBulan [3. Tutup Buku (Akhir Bulan)]
        A2[Generate Slip Gaji]
        
        DB_H -.->|Agregasi Menit Kerja & Lembur| A2
        DB_B -.->|Sum(Kasbon Disetujui)| A2
        DB_K -.->|Ambil Rate Gaji Saat Ini| A2
        
        A2 -->|Simpan Snapshot Gaji| DB_S[Tabel: slip_gaji]
        DB_S -.->|Update Kasbon Terpotong jadi Lunas| DB_B
    end

    %% Relasi
    Admin -->|Kelola| A1
    Admin -->|Approve| A_B
    Admin -->|Generate| A2
    Karyawan -->|Buka HP| K1
    Karyawan -->|Buka HP| K2
    Karyawan -->|Buka HP| K3
```

## Proses Absensi Harian & Grace Period (Toleransi 30 Menit)
1. Karyawan login menggunakan akunnya masing-masing.
2. Tidak perlu memilih nama. Karyawan cukup menekan tombol "Absen Masuk".
3. Sistem mencatat `waktu_masuk` di tabel `kehadiran`.
4. Saat selesai bekerja, karyawan menekan "Absen Pulang". Sistem membandingkan jam aktual dengan standar profil.

**Logika Toleransi (Threshold-Based Approval):**
*   **Keterlambatan (Telat Datang):**
    *   `0 - 30 menit`: Dianggap wajar (Grace Period). Bebas denda (0 Rupiah).
    *   `> 30 menit`: Muncul peringatan di dashboard Admin. Denda akan **dihitung penuh dari menit pertama** (misal telat 45 menit = denda 45 menit, bukan 15 menit) agar kedisiplinan terjaga.
*   **Lembur (Pulang Telat):**
    *   `0 - 30 menit`: Dianggap beres-beres toko (closing). Sistem otomatis **menolak** klaim lembur (Upah = 0).
    *   `> 30 menit`: Status lembur dikunci menjadi **"Pending"** dan memunculkan notifikasi/alert ke Admin. Lembur hanya akan dibayar jika Admin menekan tombol "Setujui".
