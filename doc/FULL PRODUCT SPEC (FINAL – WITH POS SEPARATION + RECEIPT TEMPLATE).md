# 🚀 FULL PRODUCT SPEC (FINAL – WITH POS SEPARATION + RECEIPT TEMPLATE)

---

# 🧾 1. SYSTEM OVERVIEW

Sistem terdiri dari **2 aplikasi utama + 1 backend bersama**:

```text
Admin App (Web)     → kontrol & manajemen
POS App (Windows)   → transaksi cepat + print
Supabase Backend    → database + RPC + logic
```

---

## 🎯 Tujuan Sistem

```text
✔ cepat untuk operasional (POS)
✔ akurat untuk data (Admin)
✔ fleksibel (template-driven)
✔ scalable (multi device)
```

---

# 🧱 2. CORE PRINCIPLES

---

## 🔒 Immutable

* Tidak ada UPDATE / DELETE transaksi
* Semua perubahan via transaksi baru (return)

---

## 🔒 Database = Source of Truth

* Harga & cost tidak dikirim dari frontend
* Semua derive dari DB

---

## 🔒 Line-Level Traceability

* Return selalu refer:

  * penjualan_item_id
  * pembelian_item_id

---

## 🔒 Atomic RPC

* Semua transaksi via RPC (ACID-safe)

---

## 🔒 Idempotency

* Semua create pakai `idempotency_key`

---

## 🔒 Template-driven Output

* Struk tidak hardcoded di POS
* Template disimpan di DB

---

# 🗄️ 3. DATABASE SCHEMA (UPDATED)

---

## 📦 inventory

* id
* nama_barang (UNIQUE)
* kode_barcode
* harga_beli_terakhir
* harga_jual
* diskon
* stok
* minimum_stock
* unit
* id_kategori

---

## 🧾 pembelian & pembelian_items

(unchanged)

---

## 🔁 pembelian_return & items

(unchanged)

---

## 💰 penjualan & penjualan_items

(unchanged)

---

## 🔁 penjualan_return & items

(unchanged)

---

## 📊 stock_movements

(unchanged)

---

## 🆕 receipt_templates

```sql
id (uuid)
name (text)
type (text) -- SALE / RETURN
template (jsonb)
is_active (boolean)
created_at
```

---

# ⚙️ 4. BACKEND (RPC)

---

## 🧾 create_pembelian

## 🔁 pembelian_return_create

## 💰 create_penjualan

## 🔁 penjualan_return_create

---

## 🆕 get_active_receipt_template(type)

```text
input: SALE / RETURN
output: template JSON
```

---

# 🌐 5. API LAYER

---

## Inventory

* GET /inventory
* PATCH /inventory/:id
* GET /inventory/by-barcode

---

## Pembelian

* POST /pembelian

---

## Return Pembelian

* POST /pembelian-return

---

## Penjualan (POS)

* POST /penjualan

---

## Return Penjualan (POS/Admin)

* POST /penjualan-return

---

## 🆕 Receipt Template

* GET /receipt-template?type=SALE
* POST /receipt-template
* PATCH /receipt-template/:id

---

# 🧾 6. ADMIN APP SPEC (UPDATED)

---

## 📌 Fitur

```text
✔ Pembelian
✔ Return Pembelian
✔ Inventory
✔ Reporting
✔ Receipt Template Management
```

---

## 🆕 MENU: Receipt Template

---

### 🔧 Layout

```text
[ TEMPLATE TYPE: SALE / RETURN ]

[ HEADER TEXT ]

[ FOOTER TEXT ]

[ PREVIEW ]

[ SAVE ]
```

---

### 🎯 Behavior

```text
- edit header/footer
- preview realtime
- set template aktif
```

---

# 🎨 7. POS APP SPEC (UPDATED)

---

## 🖥️ Tech

* C# + WPF
* MVVM

---

## 🧩 Modules

```text
- ScannerService
- CartService
- ApiService
- PrinterService
- HoldService
- ReturnService
```

---

# ⚡ 8. POS CORE FEATURES

---

## 💰 Penjualan

```text
scan → tambah → confirm → submit → print
```

---

## 🧠 Fast Entry Mode

```text
scan → auto add → focus kembali
```

---

## 🔁 HOLD

---

### Flow

```text
scan → tambah → HOLD → simpan
→ lanjut transaksi lain
```

---

### Storage

```text
local memory / json file
```

---

### Rule

```text
❌ tidak kirim ke backend
❌ tidak ubah stok
```

---

## 🔁 RETURN (POS)

---

### Flow

```text
input transaksi → pilih item → qty → submit → print
```

---

### Backend

```text
gunakan penjualan_return_create RPC
```

---

## 🖨️ PRINT FLOW (UPDATED)

---

### Step

```text
1. transaksi sukses
2. ambil template (SALE/RETURN)
3. inject data
4. generate text
5. kirim ke printer
```

---

### Template Example

```json
{
  "header": ["TOKO ABC"],
  "body": ["{nama_barang} {qty} x {harga}"],
  "footer": ["TOTAL: {total}"]
}
```

---

# 🎨 9. UI FLOW (FINAL)

---

## 🧾 Admin

```text
Pembelian:
scan → tambah → submit

Inventory:
search → edit inline

Return:
pilih transaksi → input qty → submit

Receipt Template:
edit → preview → save
```

---

## 💰 POS

---

### Normal

```text
scan → tambah → confirm → submit → print
```

---

### Hold

```text
scan → tambah → HOLD → simpan
```

---

### Return

```text
input transaksi → return → print
```

---

# 📊 10. REPORTING MODEL

---

## Stock

```text
IN - OUT
```

---

## Profit

```text
(sales - return) - cost
```

---

## Inventory Value

```text
stok × last_cost
```

---

# ⚡ 11. UX RULES

---

```text
✔ keyboard-first
✔ scanner-first
✔ no delay
✔ no blocking popup
✔ always feedback
```

---

# 🔐 12. VALIDATION

---

## Frontend

* qty > 0
* diskon ≤ harga

---

## Backend

* stok tidak negatif
* return limit

---

# 🚀 13. FINAL ARCHITECTURE

---

```text
          Supabase Backend
                │
   ┌────────────┴────────────┐
   │                         │
Admin Web App          POS Native App
(management)           (transaction + print)
```

---

# 🏁 FINAL STATEMENT

---

```text
Ini bukan CRUD system.

Ini adalah:
REAL WORLD RETAIL SYSTEM
```

---

```text
Admin = kontrol
POS   = kecepatan
Backend = kebenaran data
```

---
