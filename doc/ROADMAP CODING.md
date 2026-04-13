# 🛠️ ROADMAP CODING (FEATURE-BY-FEATURE TASK BREAKDOWN)

---

# 🎯 OVERVIEW

Tujuan roadmap ini:

* implementasi bertahap (tanpa chaos)
* menjaga konsistensi dengan spec
* meminimalkan refactor

> **CATATAN**: Penjualan akan diimplementasikan sebagai app native terpisah (bukan di admin web ini)

---

# 🧱 PHASE 0 — PROJECT SETUP

## 🔧 Setup Frontend

* [x] Init project (Next.js / React)
* [x] Setup folder structure:

  * /pages
  * /components
  * /features
  * /lib (API client)
* [x] Setup styling (Tailwind / CSS)
* [x] Setup state management (Zustand / React state)
* [x] Setup API client (Supabase / fetch wrapper)

---

## 🔧 Global Utilities

* [x] format currency
* [x] debounce input
* [x] barcode input handler (trim newline)
* [x] idempotency key generator (UUID)

---

# 📦 PHASE 1 — INVENTORY (FOUNDATION)

## 📄 Page: Inventory List

### UI

* [x] Table inventory
* [x] Search bar (nama + barcode)
* [x] Filter kategori

### Logic

* [x] Fetch GET /inventory
* [x] Debounced search
* [ ] Pagination (optional)

---

## ✏️ Edit Inventory

* [x] Inline edit:

  * harga_jual
  * diskon
  * minimum_stock
* [x] PATCH /inventory/:id
* [x] Loading + error state

---

## 🔎 Barcode Lookup (Core Feature)

* [x] GET /inventory/by-barcode
* [x] Normalize input (trim, lowercase)
* [x] Handle not found

---

# 🧾 PHASE 2 — PEMBELIAN (CORE SYSTEM)

---

## 📄 Page: Pembelian

### UI Layout

* [x] Header form:

  * supplier select
  * tanggal (default today)
  * total_supplier input
* [x] Input barang (autofocus)
* [x] Table items
* [x] Footer total

---

## 🧠 Cart Logic

* [x] Add item from lookup
* [x] Merge logic:

  * SAME (inventory_id + harga + diskon) → merge
  * ELSE → new row
* [x] Remove item
* [x] Update qty
* [x] Update harga_beli
* [x] Update diskon

---

## 📊 Calculation

* [x] harga_final = harga - diskon
* [x] subtotal = qty × harga_final
* [x] total_sistem
* [x] selisih

---

## ➕ Create Inventory (Popup)

* [x] Modal create inventory
* [x] Prefill:

  * nama_barang
  * kategori = "Umum"
* [x] Submit POST /inventory
* [x] Refresh lookup

---

## 🚀 Submit Pembelian

* [x] Generate idempotency_key
* [x] POST /pembelian
* [x] Disable button saat loading
* [x] Success → reset form
* [x] Error handling

---

# 🔁 PHASE 3 — RETURN SYSTEM

> **NOTE**: Penjualan return tetap di-handle di admin web karena butuh referensi ke transaksi

---

## 📄 Page: Return (Shared)

### Step 1: Select Transaction

* [x] Search pembelian / penjualan
* [x] Select transaction

---

## 📄 Step 2: Display Items

* [x] Table:

  * nama_barang
  * qty asli
  * qty sudah return
  * qty sisa

---

## 📄 Step 3: Input Return

* [x] Input qty per line
* [x] Validation:

  * qty > 0
  * qty ≤ sisa

---

## 🚀 Submit Return

### Pembelian Return

* [x] POST /pembelian-return
* payload:

  * pembelian_item_id
  * qty

---

### Penjualan Return

* [x] POST /penjualan-return
* payload:

  * penjualan_item_id
  * qty

---

## 🔒 Behavior

* [x] Disable submit saat loading
* [x] Idempotency key
* [x] Success feedback

---

# 📊 PHASE 4 — REPORTING

---

## 📄 Stock Mutation

* [x] GET /stock-movements
* [x] Filter:

  * tanggal
  * inventory

---

## 📄 Sales Report

* [x] GET /reports/sales
* [x] Table + summary

---

## 📄 Profit Report

* [x] GET /reports/profit
* [x] Display:

  * revenue
  * return
  * cost
  * profit

---

## 📄 Inventory Value

* [x] stok × last_cost
* [x] summary total value

---

# 🧾 PHASE 5 — RECEIPT TEMPLATE

---

## 📄 Template Management

* [x] CRUD template struk
* [x] Edit header/footer
* [x] Realtime preview

---

## 📄 Logo Upload

* [x] Upload ke Supabase Storage
* [x] Delete logo

---

# ⚡ PHASE 6 — UX IMPROVEMENT

---

## ⌨️ Keyboard Navigation

* [x] Enter → add item
* [x] Tab → next field
* [x] F2 edit qty
* [x] F3 edit harga
* [x] Delete hapus item

---

## 🔫 Scanner Optimization

* [x] Auto submit after scan
* [x] Trim newline
* [x] Prevent double input

---

## ⚡ Feedback System

* [x] Toast success
* [x] Toast error
* [x] Loading indicators

---

## 🧠 Edge Handling

* [x] Duplicate scan handling (merge logic)
* [x] Slow network handling
* [x] Retry logic (idempotency)

---

# 🔐 PHASE 7 — HARDENING

---

## 🛡️ Error Handling

* [x] API error mapping
* [x] Validation errors display

---

## 🔄 Idempotency Handling

* [x] Retry safe
* [x] Prevent double submit

---

## 📉 Empty State

* [x] No data UI
* [x] Loading indicators

---

# 🎯 FINAL EXECUTION ORDER

```text
1. Inventory          ✅
2. Pembelian          ✅
3. Return             ✅
4. Reporting          ✅
5. Receipt Template   ✅
6. UX Polish          ✅
```

---

# 🔥 FINAL STATUS

```text
✅ SEMUA FITUR UTAMA TELAH SELESAI
- Inventory management
- Pembelian (purchase)
- Return (pembelian & penjualan)
- Reporting (stock, sales, profit, value)
- Receipt template & logo
- UX polish & hardening
```

---

# 🎯 OVERVIEW

Tujuan roadmap ini:

* implementasi bertahap (tanpa chaos)
* menjaga konsistensi dengan spec
* meminimalkan refactor

---

# 🧱 PHASE 0 — PROJECT SETUP

## 🔧 Setup Frontend

* [ ] Init project (Next.js / React)
* [ ] Setup folder structure:

  * /pages
  * /components
  * /features
  * /lib (API client)
* [ ] Setup styling (Tailwind / CSS)
* [ ] Setup state management (Zustand / React state)
* [ ] Setup API client (Supabase / fetch wrapper)

---

## 🔧 Global Utilities

* [ ] format currency
* [ ] debounce input
* [ ] barcode input handler (trim newline)
* [ ] idempotency key generator (UUID)

---

# 📦 PHASE 1 — INVENTORY (FOUNDATION)

## 📄 Page: Inventory List

### UI

* [ ] Table inventory
* [ ] Search bar (nama + barcode)
* [ ] Filter kategori

### Logic

* [ ] Fetch GET /inventory
* [ ] Debounced search
* [ ] Pagination (optional)

---

## ✏️ Edit Inventory

* [ ] Inline edit:

  * harga_jual
  * diskon
  * minimum_stock
* [ ] PATCH /inventory/:id
* [ ] Loading + error state

---

## 🔎 Barcode Lookup (Core Feature)

* [ ] GET /inventory/by-barcode
* [ ] Normalize input (trim, lowercase)
* [ ] Handle not found

---

# 🧾 PHASE 2 — PEMBELIAN (CORE SYSTEM)

---

## 📄 Page: Pembelian

### UI Layout

* [ ] Header form:

  * supplier select
  * tanggal (default today)
  * total_supplier input
* [ ] Input barang (autofocus)
* [ ] Table items
* [ ] Footer total

---

## 🧠 Cart Logic

* [ ] Add item from lookup
* [ ] Merge logic:

  * SAME (inventory_id + harga + diskon) → merge
  * ELSE → new row
* [ ] Remove item
* [ ] Update qty
* [ ] Update harga_beli
* [ ] Update diskon

---

## 📊 Calculation

* [ ] harga_final = harga - diskon
* [ ] subtotal = qty × harga_final
* [ ] total_sistem
* [ ] selisih

---

## ➕ Create Inventory (Popup)

* [ ] Modal create inventory
* [ ] Prefill:

  * nama_barang
  * kategori = "Umum"
* [ ] Submit POST /inventory
* [ ] Refresh lookup

---

## 🚀 Submit Pembelian

* [ ] Generate idempotency_key
* [ ] POST /pembelian
* [ ] Disable button saat loading
* [ ] Success → reset form
* [ ] Error handling

---


# 🔁 PHASE 3 — RETURN SYSTEM

---

## 📄 Page: Return (Shared)

### Step 1: Select Transaction

* [ ] Search pembelian / penjualan
* [ ] Select transaction

---

## 📄 Step 2: Display Items

* [ ] Table:

  * nama_barang
  * qty asli
  * qty sudah return
  * qty sisa

---

## 📄 Step 3: Input Return

* [ ] Input qty per line
* [ ] Validation:

  * qty > 0
  * qty ≤ sisa

---

## 🚀 Submit Return

### Pembelian Return

* [ ] POST /pembelian-return
* payload:

  * pembelian_item_id
  * qty

---

### Penjualan Return

* [ ] POST /penjualan-return
* payload:

  * penjualan_item_id
  * qty

---

## 🔒 Behavior

* [ ] Disable submit saat loading
* [ ] Idempotency key
* [ ] Success feedback

---

# 📊 PHASE 4 — REPORTING

---

## 📄 Stock Mutation

* [ ] GET /stock-movements
* [ ] Filter:

  * tanggal
  * inventory

---

## 📄 Sales Report

* [ ] GET /reports/sales
* [ ] Table + summary

---

## 📄 Profit Report

* [ ] GET /reports/profit
* [ ] Display:

  * revenue
  * return
  * cost
  * profit

---

## 📄 Inventory Value

* [ ] stok × last_cost
* [ ] summary total value

---

# ⚡ PHASE 5 — UX IMPROVEMENT

---

## ⌨️ Keyboard Navigation

* [ ] Enter → add item
* [ ] Tab → next field
* [ ] Arrow keys (optional)

---

## 🔫 Scanner Optimization

* [ ] Auto submit after scan
* [ ] Trim newline
* [ ] Prevent double input

---

## ⚡ Feedback System

* [ ] Toast success
* [ ] Toast error
* [ ] Loading indicators

---

## 🧠 Edge Handling

* [ ] Duplicate scan handling
* [ ] Slow network handling
* [ ] Retry logic

---

# 🔐 PHASE 6 — HARDENING

---

## 🛡️ Error Handling

* [ ] API error mapping
* [ ] Validation errors display

---

## 🔄 Idempotency Handling

* [ ] Retry safe
* [ ] Prevent double submit

---

## 📉 Empty State

* [ ] No data UI
* [ ] Loading skeleton

---

# 🚀 PHASE 7 — FINAL POLISH

---

## 🎨 UI Polish

* [ ] spacing
* [ ] typography
* [ ] color consistency

---

## ⚡ Performance

* [ ] debounce search
* [ ] memoization
* [ ] reduce re-render

---

## 📱 Responsiveness (optional)

* [ ] desktop-first
* [ ] minimal mobile support

---

# 🎯 FINAL EXECUTION ORDER

```text
1. Inventory
2. Pembelian
3. Penjualan
4. Return
5. Reporting
6. UX polish
```

---

# 🔥 FINAL NOTE

```text
Build fast → test → refine
Do NOT over-engineer UI first
Core flow > visual perfection
```

---

This roadmap ensures:

```
✔ fast development
✔ minimal rework
✔ aligned with backend
✔ production-ready outcome
```

---
