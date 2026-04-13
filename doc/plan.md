# 📋 RENCANA IMPLEMENTASI INVENTORY & POS SYSTEM

## 🔍 ANALISA DOKUMEN
Sistem ini terdiri dari **3 komponen utama** dengan pemisahan tanggung jawab yang jelas:
1. **Admin Web App** → Manajemen & Kontrol (Pembelian, Inventory, Laporan, Template Struk)
2. **POS Native App** → Transaksi Cepat (Penjualan, Scanner, Print)
3. **Supabase Backend** → Database + RPC + Single Source of Truth

---

## 🎯 PRINSIP INTI YANG HARUS DIIKUTI
✅ **Immutable Transaction** - Tidak ada UPDATE/DELETE transaksi, semua perubahan via transaksi baru  
✅ **Database = Source of Truth** - Harga & cost tidak dikirim dari frontend  
✅ **Line-Level Traceability** - Semua return selalu referensi item asli  
✅ **Atomic RPC** - Semua transaksi via RPC (ACID-safe)  
✅ **Idempotency** - Semua create pakai `idempotency_key`  
✅ **Template-driven** - Struk tidak hardcoded, disimpan di DB  
✅ **COMPLETED** - Semua phase telah diimplementasikan  

---

## 🚧 ROADMAP IMPLEMENTASI (BERTAHAP)

### 🧱 PHASE 0: PROJECT SETUP (Estimasi: 1 hari)
| Task | Status | Priority |
|------|--------|----------|
| Init project Next.js / React | ☑ | High |
| Setup folder structure (pages, components, features, lib) | ☑ | High |
| Setup styling (Tailwind CSS) | ☑ | High |
| Setup state management (Zustand) | ☑ | High |
| Setup Supabase API client | ☑ | High |
| Utility: format currency, debounce, barcode handler | ☑ | High |
| Utility: idempotency key generator | ☑ | High |

---

### 📦 PHASE 1: INVENTORY (FOUNDATION) (Estimasi: 1 hari)
| Task | Status | Priority |
|------|--------|----------|
| Inventory List Page + Table | ☑ | High |
| Search & filter inventory | ☑ | High |
| Inline edit inventory (harga, diskon, min stock) | ☑ | High |
| API: GET /inventory, PATCH /inventory/:id | ☑ | High |
| Barcode lookup endpoint (GET /inventory/by-barcode) | ☑ | High |
| Low stock highlight | ☑ | Medium |

---

### 🧾 PHASE 2: PEMBELIAN (CORE SYSTEM) (Estimasi: 2 hari)
| Task | Status | Priority |
|------|--------|----------|
| Pembelian Page Layout (Header, Input Barang, Table, Footer) | ☐ | High |
| **Fast Entry Mode** - Scan → auto add → focus kembali | ☐ | Critical |
| Cart logic (add, remove, update qty/harga) | ☐ | High |
| Merge logic (same inventory + harga = merge qty) | ☐ | High |
| Kalkulasi subtotal, total sistem, selisih | ☐ | High |
| Popup create inventory jika barang tidak ditemukan | ☐ | High |
| Submit Pembelian dengan idempotency key | ☐ | High |
| Validasi selisih (hijau/merah) | ☐ | Medium |
| Shortcut keyboard (F2 edit qty, F3 edit harga, Del hapus) | ☐ | Medium |


---

### 🔁 PHASE 3: RETURN SYSTEM (Estimasi: 2 hari)
| Task | Status | Priority |
|------|--------|----------|
| Return Page (Step 1: Pilih Transaksi) | ☑ | High |
| Search transaksi pembelian/penjualan | ☑ | High |
| Display items dengan qty asli, return, sisa | ☑ | High |
| Input return qty dengan validasi | ☑ | High |
| Search item dalam transaksi | ☐ | Medium |
| Submit Pembelian Return | ☑ | High |
| Submit Penjualan Return | ☑ | High |

---

### 📊 PHASE 4: REPORTING (Estimasi: 1.5 hari)
| Task | Status | Priority |
|------|--------|----------|
| Stock Mutation Report | ☑ | High |
| Inventory Value Report | ☑ | High |
| Sales Report | ☑ | Medium |
| Profit Report | ☑ | Medium |
| Filter tanggal untuk semua laporan | ☑ | High |

---

### 🧾 PHASE 5: RECEIPT TEMPLATE & LOGO (Estimasi: 2 hari)
| Task | Status | Priority |
|------|--------|----------|
| Receipt Template Management Page | ☑ | High |
| Edit header/footer template | ☑ | High |
| Realtime preview template | ☑ | High |
| Logo Upload Page | ☑ | Medium |
| Image processor (resize, grayscale, threshold) | ☐ | Medium |
| Upload ke Supabase Storage | ☑ | Medium |
| API untuk get_active_receipt_template | ☑ | High |

---

### ⚡ PHASE 6: UX POLISH & HARDENING (Estimasi: 1.5 hari)
| Task | Status | Priority |
|------|--------|----------|
| Full keyboard navigation | ☑ | High |
| Scanner optimization (auto trim newline, prevent double) | ☑ | Critical |
| Toast feedback system | ☑ | High |
| Error handling & loading state | ☑ | High |
| Idempotency retry logic | ☑ | Medium |
| Prevent double submit | ☑ | High |

---

---

## 🎯 URUTAN EKSEKUSI PRIORITAS
```
1. Inventory          ✅ Dasar system
2. Pembelian          ✅ Core operasional
3. Return System      ✅ Kelengkapan sistem
4. Reporting          ✅ Kontrol & monitoring
5. Receipt Template   ✅ Customization
6. UX Polish          ✅ Pengalaman pengguna
```

---

## ⚠️ KRITICAL NOTES YANG TIDAK BOLEH DILEWATKAN
1. **JANGAN PERNAH** mengirim harga dari frontend ke backend untuk transaksi. Semua harga diambil dari database.
2. **JANGAN PERNAH** melakukan UPDATE/DELETE pada tabel transaksi. Semua perubahan via transaksi return.
3. **FAST ENTRY MODE ADALAH MANDATORY**. User tidak boleh harus klik apapun setelah scan.
4. **FOCUS SELALU KEMBALI KE INPUT** setelah menambahkan item. Ini adalah aturan UX terpenting.
5. Semua transaksi **WAJIB** menggunakan `idempotency_key` untuk mencegah double submit.

---

## 📊 ESTIMASI TOTAL WAKTU
**Total: ~14 hari kerja**

| Phase | Estimasi |
|-------|----------|
| Setup | 1 hari |
| Inventory | 1 hari |
| Pembelian | 2 hari |
| Return | 2 hari |
| Reporting | 1.5 hari |
| Receipt & Logo | 2 hari |
| UX Polish | 1.5 hari |


---

## 🎯 GOAL AKHIR
System ini bukan sekadar CRUD application. Ini adalah **REAL WORLD RETAIL SYSTEM** yang dirancang untuk operasional toko nyata dengan kecepatan, akurasi, dan stabilitas sebagai prioritas utama.
