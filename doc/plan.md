# 📌 Implementation Plan — BMS Inventory App

> Tanggal: 2026-07-17
> Tujuan: merangkum hasil audit dan menyusun rencana perubahan berfokus pada auth, UI dialog, query state, dan technical debt yang paling berdampak.

---

## 1. Ringkasan

Audit menunjukkan bahwa sebagian besar custom code masih layak dipertahankan, tetapi ada dua area utama yang perlu refactor:

1. **Auth / session state**
   - akar masalah lebih ke arsitektur custom, bukan dependensi library.
   - kurangi polling, gunakan event Supabase, pindahkan profile fetch ke TanStack Query.

2. **Dialog / modal / focus management**
   - manfaat nyata jika migrasi ke `@radix-ui/react-dialog`.
   - menurunkan risiko aksesibilitas tanpa ikut menambah banyak logika UI.

Area lain yang tetap custom tetapi perlu dibersihkan:
- `fetchApi` tetap custom
- `DataTable` tetap custom
- `Sidebar state` tetap custom
- `Keyboard shortcuts` tetap custom
- `CSV export` bisa dipertimbangkan memakai `papaparse` yang sudah ada

---

## 2. Tujuan Plan

- Menjaga stabilitas aplikasi saat refactor
- Kurangi technical debt dengan perubahan minimal yang berdampak besar
- Hindari migrasi library massal tanpa kebutuhan jelas
- Tingkatkan maintainability dan aksesibilitas pada area paling kritis

---

## 3. Scope Rencana

### 3.1 Prioritas Tinggi

- Refactor auth / session state
- Migrasi dialog overlay ke Radix
- Perbaiki middleware CSP hardcode dan environment validation

### 3.2 Prioritas Menengah

- Tingkatkan penggunaan TanStack Query di profile / data fetching
- Konsolidasi retry / safeQuery internal
- Perkuat validasi Zod bila ada validasi manual berlebihan di UI

### 3.3 Prioritas Rendah

- Pertahankan `fetchApi` custom
- Pertahankan `DataTable` custom
- Biarkan `Sidebar state` dan `Keyboard shortcuts` custom selama sederhana
- Pertimbangkan `papaparse.unparse` untuk `exportToCSV`

---

## 4. Rencana Tindakan

### Phase 1 — Stabilitas Auth

1. Review `lib/auth.ts` dan `components/AuthProvider.tsx`
2. Hapus polling periodik yang tidak perlu
3. Gunakan `supabase.auth.onAuthStateChange` sebagai mekanisme utama
4. Tambahkan expiry-based refresh bila perlu, bukan interval 60s
5. Pindahkan profile loading ke TanStack Query dengan `enabled: !!user`
6. Pastikan `ProtectedRoute` tetap ringan karena middleware server-side sudah melindungi route
7. Buat modul terpisah:
   - `auth/session.ts`
   - `auth/profile.ts`
   - `auth/store.ts`
   - `auth/provider.tsx`

### Phase 2 — Dialog & Aksesibilitas

1. Angkat `Modal`, `SlideOver`, `ConfirmDialog` dari custom ke `@radix-ui/react-dialog`
2. Gunakan `@radix-ui/react-portal` bila diperlukan
3. Hapus custom focus trap dan scroll lock dari komponen yang dipindahkan ke Radix
4. Pastikan perilaku close on backdrop click, escape key, dan nested dialog
5. Tambahkan test aksesibilitas bila belum ada

### Phase 3 — TanStack Query & Data Fetching

1. Review penggunaan `useQuery` dan `useMutation`
2. Pastikan fallback fetch internal tidak memakai manual `retry` untuk mutation
3. Konsolidasikan `safeQuery` / `retryWithBackoff` hanya untuk kasus Supabase query yang memerlukan retry
4. Jika ada manual loading state yang duplikat, gunakan status `isLoading`, `isError`, `data` dari React Query
5. Perbaiki invalidation query di komponen yang memanggil mutasi

### Phase 4 — Validasi & Util

1. Audit `lib/validation.ts` untuk batas `.max()`, regex, dan schema domain spesifik
2. Pastikan form-level error di `login`, `NewItemDialog`, `EditUserModal`, dan halaman lain masih konsisten
3. Identifikasi util generic yang bisa dipindahkan ke library, tanpa mengganti util domain
4. Untuk `exportToCSV`, evaluasi apakah memakai `papaparse.unparse` lebih baik karena dependency sudah ada

---

## 5. Deliverables

- `doc/plan.md` (dokumen ini)
- `lib/auth.ts` refactor modular
- `components/AuthProvider.tsx` dengan lebih sedikit polling
- `components/ui/Modal.tsx`, `SlideOver.tsx`, `ConfirmDialog.tsx` berbasis Radix
- `middleware.ts` CSP generik berdasarkan env
- `lib/validation.ts` schema lebih kuat bila perlu
- `lib/api/retry.ts` / `lib/api/utils.ts` internal lebih konsisten
- `lib/utils.ts` `exportToCSV` optional pake `papaparse`

---

## 6. Estimasi Waktu

- Phase 1 (Auth): 2–3 hari
- Phase 2 (Dialog): 1–2 hari
- Phase 3 (Query): 1–2 hari
- Phase 4 (Validasi/Util): 1 hari

Total: **5–8 hari kerja** jika dikerjakan berurutan.

---

## 7. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Auth refactor memecah session flow | Jalankan regression manual pada login/logout, token refresh, dan halaman berpagar | 
| Migrasi modal mengubah interaksi keyboard | Tambahkan test aksesibilitas dan manual smoke test | 
| TanStack Query misuse memicu duplicate fetch | Periksa query keys dan invalidation sebelum merge | 
| Memperkenalkan template dependency baru tanpa kebutuhan | Jangan tambahkan library baru kecuali ada manfaat konkret |

---

## 8. Catatan Penting

- `@supabase/auth-helpers-*` tetap dianggap opsi, bukan keputusan wajib.
- Fokus utama harus pada **arsitektur custom auth**, bukan hanya mengganti dependency.
- Hanya pindahkan util generic ke library jika benar-benar mengurangi kompleksitas dan bukan hanya menambah dependensi.
- `Dialog → Radix` adalah rekomendasi yang paling kuat di audit ini.

---

## 9. Follow-up

Jika plan ini disetujui, langkah selanjutnya adalah membuat tiket teknis untuk:
- auth refactor modular
- Radix dialog migration
- CSP / env validation cleanup
- TanStack Query review dan perbaikan
- Zod schema hardening
