# Panduan Re-Deploy Database (Inventory & Native POS)

Dokumen ini ditujukan bagi *developer* yang ingin melakukan deploy ulang (re-deploy) database Supabase dari awal (scratch) atau melakukan sinkronisasi database untuk environment baru (seperti staging/produksi). 

Karena sistem kita memiliki dua sisi fungsional (Supply Side di project `inventory` dan Sales Side di project `native pos`), eksekusi skrip SQL harus dilakukan dengan urutan yang tepat agar *Foreign Keys* dan dependensi tabel/kolom tidak *error*.

---

## ⚠️ Urutan Eksekusi Skrip SQL

Jalankan skrip-skrip SQL di bawah ini secara berurutan di dalam **Supabase SQL Editor** atau menggunakan *MCP Tools* / CLI Supabase.

### Tahap 1: Inisialisasi Struktur Dasar (Base Schema)
Skrip ini berisi DDL utama untuk membuat tabel-tabel fundamental (`inventory`, `pembelian`, `penjualan`, `profiles`, dll).
1. Eksekusi file: `C:\project\inventory\sql\database_schema.sql`

### Tahap 2: Migrasi & RPC Sisi Inventory (Supply Side)
Langkah ini menambahkan *flag* stok, fitur *void*, dan fungsi-fungsi RPC (seperti proses retur dan *batch pembelian*) untuk manajemen stok.
2. Eksekusi file: `C:\project\inventory\sql\migrations\001_add_discontinued_column.sql`
3. Eksekusi file: `C:\project\inventory\sql\migrations\002_combined_migrations.sql`
*(Catatan: File `002_combined_migrations.sql` sudah mencakup fungsi `get_available_return_items`, `void_pembelian_return_item`, dan script retur lainnya. Anda tidak perlu menjalankan file `supabase_func_*.sql` satu per satu jika menggunakan file kombinasi ini).*

### Tahap 3: Inisialisasi Sisi Native POS (Sales Side)
Skrip ini akan menambahkan tabel khusus kasir (`kas_log`, `receipt_templates`), mengekspansi tabel `penjualan` dengan kolom pembayaran (metode bayar, diskon, kembalian), membuat indeks, mendaftarkan fungsi RPC (`rpc.create_penjualan`, dll), serta mengaktifkan *Row Level Security* (RLS).
4. Eksekusi file: `C:\project\native pos\database\setup.sql`

### Tahap 4: Migrasi Lanjutan Sisi POS (V2 & Fixes)
Langkah terakhir menambahkan pengamanan *idempotency* untuk memastikan transaksi kasir bersifat *atomic* agar tidak *double payment*, dan menimpa fungsi return dengan perbaikan terbaru.
5. Eksekusi file: `C:\project\native pos\database\migration_v2.sql`
6. Eksekusi file: `C:\project\native pos\database\fix_rpc_return.sql`
7. Eksekusi file: `C:\project\native pos\database\enable_realtime_print_jobs.sql`

---

## Tips & Troubleshooting

> [!IMPORTANT]
> **Supabase Auth & Profiles:**
> Tabel `profiles` memiliki relasi ke `auth.users` bawaan Supabase. Pastikan integrasi antara trigger pembuatan user ke tabel `profiles` berjalan dengan baik pada environment baru.

> [!WARNING]
> **RLS (Row Level Security):**
> File `setup.sql` dari project Native POS akan mengaktifkan RLS (Enable Row Level Security) ke mayoritas tabel dan memberikan *policy access* default bagi `authenticated` user. Pastikan Anda mengatur *policy* yang lebih spesifik jika nantinya ada pemisahan peran (*role*), misalnya antara admin inventory dan kasir POS.

> [!TIP]
> **Verifikasi Schema:**
> Setelah seluruh *query* dieksekusi, Anda dapat melakukan pengecekan dengan melihat daftar *Functions (RPC)* di Dashboard Supabase. Pastikan skema `public` berisi fungsi-fungsi dari Inventory dan skema `rpc` (serta sebagian `public`) berisi fungsi-fungsi kasir dari Native POS.
