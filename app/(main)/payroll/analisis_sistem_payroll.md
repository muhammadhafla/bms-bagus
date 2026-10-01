# Analisis Sistem Payroll & Absensi

## Ringkasan Fitur Saat Ini
Sistem payroll yang ada di `app/(main)/payroll` sudah cukup komprehensif dan memiliki antarmuka (UI) yang modern. Sistem terbagi menjadi 3 halaman utama:
1. **Dashboard Absensi (`/payroll`)**: Mengelola *clock-in* dan *clock-out* menggunakan verifikasi lokasi GPS (Haversine formula), menampilkan *timer* jam kerja real-time, dan mendukung pengajuan pulang awal.
2. **Dompet & Kasbon (`/payroll/gaji`)**: Menampilkan saldo gaji/kasbon, riwayat mutasi transaksi, fitur kalender interaktif untuk melihat histori transaksi per hari, dan form pengajuan penarikan dana (kasbon).
3. **Slip Gaji (`/payroll/slip`)**: Menampilkan daftar slip gaji bulanan lengkap dengan status pembayaran dan tombol preview/unduh.

## Poin Positif (Kelebihan)
- **Real-time UX**: Menggunakan `@tanstack/react-query` dan Supabase realtime (`useRealtimeQuery`) membuat data tersinkronisasi tanpa perlu *refresh* halaman manual.
- **Toleransi GPS Fleksibel**: Logika perhitungan jarak radius toko memiliki tambahan toleransi akurasi dari *device* pengguna (maksimal 30 meter), sehingga mengurangi *false-negative* ketika GPS kurang akurat.
- **Alur Kerja Terpadu**: Terintegrasi baik dengan fitur "Pulang Lebih Awal" yang dapat otomatis memberikan notifikasi kepada Admin untuk persetujuan (melalui `notify-pulang-awal`).
- **UI/UX Menarik**: Penggunaan animasi *pulse*, indikator status berbasis warna, dan tata letak berbasis *card* memberikan pengalaman pengguna yang sangat baik (ala *mobile-first*).

## Area Peningkatan & Rekomendasi (Input)

### 1. Celah Keamanan (Anti-Spoofing)
- **Fake GPS & Spoofing**: Saat ini, validasi apakah pengguna berada di dalam radius toko dilakukan di *client-side* (frontend) pada baris 116-141 di `page.tsx`. Jika pengguna memanipulasi lokasi melalui aplikasi "Mock Location" atau mengubah kode frontend, mereka dapat melakukan absen dari rumah.
  - *Rekomendasi*: Frontend hanya bertugas mengirimkan koordinat (Lat, Lng) ke backend (Supabase Edge Function / API route). Validasi valid/tidaknya jarak (Radius) **wajib dilakukan di backend** sebelum menyimpan data kehadiran.
- **Manipulasi Waktu Perangkat (Device Time)**: Jam yang tampil di layar dan logika deteksi "Pulang Awal" mengandalkan jam internal HP/Laptop pengguna (`new Date()`). Jika pengguna memajukan jam di HP-nya, ia bisa melewati peringatan "Pulang Awal".
  - *Rekomendasi*: Saat aplikasi pertama *load*, sinkronisasikan `time` dengan *Server Time* dari API, lalu jalankan *timer* berdasarkan selisih waktu tersebut (bukan murni dari `Date.now()` lokal).

### 2. Batas Pengajuan Kasbon (Kebijakan Finansial)
- Pada halaman `/payroll/gaji`, karyawan bisa mengajukan kasbon/penarikan dana jika nominal melebihi saldo mereka (dengan peringatan kuning). Namun tidak ada *hard limit* atau batas maksimal dari sistem (misalnya: maksimal 50% dari estimasi gaji bulan ini).
  - *Rekomendasi*: Tambahkan logika validasi batas maksimum kasbon, baik di sisi frontend maupun di backend `mutasiApi.requestPenarikan`, berdasarkan *role* atau persentase gaji pokok pengguna.

### 3. Ketahanan Koneksi (Offline Support)
- Sistem GPS dan proses absensi sangat bergantung pada jaringan internet saat itu juga. Jika sinyal di toko jelek (misal di area gudang), karyawan akan kesulitan *clock-in/out*.
  - *Rekomendasi*: Implementasikan *offline queueing*. Jika pengguna mencoba absen namun koneksi terputus, simpan aksi absen (beserta *timestamp* dan GPS saat itu) di `indexedDB` (local storage), lalu otomatis *sync* ke server ketika koneksi kembali *online*.

### 4. Optimalisasi Performa Kalkulasi Jarak
- Pada fungsi `getDistanceFromLatLonInM`, perhitungan *Haversine* terus-menerus berjalan setiap ada perubahan koordinat (yang mana dari `watchPosition` bisa terjadi setiap detik). Meskipun ringan untuk perangkat modern, ini bisa di-*debounce* atau dikurangi frekuensinya jika daftar toko (`stores`) sangat banyak.

### 5. Keamanan Push Notification
- Pada `page.tsx` baris 242, pemanggilan `/api/push/notify-pulang-awal` berjalan setelah absen pulang awal berhasil di-*trigger*. Jika permintaan ke API ini gagal (misal *timeout*), absen tetap tercatat namun Admin tidak menerima notifikasi.
  - *Rekomendasi*: Gunakan pola Supabase Database Webhooks / Database Triggers. Biarkan backend yang otomatis memicu *push notification* ketika mendeteksi *insert/update* record kehadiran dengan `status_pulang_awal = 'pending'`, alih-alih mengandalkan HTTP call dari frontend.
