# 🧾 ADMIN APP SPEC (FINAL – UPDATED AFTER POS SEPARATION)

---

# 🎯 1. SCOPE (UPDATED)

Admin App sekarang **TIDAK mencakup penjualan (POS)**.

---

## ✅ FITUR ADMIN APP

```text
✔ Pembelian (procurement)
✔ Return Pembelian
✔ Inventory Management
✔ Reporting
✔ Stock Monitoring
```

---

## ❌ DIPINDAHKAN KE POS APP

```text
❌ Penjualan
❌ Penjualan Return (opsional: bisa tetap di admin untuk audit)
❌ Printer
```

---

# 🧠 2. ROLE SISTEM

---

## 👤 Admin / Staff Backoffice

```text
- input pembelian
- kelola inventory
- cek laporan
- proses return supplier
```

---

## 🛑 BUKAN untuk:

```text
- kasir
- transaksi cepat
```

---

# 🧱 3. CORE PRINCIPLES (UNCHANGED)

---

```text
✔ immutable transaction
✔ atomic RPC
✔ database as source of truth
✔ line-level traceability
✔ idempotency
✔ audit via stock_movements
```

---

# 🗄️ 4. DATABASE (NO CHANGE)

Semua schema tetap:

* pembelian
* pembelian_items
* pembelian_return
* pembelian_return_items
* inventory
* stock_movements

---

## 🔴 Catatan:

```text
penjualan tetap ada di DB
tapi tidak dipakai di Admin UI
```

---

# ⚙️ 5. BACKEND (NO CHANGE)

RPC tetap:

* create_pembelian
* pembelian_return_create
* create_penjualan (dipakai POS)
* penjualan_return_create (dipakai POS)

---

# 🌐 6. API USAGE (ADMIN ONLY)

---

## 📦 Inventory

* GET /inventory
* PATCH /inventory/:id
* GET /inventory/by-barcode

---

## 🧾 Pembelian

* POST /pembelian
* GET /pembelian
* GET /pembelian/:id

---

## 🔁 Return Pembelian

* POST /pembelian-return
* GET /pembelian-return

---

## 📊 Reporting

* GET /stock-movements
* GET /reports/*

---

# 🎨 7. UI FLOW (UPDATED)

---

# 🧾 PEMBELIAN (CORE FLOW)

---

## ⚡ FAST ENTRY MODE (WAJIB)

```text
scan → auto add → kembali ke input
```

---

## 📌 FLOW

```text
1. scan barang
2. auto masuk tabel
3. ulangi scan
4. isi total_supplier (di akhir)
5. submit
```

---

## 🎯 UX RULE

```text
✔ tidak perlu klik
✔ tidak perlu modal (kecuali create inventory)
✔ fokus selalu di input
```

---

## 📊 VALIDATION VISUAL

```text
selisih:
- merah → tidak cocok
- hijau → cocok
```

---

# 🔁 RETURN PEMBELIAN

---

## 📌 FLOW

```text
1. pilih pembelian
2. lihat item per baris
3. input qty return
4. submit
```

---

## 🔍 IMPROVEMENT

```text
✔ search item dalam transaksi
✔ tampilkan:
   - qty asli
   - qty sudah return
   - qty sisa
```

---

# 📦 INVENTORY

---

## 📌 FLOW

```text
search → edit inline
```

---

## ⚠️ RULE

```text
❌ tidak ada create manual
✔ hanya dari pembelian
```

---

## 🔥 UX

```text
✔ low stock highlight
✔ edit cepat inline
```

---

# 📊 REPORTING

---

## 📌 FITUR

```text
- stock mutation
- pembelian
- inventory value
- (opsional) penjualan summary (read-only)
```

---

## 🔎 FILTER

```text
- tanggal wajib
- optional: barang
```

---

# 🧠 8. UX SYSTEM (UPDATED)

---

## ⌨️ KEYBOARD FIRST

```text
Enter → tambah item
Tab → navigasi
Ctrl+Z → undo
```

---

## 🔫 SCANNER FRIENDLY

```text
✔ auto trim newline
✔ auto add item
✔ tidak perlu enter manual
```

---

## 🔊 FEEDBACK

```text
✔ highlight item terakhir
✔ toast kecil (item +1)
```

---

## 🎯 FOCUS MANAGEMENT

```text
✔ setelah add → kembali ke input
✔ setelah submit → kembali ke input
```

---

# ⚡ 9. FRONTEND STATE

---

## 🧠 CartItem

```ts
{
  inventory_id
  nama_barang
  qty
  harga
  diskon
  harga_final
}
```

---

## 🔒 RULE

```text
cart = source of truth
```

---

# 🔐 10. VALIDATION

---

## Frontend

```text
- qty > 0
- harga ≥ 0
- diskon ≤ harga
```

---

## Backend

```text
- stok tidak negatif
- return tidak melebihi qty
```

---

# 📊 11. REPORTING MODEL

---

## Stock

```text
IN - OUT
```

---

## Inventory Value

```text
stok × last_cost
```

---

# 🚀 12. FINAL SYSTEM STRUCTURE

---

```text
Admin App (Web)
│
├── Pembelian
├── Return Pembelian
├── Inventory
└── Reporting

POS App (Native - terpisah)
│
├── Penjualan
├── Print
└── Scanner
```

---

# 🔥 FINAL NOTE

---

```text
Admin App = kontrol & akurasi
POS App   = kecepatan & transaksi
```

---

```text
Separation ini adalah kunci:
✔ performa
✔ stabilitas
✔ scalability
```

---
