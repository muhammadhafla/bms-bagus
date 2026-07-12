# 📋 Audit Implementasi Plan — BMS Inventory App
> Diperiksa pada: 2026-07-10 | Status: **16/20 tasks selesai, 4 tasks belum/parsial**

---

## 🚨 Sprint 1 — Keamanan Kritis

| Task | Status | Catatan |
|------|--------|---------|
| **1.1** Auth Helper `lib/api/auth-guard.ts` | ✅ **SELESAI** | File ada, `verifyAuth` & `createAdminClient` implementasi persis sesuai plan |
| **1.2** Fix Auth 6 API Routes | ✅ **SELESAI** | Semua 6 route (`print/route.ts`, `print/history`, `print/jobs/[id]`, `print/jobs/pending`, `templates/route.ts`, `templates/[id]`) sudah menggunakan `verifyAuth` |
| **1.3** Fix User Enumeration Login | ✅ **SELESAI** | Login page (baris 75) sudah menampilkan `'Email/username atau password salah'` — tidak lagi ekspos "Username tidak ditemukan" |
| **1.4** Fix Auth Default Case | ✅ **SELESAI** | `lib/auth.ts` baris 375–381: default case tidak lagi force logout, hanya set `initialized: true` jika belum |
| **1.5** Fix Env Validation & `.env.example` | ✅ **SELESAI** | `lib/auth.ts` baris 9–11 punya throw error, `.env.example` mendokumentasikan 3 variabel |
| **1.6** Fix CSP — Hapus URL Hardcode | ⚠️ **PARSIAL** | `next.config.ts` sudah tidak punya CSP hardcode, tapi **`middleware.ts` baris 44 masih hardcode** `letxagpmrumwcjuzruyg.supabase.co`! CSP tetap bocor project ref |

---

## 🐛 Sprint 2 — Bug Data Integrity

| Task | Status | Catatan |
|------|--------|---------|
| **2.1** Fix `getCount()` Bug Pembelian & Penjualan | ✅ **SELESAI** | `pembelian.ts` baris 173: langsung destructure `{ count, error }` dari query dengan `head: true` — benar, tidak lagi `data?.length` |
| **2.2** Fix `processOpnameAdjustments` → RPC | ✅ **SELESAI** | `stockAdjustment.ts` baris 73: sudah pakai `supabase.rpc('process_opname_adjustments', ...)` — atomic transaction |
| **2.3** Fix `reports.ts` → Server-Side Aggregation | ✅ **SELESAI** | `getSalesReport` sudah pakai `supabase.rpc('get_sales_report', ...)` — tidak lagi full table scan ke client |
| **2.4** Fix Dashboard Profit Calculation | ✅ **SELESAI** | `dashboard.ts` menggunakan `rpc('get_today_profit')` dengan `cost_at_sale` — komentar eksplisit "Profit = revenue - cost_at_sale (HPP)" |
| **2.5** Tambah `middleware.ts` Server-Side Protection | ✅ **SELESAI** | `middleware.ts` ada, menggunakan `@supabase/ssr`, cek session & redirect ke login |

---

## 🛠️ Sprint 3 — Kualitas Kode UI

| Task | Status | Catatan |
|------|--------|---------|
| **3.1** Fix PriceInput CSS Injection | ❌ **BELUM** | `PriceInput.tsx` baris 252–260 **masih ada** `document.createElement('style')`. CSS tidak dipindah ke `globals.css` |
| **3.2** Fix Toast Auto-Focus & setInterval | ❌ **BELUM** | Toast masih punya `setInterval` (baris 66) dan `currentToast.focus()` (baris 89). ID masih `Date.now()`, belum `crypto.randomUUID()` |
| **3.3** Refactor `layout.tsx` → Custom Hook | ❌ **BELUM** | `hooks/useSidebarState.ts` tidak ada (hanya `lib/hooks/useFocusTrap.ts`). Belum ada hook sidebar terpisah |
| **3.4** Fix SlideOver Animasi | ⚠️ **PARSIAL** | `SlideOver.tsx` sudah pakai class `animate-slide-in` (baris 57), tapi `globals.css` hanya punya `animate-slide-in-right`, **tidak ada `animate-slide-in`** yang sesuai! Animasi tidak akan berfungsi |
| **3.5** Fix Modal `body.overflow` Bug (Nested Modal) | ❌ **BELUM** | `Modal.tsx` & `SlideOver.tsx` masih pakai pola manual `document.body.style.overflow = 'hidden'/'unset'` tanpa counter. Bug nested modal masih ada |
| **3.6** Fix ProtectedRoute Flash of Content | ✅ **SELESAI** | `ProtectedRoute.tsx` baris 36–38: jika `!user` return `null`, tidak render children. Loading spinner saat `!initialized` ada |
| **3.7** Konsolidasi RiwayatPembelian & Penjualan | ❌ **BELUM** | `TransactionHistoryTable.tsx` tidak ada. Kedua file masih terpisah tanpa shared abstraksi |
| **3.8** Fix CSS Duplikat & Tailwind Config Conflict | ⚠️ **PARSIAL** | `.focus-ring` **masih duplikat** di `globals.css` baris 330–335 dan 338–345. `prefers-reduced-motion` **belum ada** |

---

## ⚡ Sprint 4 — Refactoring & Peningkatan

| Task | Status | Catatan |
|------|--------|---------|
| **4.1** Fix `stockOpname.ts` — Hapus Import UI Store | ❌ **BELUM** | `stockOpname.ts` baris 3: `import { useAuthStore } from '@/lib/auth'` **masih ada**. Dipakai di `approve()` (baris 235) dan `reject()` (baris 260) |
| **4.2** Fix `retryWithBackoff` pada Mutasi | ❌ **BELUM** | `safeQuery` di `utils.ts` tidak punya parameter `isMutation`. Semua operasi (termasuk INSERT/UPDATE/DELETE) masih di-retry otomatis |
| **4.3** Fix `client.ts` — Pisahkan dari Auth Module | ⚠️ **PARSIAL** | `lib/api/client.ts` hanya `export { supabase } from '../auth'` — re-export dari `auth.ts`. **`lib/supabase.ts` (standalone file) tidak ada**. Circular dependency risk masih ada |
| **4.4** Fix Tooltip Keyboard Accessibility | ❌ **BELUM** | `Tooltip.tsx` hanya punya `onMouseEnter/Leave`. **Tidak ada `onFocus/onBlur`**, tidak ada `role="tooltip"` |
| **4.5** Fix `package.json` Dependencies | ⚠️ **PARSIAL** | Dev tools masih di `dependencies` (bukan `devDependencies`): `@tailwindcss/postcss`, `autoprefixer`, `postcss`, `eslint`, dll. TypeScript masih `^6.0.2` (beta) |
| **4.6** Tambah `max` Validation ke Zod Schemas | ❌ **BELUM** | `validation.ts`: tidak ada `.max()` constraint, tidak ada `createUserSchema`, tidak ada validasi regex tanggal |

---

## 📊 Ringkasan

| Sprint | Total | ✅ Selesai | ⚠️ Parsial | ❌ Belum |
|--------|-------|-----------|------------|---------|
| Sprint 1 (Security) | 6 | 5 | 1 | 0 |
| Sprint 2 (Data Bug) | 5 | 5 | 0 | 0 |
| Sprint 3 (UI Quality) | 8 | 2 | 2 | 4 |
| Sprint 4 (Refactoring) | 6 | 0 | 3 | 3 |
| **TOTAL** | **25** | **12** | **6** | **7** |

> [!IMPORTANT]
> Sprint 1 & 2 hampir selesai semua — bagus! Sprint 3 & 4 banyak yang belum dikerjakan.

---

## 🔥 Yang Perlu Segera Diperbaiki (Prioritas)

### 1. CSP Hardcode di middleware.ts (Task 1.6 — KRITIS)
`middleware.ts` baris 44 masih hardcode project ref Supabase:
```typescript
// SEKARANG (bocor):
connect-src 'self' https://letxagpmrumwcjuzruyg.supabase.co ...

// HARUS diganti dengan:
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname
  : '*.supabase.co';
// Di CSP string:
connect-src 'self' https://${supabaseHost} wss://${supabaseHost};
```

### 2. `animate-slide-in` class tidak terdefinisi (Task 3.4)
SlideOver pakai class `animate-slide-in` tapi globals.css hanya punya `animate-slide-in-right`. Tambahkan:
```css
@keyframes slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@utility animate-slide-in {
  animation: slide-in 0.25s ease-out forwards;
}
```

### 3. `.focus-ring` duplikat di globals.css (Task 3.8)
Baris 330–335 dan 338–345 identik. Hapus salah satu.

### 4. Task 3.1 — PriceInput CSS Injection masih ada
Blok `document.createElement('style')` baris 252–260 belum dihapus.

### 5. Task 3.2 — Toast masih ada `setInterval` + `focus()`
`setInterval` dan `currentToast.focus()` masih ada, belum diganti CSS animation.

### 6. Task 4.1 — `useAuthStore` import di stockOpname.ts
Masih ada `import { useAuthStore }` di API layer.

### 7. Task 4.4 — Tooltip tidak accessible via keyboard
Tidak ada `onFocus/onBlur` dan `role="tooltip"`.

### 8. Task 4.6 — Zod schemas tanpa `.max()` dan `createUserSchema`
Validasi lemah — tidak ada batasan panjang maksimal string.
