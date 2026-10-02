# Struktur Project & Panduan Arsitektur: bms-bagus (Inventory)

Project ini adalah aplikasi web (kemungkinan besar menggunakan **Next.js App Router**) dengan **Supabase** sebagai backend/database.

## Struktur Direktori Utama

- `app/` - Direktori utama Next.js App Router.
  - `(auth)/` - Route group untuk halaman autentikasi (login, register).
  - `(main)/` - Route group untuk halaman utama aplikasi / dashboard yang terautentikasi.
  - `api/` - Next.js API Routes (Backend Endpoints).
  - `offline/` - Halaman/asset untuk mode offline (PWA).
- `components/` - Komponen React yang dikelompokkan berdasarkan fitur atau UI.
  - `ui/` - Komponen dasar UI (misalnya tombol, input, modal).
  - `layout/` - Komponen pembungkus halaman (Sidebar, Header).
  - `analytics/`, `dashboard/`, `inventory/`, `payroll/`, `pembelian/`, `promo/`, `purchasing/`, `role/`, `transactions/`, `warehouse/` - Komponen spesifik per modul fitur.
- `lib/` - Utilities dan logika inti aplikasi.
  - `api/` - Fungsi-fungsi *data fetching* ke backend.
  - `store/` - State management (misalnya Zustand/Redux).
  - `hooks/` - Custom hooks (ada juga di root direktori `hooks/`).
  - `utils/` - Fungsi helper umum.
  - `constants/` - Variabel konstan yang digunakan di seluruh aplikasi.
- `hooks/` - Custom React hooks level atas.
- `types/` - Definisi tipe TypeScript interface/type.
- `public/` - Aset statis seperti `images/`, icon, font.
- `supabase/` - Konfigurasi dan migrasi database Supabase.
  - `migrations/` - File SQL migrasi database.
  - `docs/` - Dokumentasi spesifik Supabase.
- `worker/` - Service worker file (kemungkinan untuk PWA/background sync).
- `doc/` & `docs/` - Dokumentasi project umum dan modul spesifik seperti gudang dan payroll.

## Konvensi yang Diharapkan
1. **Pemisahan Komponen:** UI dasar ada di `components/ui`, sedangkan UI spesifik fitur ada di foldernya masing-masing (misal `components/inventory`).
2. **Database:** Semua interaksi skema database diatur melalui `supabase/migrations`.
