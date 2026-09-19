# Audit Komprehensif Performa & Efisiensi Aplikasi Inventory

Berdasarkan audit mendalam terhadap struktur *codebase* Anda (Next.js, Supabase, React Query, Tailwind), aplikasi saat ini memiliki beberapa masalah arsitektural yang menyebabkan *bundle size* membesar, waktu muat (load time) lambat, dan berpotensi mengalami lag (freeze) pada browser saat memproses data besar.

Berikut adalah temuan utama praktik yang tidak efisien beserta opsi optimalisasinya agar aplikasi menjadi seringan dan seresponsif mungkin.

---

## 1. Anti-Pattern: "God Components" (Komponen Terlalu Besar)

### Masalah
Banyak file halaman utama yang ukurannya masif (mencapai ribuan baris kode). 
- `app/(main)/admin/payroll/kehadiran/page.tsx` (1.651 baris, ~70KB)
- `app/(main)/warehouse/stocks/page.tsx` (1.200+ baris)
- `components/inventory/InventoryTable.tsx` (1.211 baris)

Di dalam satu file ini, Anda mencampur urusan routing, fetch data, state filter, *semua* modal (Create, Edit, Delete, Cetak), logika mutasi API, dan formatting data.

**Dampak:**
- Saat pengguna mengetik di satu input form/filter, React akan mencoba me-render ulang seluruh halaman berukuran ribuan baris tersebut.
- Pengguna harus men-download seluruh *JavaScript* form dan modal secara penuh di awal, padahal mereka mungkin hanya ingin melihat tabel (tidak pernah memencet tombol "Edit" atau "Tambah").

### Solusi Efisiensi (Konsep 200 baris menjadi 50 baris)
Pecah file raksasa menjadi komponen-komponen kecil, dan gunakan **Lazy Loading** (`next/dynamic`) untuk komponen berat yang jarang dibuka (seperti Modal dan Export).

**Contoh Refaktor (dari 1000+ baris menjadi < 100 baris di level Page):**
```tsx
'use client';
import dynamic from 'next/dynamic';
import { KehadiranTable } from './KehadiranTable';
import { KehadiranFilters } from './KehadiranFilters';
import { useKehadiranQuery } from '@/lib/hooks/useKehadiran';

// Jangan load Javascript Modal sampai tombol di-klik!
const ModalsContainer = dynamic(() => import('./ModalsContainer'), { ssr: false });

export default function AdminKehadiranPage() {
  const { data, isLoading } = useKehadiranQuery();

  return (
    <div className="flex flex-col gap-4">
      <KehadiranFilters />
      <KehadiranTable data={data} isLoading={isLoading} />
      <ModalsContainer /> {/* Berisi semua modal create/edit/delete */}
    </div>
  );
}
```

---

## 2. Generate PDF & CSV di Sisi Client (Sangat Membebani Browser)

### Masalah
- **PDF (pdfmake):** Di dalam file `lib/pdf-utils.tsx`, Anda mengimpor `pdfmake` menggunakan dynamic import di sisi *client* (`'use client'`). Meskipun di-*lazy-load*, `pdfmake` dan font virtualnya (*vfs_fonts*) berukuran sangat besar (bisa lebih dari 2MB). Ini akan membuat browser perangkat spesifikasi rendah menjadi *hang* saat menekan tombol Cetak.
- **CSV Export:** Di `kehadiran/page.tsx`, fungsi `handleExportCsv` me-*loop* semua array hasil fetch API di sisi client, lalu menggabungkannya menjadi string `data:text/csv`. Jika datanya mencapai 10.000+ baris, browser akan *freeze* (Not Responding).

### Solusi Efisiensi
**Pindahkan seluruh proses pembuatan file ke Server!**
1. Buat **Next.js Server Actions** atau Route Handlers (`app/api/export-csv/route.ts`).
2. Server yang bekerja berat memproses ribuan data dan men-generate PDF/CSV, lalu client hanya menerima *link download*.
3. Dengan ini, Anda bisa **menghapus** library `pdfmake` dan CSV parser dari *bundle* pengguna, membuat aplikasi secara instan lebih cepat dimuat.

---

## 3. Merusak Pengalaman SPA dengan `window.location.reload()`

### Masalah
Di dalam file `components/inventory/InventoryTable.tsx`, terdapat fungsi `handleBulkSnooze`. Setelah proses *snooze* selesai ke API, Anda memaksa aplikasi untuk memuat ulang seluruh halaman:
```javascript
window.location.reload(); 
```
**Dampak:** Memaksa browser untuk men-download ulang semua aset HTML/CSS/JS, dan me-render ulang seluruh aplikasi dari nol. Ini sangat memakan waktu (bisa 2-5 detik) dan melawan prinsip *Single Page Application* (SPA) yang responsif.

### Solusi Efisiensi
Gunakan kehebatan *React Query* yang sudah Anda install untuk me-refresh data di latar belakang (*background refresh*) tanpa berkedip!
```javascript
// Ganti window.location.reload() dengan ini:
queryClient.invalidateQueries({ queryKey: ['inventory_list'] });
```

---

## 4. Pengulangan Invalidasi Query (Boilerplate Bloat)

### Masalah
Di hampir setiap deklarasi `useMutation` (contoh di `kehadiran/page.tsx`), Anda mengulang blok kode invalidasi cache yang sama sebanyak 5 baris berulang kali:
```javascript
queryClient.invalidateQueries({ queryKey: ['admin_payroll_kehadiran_paginated'] });
queryClient.invalidateQueries({ queryKey: ['admin_today_kehadiran_summary'] });
queryClient.invalidateQueries({ queryKey: ['admin_payroll_saldo'] });
queryClient.invalidateQueries({ queryKey: ['admin_payroll_mutasi'] });
queryClient.invalidateQueries({ queryKey: ['payroll'] });
```
Jika ada 5 mutasi dalam file tersebut, Anda membuang 25 baris untuk hal yang identik. Jika suatu saat ada *queryKey* baru, Anda harus mencarinya satu per satu.

### Solusi Efisiensi
Buat satu *custom hook* abstraksi atau manfaatkan fitur *predicate* dari TanStack Query.
```javascript
// Cukup 1 baris di setiap onSucces!
queryClient.invalidateQueries({
  predicate: (query) => query.queryKey[0].includes('payroll') || query.queryKey[0].includes('kehadiran')
});
```

---

## 5. Komputasi Berat di Client: Saldo Berjalan (Running Balance)

### Masalah
Pada `finance/ledger/page.tsx`, Anda mengambil seluruh list "Buku Besar" dari API, kemudian melakukan iterasi ganda (`reverse()` -> `reduce()` -> `reverse()`) di dalam `useMemo` sisi *client* untuk menghitung kolom "Saldo Berjalan".
Untuk skala kecil ini tidak terasa. Namun jika sebuah gudang memiliki puluhan ribu riwayat, loop ini akan memblokir *Main Thread* browser.

### Solusi Efisiensi
Biarkan database Supabase (PostgreSQL) yang menghitungnya. PostgreSQL sangat kencang dalam menghitung saldo berjalan menggunakan *Window Functions*.
```sql
-- Di backend/Supabase:
SELECT 
  *,
  SUM(nominal) OVER (ORDER BY created_at ASC) as saldo_berjalan
FROM buku_besar
```
Hasilnya: Client hanya bertugas "menampilkan" (0 komputasi). Kode di `useMemo` yang memakan ~40 baris bisa dihapus sepenuhnya, diganti menjadi 1 baris.

---

## Ringkasan Rekomendasi Eksekusi
Jika Anda ingin mengeksekusi efisiensi ini, saya dapat membantu Anda untuk:
1. **Memisahkan komponen besar** menjadi komponen tersendiri (*Extract Components*).
2. Memindahkan eksekusi pembuatan **PDF & CSV ke Server Actions**.
3. Mengganti semua hard-reload `window.location.reload()` menjadi **query invalidation**.

Beri tahu saya bagian mana yang ingin Anda optimalisasi pertama kali!
