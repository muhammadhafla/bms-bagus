# 🗺️ Implementation Plan — BMS Inventory App

> Berdasarkan hasil audit mendalam tanggal 3 Juli 2026
> Total estimasi: **3–4 minggu** | **4 Sprint**

---

## Metodologi

Setiap sprint bersifat **independen dan dapat di-deploy secara terpisah**. Prioritas diurutkan berdasarkan:

1. **Risk** — dampak keamanan & integritas data
2. **Impact** — seberapa banyak user/data yang terpengaruh
3. **Effort** — estimasi waktu pengerjaan

---

## 🚨 Sprint 1 — Keamanan Kritis (Hari 1–3)

> **Goal:** Menutup semua celah keamanan yang bisa dieksploitasi saat ini juga.

---

### Task 1.1 — Buat Auth Helper Terpusat untuk API Routes

**Estimasi:** 1 jam  
**File baru:** `lib/api/auth-guard.ts`

Sebelum memperbaiki 6 endpoint, buat helper yang reusable agar tidak duplikasi kode verifikasi di setiap file.

```typescript
// lib/api/auth-guard.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function verifyAuth(
  request: Request,
): Promise<
  { user: { id: string; email?: string }; error: null } | { user: null; error: NextResponse }
> {
  const token = request.headers.get('Authorization')?.split('Bearer ')[1];
  if (!token) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const admin = createAdminClient();
  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { user, error: null };
}
```

**Acceptance Criteria:**

- [ ] File `lib/api/auth-guard.ts` dibuat
- [ ] Helper `verifyAuth` mengembalikan union type yang type-safe
- [ ] Helper `createAdminClient` tidak ekspos service key

---

### Task 1.2 — Fix Autentikasi 6 API Routes Print & Templates

**Estimasi:** 2–3 jam  
**File yang dimodifikasi:**

- `app/api/print/route.ts`
- `app/api/print/history/route.ts`
- `app/api/print/jobs/[id]/route.ts`
- `app/api/print/jobs/pending/route.ts`
- `app/api/templates/route.ts`
- `app/api/templates/[id]/route.ts`

**Pola perbaikan yang konsisten di semua file:**

```typescript
// SEBELUM (vulnerable):
export async function GET(request: Request) {
  const supabase = getSupabaseClient(request); // token tidak pernah diverifikasi!
  // ...query dengan service role...
}

// SESUDAH (aman):
import { verifyAuth, createAdminClient } from '@/lib/api/auth-guard';

export async function GET(request: Request) {
  const { user, error } = await verifyAuth(request);
  if (error) return error; // early return jika tidak authenticated

  const supabase = createAdminClient();
  // ...query sama seperti sebelumnya...
}
```

**Acceptance Criteria:**

- [ ] Semua 6 endpoint mengembalikan `401` jika `Authorization` header tidak ada
- [ ] Semua 6 endpoint mengembalikan `401` jika token tidak valid
- [ ] Request dengan token valid tetap berfungsi normal
- [ ] Fungsi `getSupabaseClient` lama dihapus dari semua file

---

### Task 1.3 — Fix User Enumeration di Login

**Estimasi:** 30 menit  
**File:** `app/(auth)/login/page.tsx`

```typescript
// SEBELUM (mengekspos informasi):
if (resolveError || !data) {
  setError('Username tidak ditemukan'); // ← attacker tahu username tidak ada
  return;
}

// SESUDAH (generic message):
if (resolveError || !data) {
  setError('Email/username atau password salah');
  return;
}
```

Juga samakan pesan error untuk password salah:

```typescript
// Di handleSubmit, unifikasi semua error menjadi:
setError(
  result.error?.includes('Invalid')
    ? 'Email/username atau password salah'
    : result.error || 'Login gagal',
);
```

**Acceptance Criteria:**

- [ ] Pesan error "Username tidak ditemukan" tidak muncul lagi
- [ ] Semua kegagalan login menampilkan pesan yang sama: "Email/username atau password salah"

---

### Task 1.4 — Fix Auth Default Case

**Estimasi:** 15 menit  
**File:** `lib/auth.ts` (baris 381–384)

```typescript
// SEBELUM (berbahaya):
default:
  console.warn('Unhandled auth event:', event);
  lastUserId = null;
  set({ user: null, profile: null, initialized: true, isRefreshing: false }); // force logout!

// SESUDAH (aman):
default:
  console.warn('Unhandled auth event:', event);
  // Jangan mengubah auth state untuk event yang tidak dikenal
  if (!get().initialized) {
    set({ initialized: true });
  }
  break;
```

**Acceptance Criteria:**

- [ ] Event Supabase yang tidak dikenal tidak menyebabkan logout paksa
- [ ] `initialized` tetap di-set `true` jika belum

---

### Task 1.5 — Fix Supabase Env Validation & Update .env.example

**Estimasi:** 20 menit  
**File:** `lib/auth.ts`, `.env.example`

```typescript
// lib/auth.ts — tambahkan validasi di atas:
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('[Auth] NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY wajib diisi');
}
```

```bash
# .env.example — tambahkan:
# Supabase — dapatkan dari https://app.supabase.com/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# ⚠️ SERVICE ROLE KEY — JANGAN commit ke git, hanya untuk server-side API routes
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# URL Aplikasi (untuk redirect)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Acceptance Criteria:**

- [ ] App throw error informatif jika env variable wajib tidak ada
- [ ] `.env.example` mendokumentasikan semua 3 variabel yang dibutuhkan

---

### Task 1.6 — Fix CSP — Hapus URL Hardcode Supabase

**Estimasi:** 20 menit  
**File:** `next.config.ts`

```typescript
// SEBELUM:
`connect-src 'self' https://letxagpmrumwcjuzruyg.supabase.co ...`;

// SESUDAH:
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : '';

// Di dalam headers():
`connect-src 'self' https://${supabaseHost} wss://${supabaseHost};`;
```

**Acceptance Criteria:**

- [ ] Project ref Supabase tidak hardcode di source code
- [ ] CSP masih berfungsi untuk koneksi Supabase

---

## 🐛 Sprint 2 — Bug Data Integrity (Hari 4–7)

> **Goal:** Memperbaiki bug yang menyebabkan data salah atau hilang.

---

### Task 2.1 — Fix `getCount()` Bug di Pembelian & Penjualan

**Estimasi:** 1 jam  
**File:** `lib/api/pembelian.ts` (baris 181), `lib/api/penjualan.ts`

Bug: `result.data?.length || 0` pada head query selalu `0` karena `data` bernilai `null` untuk `head: true`.

```typescript
// SEBELUM (selalu 0):
const result = await safeQuery<any[]>(async () => {
  const result = await query; // query dengan head: true
  return { data: result.data, error: result.error as Error | null };
});
return { data: result.data?.length || 0, error: null }; // data SELALU null!

// SESUDAH (benar):
const result = await safeQuery<{ count: number }>(async () => {
  const res = await query;
  return {
    data: { count: res.count ?? 0 },
    error: res.error as Error | null,
  };
});
return { data: result.data?.count ?? 0, error: null };
```

**Acceptance Criteria:**

- [ ] `purchasesApi.getCount()` mengembalikan jumlah transaksi yang benar
- [ ] `penjualanApi.getCount()` mengembalikan jumlah transaksi yang benar
- [ ] Pagination di halaman history pembelian/penjualan menampilkan total yang akurat

---

### Task 2.2 — Fix `processOpnameAdjustments` — Ganti ke Supabase RPC

**Estimasi:** 3–4 jam  
**File:** `lib/api/stockAdjustment.ts`, SQL migration baru

Saat ini ada 5+ operasi DB berurutan tanpa transaction. Jika salah satu gagal di tengah, stok sudah berubah tapi adjustment tidak tercatat.

**Solusi:** Buat Supabase database function (RPC) yang menjalankan semua operasi dalam satu atomic transaction.

```sql
-- sql/process_opname_adjustments.sql
CREATE OR REPLACE FUNCTION process_opname_adjustments(p_opname_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_count INT := 0;
BEGIN
  -- Validasi status opname
  IF NOT EXISTS (
    SELECT 1 FROM stock_opname WHERE id = p_opname_id AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Opname harus di-approve terlebih dahulu';
  END IF;

  -- Proses setiap item dalam satu transaction
  FOR v_item IN
    SELECT * FROM stock_opname_items
    WHERE stock_opname_id = p_opname_id
      AND adjusted = false
      AND difference != 0
  LOOP
    -- Insert adjustment
    INSERT INTO stock_adjustments (stock_opname_item_id, inventory_id, ...)
    VALUES (v_item.id, v_item.inventory_id, ...);

    -- Insert movement
    INSERT INTO stock_movements (inventory_id, tipe, qty, referensi)
    VALUES (v_item.inventory_id, 'ADJUSTMENT', ABS(v_item.difference), p_opname_id);

    -- Update stok
    UPDATE inventory SET stok = v_item.physical_stock WHERE id = v_item.inventory_id;

    v_count := v_count + 1;
  END LOOP;

  -- Mark items as adjusted
  UPDATE stock_opname_items SET adjusted = true WHERE stock_opname_id = p_opname_id;

  -- Update opname status
  UPDATE stock_opname SET status = 'completed' WHERE id = p_opname_id;

  RETURN jsonb_build_object('processed', v_count);
END;
$$;
```

```typescript
// lib/api/stockAdjustment.ts — ganti implementasi:
async processOpnameAdjustments(opnameId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('User not authenticated') };

  return safeQuery(async () => {
    const result = await supabase.rpc('process_opname_adjustments', {
      p_opname_id: opnameId,
      p_user_id: user.id,
    });
    return { data: result.data, error: result.error as Error | null };
  });
}
```

**Acceptance Criteria:**

- [ ] SQL RPC function dibuat dan di-migrate ke Supabase
- [ ] Proses adjustment berjalan atomic — jika gagal, rollback semua
- [ ] Error dari DB function ditampilkan ke user dengan pesan yang jelas

---

### Task 2.3 — Fix `reports.ts` — Full Table Scan ke Server-Side Aggregation

**Estimasi:** 4–6 jam  
**File:** `lib/api/reports.ts`, SQL migration baru

Saat ini semua baris `penjualan_items` ditarik ke browser lalu di-group. Pindahkan aggregasi ke PostgreSQL.

```sql
-- sql/get_sales_report.sql
CREATE OR REPLACE FUNCTION get_sales_report(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_limit INT DEFAULT 20
)
RETURNS TABLE(
  date DATE,
  total_sales NUMERIC,
  total_cash NUMERIC,
  total_qris NUMERIC,
  total_items BIGINT,
  transaction_count BIGINT,
  total_count BIGINT
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH daily_agg AS (
    SELECT
      p.tanggal AS date,
      SUM(pi.harga_final * pi.qty) AS total_sales,
      SUM(DISTINCT p.cash_amount) AS total_cash,
      SUM(DISTINCT p.qris_amount) AS total_qris,
      SUM(pi.qty) AS total_items,
      COUNT(DISTINCT pi.penjualan_id) AS transaction_count
    FROM penjualan_items pi
    JOIN penjualan p ON p.id = pi.penjualan_id
    JOIN inventory i ON i.id = pi.inventory_id
    WHERE (p_start_date IS NULL OR p.tanggal >= p_start_date)
      AND (p_end_date IS NULL OR p.tanggal <= p_end_date)
      AND (p_category_id IS NULL OR i.id_kategori = p_category_id)
    GROUP BY p.tanggal
  )
  SELECT
    da.*,
    COUNT(*) OVER() AS total_count
  FROM daily_agg da
  ORDER BY da.date DESC
  LIMIT p_limit OFFSET (p_page - 1) * p_limit;
END;
$$;
```

**Acceptance Criteria:**

- [ ] `getSalesReport` menggunakan RPC, bukan client-side aggregation
- [ ] Halaman laporan tetap berfungsi dengan data yang sama
- [ ] Response time laporan < 2 detik untuk data 1 tahun

---

### Task 2.4 — Fix Dashboard Profit Calculation

**Estimasi:** 1 jam  
**File:** `lib/api/dashboard.ts`

```typescript
// SEBELUM (salah secara akuntansi):
todayProfit = todaySales - todayPurchases; // ini bukan profit!

// SESUDAH (profit = revenue - HPP):
// Gunakan cost_at_sale dari penjualan_items jika ada, atau harga_beli_terakhir
const todayProfit = penjualanItems.reduce((acc, item) => {
  const revenue = (item.harga_final || 0) * (item.qty || 0);
  const cogs = (item.cost_at_sale || item.harga_beli || 0) * (item.qty || 0);
  return acc + (revenue - cogs);
}, 0);
```

**Acceptance Criteria:**

- [ ] Dashboard menampilkan gross profit (pendapatan - HPP), bukan selisih penjualan-pembelian
- [ ] Label di UI diperbarui menjadi "Gross Profit" atau "Laba Kotor"

---

### Task 2.5 — Tambah `middleware.ts` Server-Side Route Protection

**Estimasi:** 2 jam  
**File baru:** `middleware.ts` (di root project)

```typescript
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_PATHS = ['/login', '/_next', '/api/auth', '/favicon.ico', '/images'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

> [!IMPORTANT]
> Perlu install `@supabase/ssr`: `npm install @supabase/ssr`

**Acceptance Criteria:**

- [ ] Akses ke `/dashboard`, `/inventory`, dll. tanpa session → redirect ke `/login`
- [ ] Akses ke `/login` tanpa session → berfungsi normal (tidak redirect loop)
- [ ] Session yang valid → bisa akses semua route

---

## 🛠️ Sprint 3 — Kualitas Kode UI (Minggu 2)

> **Goal:** Memperbaiki bug UI/UX dan anti-pattern yang mempengaruhi developer experience & user experience.

---

### Task 3.1 — Fix PriceInput CSS Injection

**Estimasi:** 1 jam  
**File:** `components/ui/PriceInput.tsx`, `app/globals.css`

Pindahkan CSS yang di-inject secara manual ke `globals.css`:

```css
/* app/globals.css — tambahkan: */
.price-input-wrapper input[type='text']::-webkit-outer-spin-button,
.price-input-wrapper input[type='text']::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
```

Hapus seluruh blok `if (typeof document !== 'undefined') { ... document.createElement('style') ... }` dari `PriceInput.tsx`.

**Acceptance Criteria:**

- [ ] Tidak ada `document.createElement('style')` di `PriceInput.tsx`
- [ ] Styling PriceInput tetap berfungsi
- [ ] Tidak ada SSR warnings terkait DOM manipulation

---

### Task 3.2 — Fix Toast Auto-Focus & setInterval 50ms

**Estimasi:** 1.5 jam  
**File:** `components/ui/Toast.tsx`

```typescript
// 1. Hapus auto-focus
// currentToast.focus() → dihapus

// 2. Ganti setInterval dengan CSS animation
// SEBELUM: setInterval setiap 50ms untuk progress bar
// SESUDAH: gunakan CSS transition pada elemen progress

// 3. Fix ID collision
// SEBELUM: Date.now().toString()
// SESUDAH: crypto.randomUUID()
```

```css
/* Progress bar dengan CSS animation saja: */
.toast-progress {
  animation: toast-shrink linear forwards;
}
@keyframes toast-shrink {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
```

**Acceptance Criteria:**

- [ ] Toast tidak mencuri fokus dari elemen yang sedang aktif
- [ ] Progress bar tetap berfungsi visual
- [ ] Tidak ada `setInterval` di komponen Toast
- [ ] ID toast tidak bisa collision

---

### Task 3.3 — Refactor `layout.tsx` — Ekstrak State ke Custom Hook

**Estimasi:** 2–3 jam  
**File:** `app/(main)/layout.tsx`, `hooks/useSidebarState.ts` (baru)

```typescript
// hooks/useSidebarState.ts — NEW FILE
import { useState, useEffect } from 'react';

function usePersistentBoolean(key: string, defaultValue: boolean) {
  const [value, setValue] = useState<boolean>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue] as const;
}

export function useSidebarState() {
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistentBoolean(
    'bms-sidebar-collapsed',
    false,
  );
  const [inventoryExpanded, setInventoryExpanded] = usePersistentBoolean(
    'bms-inventory-expanded',
    true,
  );
  const [purchasingExpanded, setPurchasingExpanded] = usePersistentBoolean(
    'bms-purchasing-expanded',
    true,
  );
  const [transactionsExpanded, setTransactionsExpanded] = usePersistentBoolean(
    'bms-transactions-expanded',
    true,
  );
  const [printingExpanded, setPrintingExpanded] = usePersistentBoolean(
    'bms-printing-expanded',
    true,
  );
  const [autoHideEnabled, setAutoHideEnabled] = usePersistentBoolean('bms-autohide-enabled', false); // FIX: persist!

  return {
    sidebarCollapsed,
    setSidebarCollapsed,
    inventoryExpanded,
    setInventoryExpanded,
    purchasingExpanded,
    setPurchasingExpanded,
    transactionsExpanded,
    setTransactionsExpanded,
    printingExpanded,
    setPrintingExpanded,
    autoHideEnabled,
    setAutoHideEnabled,
  };
}
```

Juga perbaiki di layout.tsx:

- Tambah click-outside handler untuk `userMenuOpen`
- Perbaiki active state sidebar (tambah background highlight)
- Ganti `IconPackage` Dashboard dengan `IconLayoutDashboard`
- Fix double auth store subscription (baris 123–124)

**Acceptance Criteria:**

- [ ] `layout.tsx` tidak punya 5 `useEffect` terpisah untuk localStorage
- [ ] `autoHideEnabled` di-persist ke localStorage
- [ ] Klik di luar dropdown user menu → menu tertutup
- [ ] Active sidebar item punya background highlight yang jelas

---

### Task 3.4 — Fix SlideOver Animasi yang Tidak Berfungsi

**Estimasi:** 30 menit  
**File:** `components/ui/SlideOver.tsx`, `app/globals.css`

```css
/* app/globals.css — tambahkan class yang missing: */
@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
.animate-slide-in {
  animation: slide-in 0.25s ease-out forwards;
}
```

**Acceptance Criteria:**

- [ ] SlideOver muncul dengan animasi slide-in dari kanan
- [ ] Class `animate-slide-in` terdefinisi di globals.css

---

### Task 3.5 — Fix Modal `body.overflow` Bug (Nested Modal)

**Estimasi:** 45 menit  
**File:** `components/ui/Modal.tsx`, `components/ui/SlideOver.tsx`

```typescript
// Ganti pendekatan manual dengan counter
let openModalCount = 0;

// Saat modal buka:
openModalCount++;
if (openModalCount === 1) document.body.style.overflow = 'hidden';

// Saat modal tutup:
openModalCount--;
if (openModalCount === 0) document.body.style.overflow = '';
```

Atau gunakan custom hook `useBodyScrollLock()` yang lebih bersih.

**Acceptance Criteria:**

- [ ] Membuka 2 modal dan menutup 1 → scroll masih terkunci (modal kedua masih buka)
- [ ] Menutup modal terakhir → scroll kembali normal

---

### Task 3.6 — Fix ProtectedRoute Flash of Content

**Estimasi:** 20 menit  
**File:** `components/ProtectedRoute.tsx`

```typescript
// SEBELUM: children dirender sebelum redirect selesai
if (initialized && !user) { router.push('/login'); }
// ...
return <>{children}</>; // ← flash!

// SESUDAH: block rendering langsung
if (!initialized) return <LoadingSpinner />;
if (!user) return null; // tidak render children sama sekali
if (requireAdmin && !isAdmin()) return null;
return <>{children}</>;
```

**Acceptance Criteria:**

- [ ] Tidak ada flash of protected content sebelum redirect
- [ ] Loading state tetap ditampilkan saat `initialized = false`

---

### Task 3.7 — Konsolidasi Duplikasi RiwayatPembelian & RiwayatPenjualan

**Estimasi:** 3 jam  
**File baru:** `components/transactions/TransactionHistoryTable.tsx`  
**File dimodifikasi:** `RiwayatPembelianTab.tsx`, `RiwayatPenjualanTab.tsx`

Kedua komponen memiliki ~80% kode identik. Buat abstraksi bersama:

```typescript
// TransactionHistoryTable.tsx — komponen generik
interface TransactionHistoryTableProps<T> {
  fetchFn: (options: PaginationOptions) => Promise<{ data: T[]; total: number }>;
  columns: ColumnDef<T>[];
  searchPlaceholder: string;
  emptyMessage: string;
}
```

**Acceptance Criteria:**

- [ ] Tidak ada duplikasi logic pagination, loading, error state
- [ ] Kedua tab masih berfungsi identik dengan sebelumnya
- [ ] Bug `totalPages > 0` diperbaiki menjadi `total > 0`

---

### Task 3.8 — Fix CSS Duplikat & Tailwind Config Conflict

**Estimasi:** 45 menit  
**File:** `app/globals.css`, `tailwind.config.ts`

- Hapus duplikasi `.focus-ring` di `globals.css`
- Sinkronkan font size: pilih satu sumber kebenaran (gunakan `globals.css @theme`)
- Hapus definisi yang konflik dari `tailwind.config.ts`
- Tambahkan `prefers-reduced-motion` global:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Acceptance Criteria:**

- [ ] `.focus-ring` hanya didefinisikan sekali
- [ ] Font size konsisten antara Tailwind config dan CSS
- [ ] Animasi tidak berjalan untuk user dengan `prefers-reduced-motion: reduce`

---

## ⚡ Sprint 4 — Refactoring & Peningkatan (Minggu 3–4)

> **Goal:** Perbaikan arsitektur dan kualitas kode yang meningkatkan maintainability jangka panjang.

---

### Task 4.1 — Fix `stockOpname.ts` — Hapus Import UI Store

**Estimasi:** 1 jam  
**File:** `lib/api/stockOpname.ts`

API layer tidak boleh bergantung pada UI state store. Perbaiki dengan menerima `userId` sebagai parameter:

```typescript
// SEBELUM:
import { useAuthStore } from '@/lib/auth'; // ← UI store di API layer!
const user = useAuthStore.getState().user;

// SESUDAH:
// Hapus import, terima userId sebagai parameter atau langsung dari Supabase auth
async getAll(userId: string, options?: ...) { ... }
// Atau:
const { data: { user } } = await supabase.auth.getUser(); // ← dari Supabase langsung
```

**Acceptance Criteria:**

- [ ] Tidak ada import `useAuthStore` di `lib/api/stockOpname.ts`
- [ ] Semua fungsi yang butuh userId mengambilnya dari Supabase `auth.getUser()`

---

### Task 4.2 — Fix `retryWithBackoff` pada Mutasi

**Estimasi:** 1.5 jam  
**File:** `lib/api/utils.ts`, `lib/api/retry.ts`

```typescript
// Tambahkan parameter untuk distinguis read vs write:
export async function safeQuery<T>(
  operation: () => Promise<{ data: T | null; error: Error | null }>,
  options?: { isMutation?: boolean }
): Promise<{ data: T | null; error: ApiError | null }> {
  let result: { data: T | null; error: Error | null };

  try {
    // Hanya retry untuk READ operations, bukan mutations
    if (options?.isMutation) {
      result = await operation();
    } else {
      result = await retryWithBackoff(operation);
    }
  } catch (err) { ... }
}

// Usage untuk mutasi:
return safeQuery(async () => { ... }, { isMutation: true });
```

**Acceptance Criteria:**

- [ ] INSERT, UPDATE, DELETE menggunakan `{ isMutation: true }` — tidak di-retry otomatis
- [ ] SELECT tetap menggunakan retry 3x dengan backoff

---

### Task 4.3 — Fix `client.ts` — Pisahkan dari Auth Module

**Estimasi:** 1 jam  
**File:** `lib/api/client.ts`, `lib/supabase.ts` (baru)

```typescript
// lib/supabase.ts — NEW: standalone Supabase client
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});
```

```typescript
// lib/api/client.ts — update untuk import dari supabase.ts, bukan auth.ts:
export { supabase } from '@/lib/supabase';
```

```typescript
// lib/auth.ts — import dari supabase.ts, bukan recreate:
import { supabase } from '@/lib/supabase';
// ... hapus createClient() dari auth.ts
```

**Acceptance Criteria:**

- [ ] Tidak ada circular dependency antara `auth.ts` dan `api/client.ts`
- [ ] Supabase client hanya diinstansiasi sekali (singleton) di satu tempat

---

### Task 4.4 — Fix `Tooltip` Keyboard Accessibility

**Estimasi:** 45 menit  
**File:** `components/ui/Tooltip.tsx`

```typescript
// Tambahkan focus/blur handlers:
<div
  className="relative inline-block"
  onMouseEnter={() => setShow(true)}
  onMouseLeave={() => setShow(false)}
  onFocus={() => setShow(true)}      // ← TAMBAH
  onBlur={() => setShow(false)}      // ← TAMBAH
>
  {children}
  {show && (
    <div
      role="tooltip"                  // ← TAMBAH
      id={tooltipId}
      className="absolute ..."
    >
      {content}
    </div>
  )}
</div>
```

**Acceptance Criteria:**

- [ ] Tooltip muncul saat elemen di-focus via keyboard (Tab)
- [ ] Tooltip hilang saat elemen kehilangan focus
- [ ] `role="tooltip"` ada untuk screen reader

---

### Task 4.5 — Fix `package.json` Dependencies

**Estimasi:** 30 menit  
**File:** `package.json`

Pindahkan ke `devDependencies`:

- `@tailwindcss/postcss`
- `autoprefixer`
- `postcss`
- `eslint`
- `eslint-config-next`
- `@types/node`, `@types/react`, `@types/react-dom`, `@types/papaparse`
- `typescript`
- `supabase` (CLI tool)

Pertimbangkan downgrade TypeScript:

```json
"typescript": "^5.8.0"  // Stable, bukan 6.x beta
```

**Acceptance Criteria:**

- [ ] Build production tidak include dev tools
- [ ] TypeScript menggunakan versi stable

---

### Task 4.6 — Tambah `max` Validation ke Zod Schemas

**Estimasi:** 45 menit  
**File:** `lib/validation.ts`

```typescript
// Tambahkan max length ke semua string fields:
export const inventoryItemSchema = z.object({
  nama_barang: z.string().min(1).max(255, 'Nama barang maksimal 255 karakter'),
  barcode: z.string().max(100, 'Barcode maksimal 100 karakter').optional(),
  kategori: z.string().max(100).optional(),
});

// Tambahkan user schema yang belum ada:
export const createUserSchema = z.object({
  email: z.string().email('Format email tidak valid').max(255),
  password: z.string().min(8, 'Password minimal 8 karakter').max(128),
  nama: z.string().min(1).max(100),
  username: z.string().min(3).max(50).regex(/^[a-z0-9_]+$/, 'Username hanya huruf kecil, angka, underscore').optional(),
  role: z.enum(['admin', 'staff']).default('staff'),
});

// Fix validasi tanggal:
tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
```

**Acceptance Criteria:**

- [ ] Semua string field punya `.max()` constraint
- [ ] `createUserSchema` digunakan di `api/users/route.ts`
- [ ] Tanggal yang tidak valid (`"not-a-date"`) ditolak oleh schema

---

## 📊 Ringkasan Sprint

| Sprint              | Hari      | Tasks    | Risk      | Effort      |
| ------------------- | --------- | -------- | --------- | ----------- |
| **1 — Keamanan**    | 1–3       | 1.1–1.6  | 🔴 Kritis | ~8 jam      |
| **2 — Data Bug**    | 4–7       | 2.1–2.5  | 🔴 Kritis | ~14 jam     |
| **3 — UI Quality**  | 8–14      | 3.1–3.8  | 🟠 Tinggi | ~16 jam     |
| **4 — Refactoring** | 15–21     | 4.1–4.6  | 🟡 Medium | ~8 jam      |
| **Total**           | ~3 minggu | 20 tasks | —         | **~46 jam** |

---

## ✅ Verification Plan

### Sprint 1 (Security)

```bash
# Test endpoint tanpa auth harus return 401
curl -X POST http://localhost:3000/api/print -H "Content-Type: application/json" \
  -d '{"template_id":"test","payload_json":{}}'
# Expected: { "error": "Unauthorized" }

# Test endpoint dengan token valid harus berfungsi
curl -X GET http://localhost:3000/api/templates \
  -H "Authorization: Bearer <valid-token>"
# Expected: { "templates": [...] }
```

### Sprint 2 (Data Integrity)

- Jalankan `npm run test` — pastikan semua existing test pass
- Manual test: buat transaksi pembelian, cek pagination total count
- Manual test: proses stock opname approval, cek stok & adjustment record

### Sprint 3–4 (UI & Refactoring)

- Audit Lighthouse accessibility score (target: ≥ 90)
- Visual regression test: screenshot sebelum & sesudah
- Keyboard navigation test: semua interactive element dapat dicapai via Tab

---

## ⚠️ Open Questions

> [!IMPORTANT]
> **Pertanyaan 1:** Apakah ada Supabase database function `process_opname_adjustments` yang sudah ada, atau perlu dibuat dari nol? (Task 2.2)

> [!IMPORTANT]
> **Pertanyaan 2:** Untuk Task 2.3 (reports aggregation), apakah ada kolom `cost_at_sale` di tabel `penjualan_items` yang menyimpan HPP saat penjualan? Atau HPP diambil dari `harga_beli_terakhir` di inventory?

> [!IMPORTANT]
> **Pertanyaan 3:** Apakah middleware Supabase SSR menggunakan cookie-based session atau token header? Perlu konfirmasi agar middleware.ts bekerja dengan benar.

> [!NOTE]
> Sprint 1 bisa langsung dikerjakan tanpa pertanyaan di atas. Sprint 2+ membutuhkan jawaban pertanyaan di atas untuk implementasi yang tepat.
