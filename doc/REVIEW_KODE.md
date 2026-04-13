# Review Kode - Project Inventory

**Tanggal Review:** 2026-04-12  
**Skor Keseluruhan:** 4.2 / 10  
**Stack:** Next.js 15, TypeScript, Supabase, Zustand, Tailwind CSS 4

---

## 📋 Checklist Perbaikan

### 🔴 Priority 1: Critical Issues

- [x] **Hapus duplikasi Supabase Client**
  - File: `lib/supabase.ts` dan `lib/api.ts` memiliki client identik 100%
  - aksi: Hapus `lib/supabase.ts`, gunakan `lib/api.ts` sebagai satu-satunya sumber

- [x] **Tambah Error Handling untuk Semua API Calls**
  - Lokasi: Semua 17 method di `lib/api.ts`
  - Risiko: Aplikasi crash tanpa feedback user
  - aksi: Buat wrapper `safeQuery<T>()` untuk semua permintaan

- [x] **Perbaiki SQL Injection Celah**
  - Lokasi: `lib/api.ts` baris 40, 187, 196
  - Kasus: Search menggunakan string interpolation langsung pada `ilike`
  - aksi: Gunakan parameterized query `.ilike('kolom', '%', parameter, '%')`

- [x] **Perbaiki Race Condition di setActiveTemplate**
  - Lokasi: `lib/api.ts` baris 481-482
  - Risiko: Dua template bisa `is_active=true` bersamaan
  - aksi: Gunakan Supabase RPC dengan transaksi

- [x] **Tambah Await pada Query**
  - Lokasi: `lib/api.ts` baris 481
  - Kasus: `update({ is_active: false })` tidak ada `await`
  - aksi: Tambahkan `await` sebelum query

---

### 🟠 Priority 2: Performance & Reliability

- [x] **Perbaiki Infinite Re-render Loop**
  - Lokasi: `app/inventory/page.tsx` baris 52-57
  - Gejala: API call berjalan 3x saat halaman dibuka
  - aksi: Pindahkan debounce keluar useEffect, tambahkan cleanup

- [x] **Konsolidasikan Tipe Data**
  - Kasus: Ada 3 definisi `InventoryItem` berbeda
  - Lokasi: `lib/store.ts`, `types/inventory.ts`, `lib/api.ts`
  - aksi: Buat interface utama di `types/inventory.ts`, gunakan secara global

- [x] **Tambah AbortController**
  - Lokasi: Semua API calls di useEffect
  - Risiko: Request berjalan terus saat user berpindah halaman
  - aksi: Tambahkan AbortController pada setiap request

- [x] **Tambah Input Validation**
  - Lokasi: Semua method submit
  - Risiko: Data corrupt, negative stock, harga negatif
  - aksi: Implementasi Zod schema validation

- [x] **Fix Debounce Memory Leak**
  - Lokasi: `app/inventory/page.tsx`
  - Kasus: Instance debounce dibuat ulang setiap render
  - aksi: Gunakan `useRef` untuk menyimpan instance

---

### 🟡 Priority 3: Code Quality

- [x] **Ekstrak Magic Numbers ke Konstanta**
  - Contoh: `300ms`, `1000`, `20` limit
  - aksi: Buat file `lib/constants.ts`

- [x] **Tambah JSDoc pada Public API Functions**
  - Lokasi: `lib/api.ts`
  - aksi: Tambahkan dokumentasi untuk semua exports

- [x] **Hapus Explicit `any` Type**
  - Lokasi: `lib/api.ts` baris 352, 354, 412, 415
  - aksi: Definisikan tipe yang tepat

- [x] **Aktifkan Komponen Toast**
  - Lokasi: Toast sudah disetup di `app/layout.tsx` tapi tidak digunakan
  - aksi: Integrasikan Toast untuk notifikasi

- [x] **Tambah Konfigurasi Security Headers**
  - Lokasi: `next.config.ts`
  - aksi: Tambahkan security headers untuk production

- [x] **Buat Unit Tests**
  - Kasus: Tidak ada unit test sama sekali
  - aksi: Setup testing framework dan tulis tests untuk critical functions

---

### 🔵 Priority 4: Arsitektur Jangka Panjang

- [x] **Pecah File API per Modul**
  - Sekarang: Semua API di satu file `lib/api.ts`
  - aksi: Pisahkan ke `api/inventory.ts`, `api/pembelian.ts`, `api/reports.ts`

- [x] **Ganti Manual Fetch dengan React Query / SWR**
  - Manfaat: Caching, dedupe request, background refetch
  - aksi: Install dan implementasi TanStack Query

- [x] **Tambah Error Boundary**
  - Lokasi: Root layout
  - aksi: Buat component ErrorBoundary untuk graceful error handling

- [ ] **Implementasi Logging & Error Tracking**
  -工具: Sentry, LogRocket, atau similar
  - aksi: Setup error tracking untuk production

---

## 📊 Penilaian per Aspek

| Aspek | Nilai (1-10) |
|-------|--------------|
| Struktur direktori | 8/10 |
| TypeScript | 5/10 |
| Error Handling | 1/10 |
| Keamanan | 3/10 |
| Performa | 4/10 |
| Maintainability | 5/10 |
| Dokumentasi | 3/10 |

---

## 📁 StrukturProject

```
app/
├── inventory/page.tsx      # Infinite re-loop bug
├── pembelian/page.tsx  # -
├── return/page.tsx      # -
├── receipt/page.tsx     # -
├── reports/page.tsx   # -
└── layout.tsx         # Toast tidak aktif

components/
└── ui/Toast.tsx       # Tidak digunakan

lib/
├── api.ts              # Fixed: error handling, SQL injection, race condition, await
├── store.ts           # -
├── supabase.ts        # DELETED - consolidated to api.ts
└── utils.ts          # -

doc/
├── REVIEW_KODE.md    # File ini
└── ...
```

---

## 📝 Catatan Lain

- `harga_beli` bersifat optional padahal diperlukan untuk kalkulasi profit
- Komponen Toast sudah ada tapi tidak pernah dipanggil
- Debounce 300ms dan limit query 20/1000 digunakan di banyak tempat tanpa konstanta

---

*Generated: 2026-04-12*