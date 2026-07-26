# Implementasi Void per Item Pembelian Return

## File yang dibuat/diubah:

1. **migration_20260416_add_voided_at_to_pembelian_return_items.sql**
   - Menambahkan kolom `voided_at timestamptz` pada `pembelian_return_items`
   - Menambahkan index `idx_pembelian_return_items_voided_at`
   - Menambahkan RLS Policy `pembelian_return_items_void_update_all_auth` agar authenticated user bisa update voided_at

2. **supabase_func_void_pembelian_return_item.sql**
   - Stored procedure utama `public.void_pembelian_return_item()`
   - Implementasi idempotent (tidak error jika item sudah di-void)
   - Otomatis koreksi stok (+ qty)
   - Mencatat ke stock_movements dengan referensi 'VOID_RETURN_ITEM:<id>'

3. **supabase_func_proses_return_batch.sql**
   - ✅ Diperbaiki: query perhitungan sisa qty sekarang hanya menghitung item yang `voided_at IS NULL`
   - Item yang sudah di-void tidak lagi mempengaruhi perhitungan sisa qty return

## Cara Pakai untuk Frontend:
```sql
-- Panggil void per item
select * from public.void_pembelian_return_item('<pembelian_return_items_id>');

-- Opsional dengan note
select * from public.void_pembelian_return_item('<id>', 'Koreksi kesalahan input');
```

## Catatan Penting:
- Semua query yang menampilkan / menghitung `pembelian_return_items` perlu menambahkan filter `WHERE voided_at IS NULL`
- UI harus menampilkan badge "VOID" untuk item dengan `voided_at IS NOT NULL`
- Tombol Void hanya tampil untuk item yang belum di-void
