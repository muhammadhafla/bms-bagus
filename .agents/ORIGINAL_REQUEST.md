# Original User Request

## 2026-07-12T06:16:06Z

Melakukan UI/UX Polish dan peningkatan aksesibilitas (Sprint 3) untuk aplikasi Inventory. Tugas ini meliputi penambahan atribut ARIA pada komponen, perbaikan interaksi UI (tooltip, focus), dan perbaikan viewport.

Working directory: c:/project/inventory
Integrity mode: development

## Requirements

### R1. Peningkatan Aksesibilitas Komponen (A11y)
- Tambahkan atribut ARIA (`role="dialog"`, `aria-modal`, `aria-labelledby`) pada `components/ui/Modal.tsx`.
- Hubungkan label ke input (`htmlFor` dengan ID unik) dan tambahkan atribut ARIA pada `components/ui/PriceInput.tsx`.
- Tambahkan atribut ARIA pada `components/ui/DateRangePicker.tsx`, `components/ui/ModernPagination.tsx`, dan input search di `app/(main)/inventory/page.tsx`.
- Tambahkan `aria-sort` pada header tabel di `components/ui/DataTable`.
- Hapus larangan pinch-to-zoom (`userScalable: false`) di `app/layout.tsx`.

### R2. Perbaikan Interaksi UI
- Gunakan `<IconX />` dari `@tabler/icons-react` menggantikan karakter `×` mentah di `components/ui/Toast.tsx`.
- Tampilkan tooltip untuk icon-only mode pada sidebar saat dicolapse di `app/(main)/layout.tsx`.
- Hapus pemanggilan fokus manual yang berkonflik pada `components/ui/ConfirmDialog.tsx`.
- Perbaiki masalah tumpang-tindih z-index pada mobile menu button di `app/(main)/layout.tsx`.

## Acceptance Criteria

### Verifikasi Kode (Statis)
- [ ] Perintah `npm run lint` berjalan dengan sukses tanpa pesan error atau warning baru pada file yang diubah.
- [ ] Perintah `npm run tsc` berjalan dengan sukses tanpa ada error TypeScript pada komponen yang diedit.
- [ ] Perintah `npm run build` selesai tanpa error kompilasi.

### Inspeksi Mandiri (Agent)
- [ ] Komponen UI yang disebutkan pada Requirements terbukti menggunakan atribut aksesibilitas dan styling yang tepat saat source codenya dibaca ulang.
- [ ] Elemen `UserScalable: false` pada konfigurasi viewport dipastikan sudah benar-benar hilang dari `app/layout.tsx`.
