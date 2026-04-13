# 🖼️ ADMIN UI FLOW — UPLOAD LOGO STRUK

---

# 🎯 1. TUJUAN

Fitur ini memungkinkan admin:

```text
✔ upload logo toko
✔ preview hasil di struk
✔ update tanpa redeploy POS
```

---

# 🧭 2. POSISI DI APP

---

## 📌 Menu Baru / Section

```text
Pengaturan
 ├── Receipt Template
 └── Logo Struk   ← (baru)
```

---

# 🎨 3. LAYOUT UI

---

## 🖥️ Halaman: Logo Struk

```text
+--------------------------------------+
| LOGO STRUK                           |
+--------------------------------------+

[ Upload File ]

(Preview Area)
+--------------------------+
|        [ LOGO ]          |
+--------------------------+

Info:
- Format: PNG / BMP
- Max width: 576px
- Auto convert ke hitam putih

[ SAVE ]
```

---

# ⚡ 4. FLOW USER

---

## 🔹 Step 1: Upload

```text
user klik → pilih file (PNG/JPG)
```

---

## 🔹 Step 2: Preview (WAJIB)

```text
system:
- resize
- convert grayscale
- threshold (black/white)

→ tampilkan preview
```

---

## 🔹 Step 3: Save

```text
klik SAVE
→ upload ke storage
→ simpan URL di DB
```

---

# 🗄️ 5. DATA STORAGE DESIGN

---

## 🔥 Tambahan (WAJIB)

### Opsi A (simple – recommended awal)

Tambahkan ke table `receipt_templates`:

```sql
ALTER TABLE receipt_templates
ADD COLUMN logo_url text;
```

---

## 🧠 Alternatif (lebih scalable)

```sql
table: settings
key: receipt_logo_url
value: text
```

---

👉 **Rekomendasi: pakai logo_url di receipt_templates (simple & cukup)**

---

# ☁️ 6. STORAGE (SUPABASE)

---

## 📦 Bucket

```text
bucket: assets
folder: receipt/
file: logo.png
```

---

## 🔗 URL

```text
https://xxx.supabase.co/storage/v1/object/public/assets/receipt/logo.png
```

---

# ⚙️ 7. VALIDATION (WAJIB)

---

## 📐 Ukuran

```text
✔ max width: 576px (80mm)
✔ auto resize jika lebih besar
```

---

## 📁 Format

```text
✔ PNG (recommended)
✔ JPG (auto convert)
❌ SVG (reject)
```

---

## 📏 Size

```text
✔ max 200KB (biar print cepat)
```

---

# 🎨 8. PREVIEW ENGINE

---

## 🔥 Harus dilakukan di frontend

```text
image → canvas → grayscale → threshold
```

---

## 🎯 Tujuan:

```text
✔ preview mirip hasil printer
✔ user tahu hasil akhir
```

---

# 🖨️ 9. INTEGRASI DENGAN TEMPLATE

---

## Template JSON

```json
{
  "logo": {
    "enabled": true,
    "mode": "bitmap"
  }
}
```

---

## POS Behavior

```text
IF logo.enabled:
  download logo_url
  convert → ESC/POS bitmap
  print
```

---

# ⚠️ 10. EDGE CASE

---

## 🔴 Logo terlalu besar

```text
→ auto resize
```

---

## 🔴 Kontras jelek

```text
→ tampilkan warning:
"Logo mungkin tidak jelas saat dicetak"
```

---

## 🔴 Upload gagal

```text
→ tampilkan error + retry
```

---

# 🧠 11. UX DETAIL (BIAR TERASA PRO)

---

## 🔥 Tambahkan:

```text
✔ drag & drop upload
✔ preview realtime
✔ tombol "Reset ke default"
✔ indicator success
```

---

## 🔊 Feedback

```text
✔ "Logo berhasil diupload"
✔ "Gagal upload"
```

---

# 🎯 12. FINAL FLOW SUMMARY

---

```text
Upload → Preview → Save → Tersimpan → POS pakai otomatis
```

---

# 🚀 FINAL NOTE

---

```text
Logo bukan sekadar gambar
→ ini identitas brand di setiap transaksi
```

---

```text
Jika struk terlihat profesional
→ bisnis terasa lebih terpercaya
```

---
