# Panduan Re-Deploy & Sinkronisasi Database (Inventory & Native POS)

Dokumen ini merupakan panduan resmi untuk melakukan re-deploy database Supabase dari nol (*clean replay*) maupun menyinkronkan migrasi ke environment *staging*/*produksi* menggunakan direktori resmi `supabase/migrations/`.

---

## Prasyarat

1. Pastikan seluruh migrasi berada berurutan di folder [supabase/migrations/](file:///c:/project/inventory/supabase/migrations/).
2. Pastikan konfigurasi *Auth* dan *Environment Secrets* (seperti `SUPABASE_SERVICE_ROLE_KEY`, URL aplikasi untuk `pg_net` webhook, dan *Extensions* bawaan Supabase) tersedia di project tujuan.

---

## 1. Uji *Clean Replay* (Environment Lokal / Shadow DB)

- **Via Shadow Supabase Project (`supabase_mcp`):**
  1. Siapkan project Supabase kosong (mis. `dev_inventory`) sebagai shadow DB.
  2. Jalankan seluruh file `supabase/migrations/*.sql` secara berurutan kronologis (dari `20260101000000_core_schema.sql` hingga migrasi terbaru) menggunakan `supabase_mcp:apply_migration` / `execute_sql`.
  3. Verifikasi seluruh tabel, view, fungsi RPC, dan policy RLS terbentuk tanpa error.
- **Via Supabase CLI Lokal (jika Docker Desktop tersedia):**
  - Jalankan `npx supabase db reset` setelah `supabase init` agar seluruh `supabase/migrations/` di-replay dari nol pada container PostgreSQL lokal.

---

## 2. Deploy & Sinkronisasi ke Environment Remote (Produksi / Staging)

- Gunakan **`supabase_mcp:apply_migration`** untuk menerapkan migrasi baru ke project remote, dan selalu simpan file SQL-nya ke `supabase/migrations/YYYYMMDDHHMMSS_<nama_migrasi>.sql` di Git.
- Pastikan seluruh versi migrasi tercatat konsisten di `supabase_migrations.schema_migrations`.

> [!IMPORTANT]
> **Supabase Auth & Triggers:**
> Tabel `public.profiles` terhubung ke `auth.users` melalui fungsi trigger `public.handle_new_user()`. Pada project Supabase baru, pastikan trigger pada `auth.users` (`on_auth_user_created`) aktif dan kolom sensitif (`roles`, `default_gudang_id`) dilindungi oleh trigger `guard_profiles_sensitive_columns()`.

---

## 3. Checklist Verifikasi Pasca-Migrasi

1. **Kelengkapan Skema:** Periksa jumlah tabel di `public` (53 tabel), view utama (`vw_katalog_publik`, `vw_payroll_saldo`, `vw_customer_stats`, `v_recent_transactions`), serta RPC penting (`pay_transaction`, `approve_and_process_opname`, `tambah_pembelian_batch`).
2. **Keamanan RLS & Privileges:** Pastikan seluruh tabel publik mengaktifkan RLS, tidak ada grant akses langsung untuk `anon` pada tabel/RPC sensitif (`member_otp_sessions`, `system_config`, `wa_outbox`), dan `system_config` hanya dapat diakses admin atau `service_role`.
3. **Sinkronisasi Tipe TypeScript:** Jalankan `supabase_mcp:generate_typescript_types` dan perbarui [types/supabase.ts](file:///c:/project/inventory/types/supabase.ts) setiap kali ada perubahan DDL.
