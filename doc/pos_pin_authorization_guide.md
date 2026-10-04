# Panduan Integrasi POS App: Supervisor Authorization Engine

**Versi Dokumen**: 1.3.1  
**Target Pembaca**: Pengembang Aplikasi POS (C# / WPF / Mobile)  
**Terkait**: BMS Web & Database Supabase Multi-Outlet  
**Status**: Spesifikasi Resmi Supervisor Authorization Engine  

---

## 1. Latar Belakang & Kemampuan Multi-Kasus

Modul otorisasi ini dirancang sebagai **Supervisor Authorization Engine Universal** untuk mengamankan berbagai aksi sensitif kasir di POS:

| Kode Aksi (`action_type`) | Deskripsi Penggunaan di POS |
| :--- | :--- |
| **`access_settings`** | Membuka menu Pengaturan POS (printer, barcode, koneksi). |
| **`void_transaction`** | Membatalkan nota atau transaksi belanja yang sedang berlangsung. |
| **`manual_discount`** | Memberikan diskon persen atau nominal di luar promo otomatis. |
| **`price_override`** | Mengubah harga jual satuan produk master secara manual. |
| **`return_approval`** | Menyetujui retur penjualan barang tanpa struk atau nilai besar. |

*(Catatan: Buka laci kasir tanpa belanja tidak memerlukan otorisasi supervisor).*

---

## 2. Kebijakan Keamanan Pokok

1. **Format PIN OTP**: 6 digit angka numerik (contoh: `482910`).
2. **Masa Berlaku**: 10 menit sejak kasir menekan tombol minta otorisasi.
3. **Model di BMS**: **Claim & Dispatch** (PIN disembunyikan sampai ditarik oleh admin/supervisor yang bertugas).
4. **Bypass Akun Admin**: Jika akun yang login di POS ber-role `admin`, dialog PIN di-bypass otomatis.
5. **Proteksi Brute-Force**: Maksimal 3 kali salah input PIN. Pada kesalahan ke-3, permohonan otomatis digugurkan (`rejected`) dan kasir harus meminta otorisasi baru.
6. **Strict Zero-Trust**: PIN berlaku **one-time use** (satu kali eksekusi aksi). Sesi izin langsung terkunci kembali setelah aksi selesai.
7. **Timeout Tanpa Respon (Fail-Safe Closed)**: Jika waktu 10 menit habis tanpa ada respon dari atasan, aksi tetap diblokir dan muncul pesan kedaluwarsa beserta tombol *"Minta Otorisasi Ulang"*.

---

## 3. Spesifikasi Kontrak RPC Supabase

### 3.1. RPC: Permintaan Otorisasi (`request_pos_authorization`)

Dipanggil saat kasir meminta otorisasi atasan.

* **Nama RPC**: `request_pos_authorization`
* **Method**: `client.Rpc("request_pos_authorization", parameters)`
* **Parameter Input**:
  | Parameter | Tipe Data | Wajib | Keterangan |
  | :--- | :--- | :--- | :--- |
  | `p_action_type` | `text` | Ya | Contoh: `'access_settings'`, `'void_transaction'`, `'manual_discount'`, dll. |
  | `p_gudang_id` | `uuid` | Opsional/Null | ID Gudang/Outlet aktif POS saat ini |
  | `p_device_name` | `text` | Opsional/Null | Nama mesin/PC kasir (misal `Environment.MachineName`) |
  | `p_action_metadata`| `jsonb` | Opsional | Metadata konteks transaksi (nomor nota, nominal, alasan) |

* **Contoh Pemanggilan dengan Metadata (C#)**:
  ```csharp
  // Contoh saat kasir meminta Void Nota
  var metadata = new Dictionary<string, object>
  {
      { "nota_no", "INV/20261004/0082" },
      { "total", 350000 },
      { "alasan", "Pelanggan salah bawa barang belanjaan" }
  };

  var parameters = new Dictionary<string, object?>
  {
      { "p_action_type", "void_transaction" },
      { "p_gudang_id", currentGudangId },
      { "p_device_name", Environment.MachineName },
      { "p_action_metadata", metadata }
  };

  var response = await client.Rpc("request_pos_authorization", parameters);
  ```

* **Return Payload (JSON)**:
  ```json
  {
    "success": true,
    "request_id": "7b58e709-3fd1-4bc6-8d6f-239121a971d2",
    "expires_at": "2026-10-04T13:45:00Z",
    "message": "Permintaan otorisasi berhasil dikirim ke atasan"
  }
  ```

---

### 3.2. RPC: Verifikasi PIN (`verify_pos_authorization`)

Dipanggil saat kasir menekan tombol *"Konfirmasi PIN"*.

* **Nama RPC**: `verify_pos_authorization`
* **Method**: `client.Rpc("verify_pos_authorization", parameters)`
* **Parameter Input**:
  | Parameter | Tipe Data | Wajib | Keterangan |
  | :--- | :--- | :--- | :--- |
  | `p_pin` | `text` | Ya | 6 digit string PIN yang diketik kasir (misal `"482910"`) |
  | `p_action_type` | `text` | Ya | Kode aksi yang sama saat meminta otorisasi |
  | `p_gudang_id` | `uuid` | Opsional/Null | ID Gudang/Outlet aktif POS saat ini |

* **Return Payload (JSON)**:
  - **Berhasil**:
    ```json
    { "success": true, "message": "Otorisasi berhasil diberikan" }
    ```
  - **Salah Input (Percobaan < 3)**:
    ```json
    { "success": false, "attempts_remaining": 2, "message": "PIN salah. Sisa kesempatan: 2 kali" }
    ```
  - **Salah Input 3 Kali (Diblokir / Rejected)**:
    ```json
    { "success": false, "attempts_remaining": 0, "is_blocked": true, "message": "PIN salah 3 kali. Permohonan dibatalkan, silakan minta otorisasi baru." }
    ```
  - **Kedaluwarsa (Lewat 10 Menit)**:
    ```json
    { "success": false, "message": "Permohonan otorisasi telah kedaluwarsa. Silakan minta otorisasi baru." }
    ```

---

## 4. Penanganan Kasus Khusus (Edge Cases)

1. **Timeout 10 Menit Tanpa Respon Atasan**:
   - Jika waktu 10 menit habis tanpa ada admin yang merespons: dialog kasir menampilkan peringatan kedaluwarsa ramah pengguna, aksi tetap diblokir, dan tombol berubah menjadi *"Minta Otorisasi Ulang"* dan *"Batal"*.
2. **Anti-Spam (Cooldown 30 Detik)**:
   - Tombol minta otorisasi memiliki cooldown 30 detik agar kasir tidak melakukan spam permintaan ke BMS.
3. **Strict Zero-Trust (One-Time Execution)**:
   - Satu PIN hanya dapat digunakan untuk 1 kali eksekusi aksi. Jika kasir ingin melakukan aksi sensitif berikutnya, kasir wajib meminta PIN baru.
