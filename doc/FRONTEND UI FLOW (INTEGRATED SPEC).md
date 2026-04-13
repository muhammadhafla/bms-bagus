# 🎨 FINAL UI FLOW SPEC (UPDATED & OPTIMIZED FOR REAL USAGE)

Dokumen ini adalah versi final UI Flow yang sudah dioptimasi untuk:

* ⚡ kecepatan input (scanner + keyboard)
* 🧠 minim beban berpikir user
* 🏭 penggunaan operasional nyata

---

# 🧭 1. NAVIGATION

```text
Dashboard
Pembelian
Penjualan
Return
Inventory
Laporan
```

---

# 🧾 2. PEMBELIAN FLOW (PRIMARY FLOW)

---

## 📌 LAYOUT

```text
[HEADER]
- Supplier
- Tanggal (default today)
- Nomor Nota

[INPUT BARANG]  ← AUTOFOCUS

[TABLE]
| Barang | Qty | Harga | Diskon | Subtotal | X |

[FOOTER]
- Total Sistem
- Total Supplier (input di akhir)
- Selisih (highlight)
- Submit
```

---

## ⚡ FAST ENTRY MODE (WAJIB)

```text
scan → item langsung masuk
→ qty +1
→ focus kembali ke input
```

---

## 🔁 FLOW UTAMA

```text
1. scan / ketik barang
2. jika ada:
   - merge jika harga sama
   - else baris baru
3. jika tidak ada:
   - popup create inventory
4. lanjut scan berikutnya
```

---

## 🎯 FOCUS MANAGEMENT (MANDATORY)

```text
- setelah add → kembali ke input
- setelah submit → kembali ke input
```

---

## 🧠 FEEDBACK USER

```text
- highlight item terakhir
- toast kecil:
  "Indomie +1"
```

---

## ⚠️ EDIT CEPAT

```text
F2 → edit qty
F3 → edit harga
Del → hapus item
Ctrl+Z → undo terakhir
```

---

## 📊 TOTAL & VALIDASI

```text
total_sistem = auto
user input total_supplier (di akhir)

selisih:
- merah → tidak sama
- hijau → sesuai
```

---

## 🚀 SUBMIT

```text
- tombol disable saat loading
- idempotency_key digunakan
- success → reset form
```

---

# 💰 3. PENJUALAN FLOW

---

## 📌 LAYOUT

```text
[INPUT BARANG] (AUTOFOCUS)

[TABLE]
| Barang | Qty | Harga | Subtotal |

[FOOTER]
Total
[CONFIRM]
```

---

## ⚡ FLOW

```text
scan → tambah → scan → tambah
```

---

## 🔒 CONFIRMATION STEP (WAJIB)

```text
Enter → preview
Enter lagi → submit
```

atau:

```text
tombol CONFIRM besar
```

---

## 🔊 FEEDBACK

```text
- beep saat scan berhasil
- highlight item terakhir
```

---

# 🔁 4. RETURN FLOW

---

## 📌 STEP 1: PILIH TRANSAKSI

```text
search transaksi
select
```

---

## 📌 STEP 2: DISPLAY ITEMS

```text
| Barang | Qty Asli | Qty Return | Qty Sisa | Input |
```

---

## 📌 STEP 3: INPUT RETURN

---

## 🔍 SEARCH DALAM TRANSAKSI (WAJIB)

```text
filter item berdasarkan nama/barcode
```

---

## ⚡ INPUT CONTROL

```text
- input manual qty
- tombol:
   [+] [-]
   full return
```

---

## 🚀 SUBMIT

```text
POST return
idempotency_key
```

---

## 🔒 VALIDATION

```text
qty > 0
qty ≤ qty sisa
```

---

# 📦 5. INVENTORY FLOW

---

## 📌 LAYOUT

```text
[SEARCH] [FILTER]

[TABLE]
| Nama | Stok | Harga | Diskon | Min Stock |
```

---

## ⚡ QUICK ACTION

```text
click row → edit inline
```

---

## ⚠️ LOW STOCK

```text
stok < minimum_stock → highlight merah
```

---

# 📊 6. REPORT FLOW

---

## 📌 REPORT TYPES

```text
- Stock Mutation
- Sales
- Profit
- Inventory Value
```

---

## 📌 FILTER

```text
- date range (wajib)
```

---

# ⚡ 7. GLOBAL UX RULES

---

## ⌨️ KEYBOARD-FIRST

```text
Enter → tambah item
Tab → pindah field
Ctrl+Z → undo
```

---

## 🔫 SCANNER FRIENDLY

```text
- auto trim newline
- auto process scan
- no manual confirm
```

---

## 🔊 FEEDBACK

```text
- beep / visual flash saat scan
- toast success/error
```

---

## 🧠 MINIMAL THINKING

```text
user tidak perlu:
- klik berulang
- buka modal
- konfirmasi berlebihan
```

---

# 🎯 8. CRITICAL UX GUARANTEE

---

```text
✔ semua flow bisa tanpa mouse
✔ semua input cepat (≤1 detik per item)
✔ tidak ada blocking popup
✔ feedback selalu jelas
```

---

# 🚀 FINAL NOTE

---

```text
Jika user harus berhenti berpikir → UX gagal
Jika user bisa terus scan tanpa henti → UX berhasil
```

---

# 🔥 SYSTEM LEVEL

Ini bukan UI biasa, ini adalah:

```text
real-world operational interface
```

yang dirancang untuk:

* kasir
* gudang
* procurement

---
