Template Dokumen Frontend — RPC + Batch (Next.js)
Di bawah ini adalah kontrak request/response yang bisa langsung dipakai tim frontend untuk memanggil RPC DB Anda (mode: batched p_items jsonb).

1) Return Pembelian — public.pembelian_return_create
Endpoint (Supabase RPC)
Nama RPC: pembelian_return_create
Parameter:
p_pembelian_id (uuid)
p_tanggal (date)
p_created_by (uuid)
p_note (text, boleh null)
p_idempotency_key (uuid, boleh null)
p_items (jsonb array)
Format p_items
Array item, setiap elemen minimal:

pembelian_item_id (uuid)
qty (number integer > 0)
[
  { 
"pembelian_item_id"
: 
"uuid-..."
, 
"qty"
: 
2
 },
  { 
"pembelian_item_id"
: 
"uuid-..."
, 
"qty"
: 
1
 }
]

Catatan perilaku:

Jika ada item dengan pembelian_item_id yang sama dikirim lebih dari sekali, DB akan mengakumulasi qty.
Return tidak boleh melebihi qty asli per pembelian_item_id.
Ada guard agar inventory.stok tidak menjadi negatif.
Idempotency key:
Jika p_idempotency_key sama sudah pernah dipakai, DB mengembalikan return yang sama (idempotent: true).
Response (jsonb)
Akan mengembalikan:

{
  
"status"
: 
"ok"
,
  
"pembelian_return_id"
: 
"uuid-..."
,
  
"total_qty"
: 
3
,
  
"idempotent"
: 
false
,
  
"affected_items"
: [
    { 
"pembelian_item_id"
: 
"uuid-..."
, 
"qty"
: 
2
 }
  ]
}

Contoh Next.js payload
await
 supabase.rpc(
"pembelian_return_create"
, {
  p_pembelian_id,
  p_tanggal,
  
p_created_by
: user.id,
  
p_note
: note ?? 
null
,
  
p_idempotency_key
: idempotencyKey ?? 
null
,
  
p_items
: items.map(
i
 =>
 ({
    
pembelian_item_id
: i.pembelian_item_id,
    
qty
: i.qty,
  })),
});

2) Return Penjualan — public.penjualan_return_create
Endpoint (Supabase RPC)
Nama RPC: penjualan_return_create
Parameter:
p_penjualan_id (uuid)
p_tanggal (date)
p_created_by (uuid)
p_note (text, boleh null)
p_idempotency_key (uuid, boleh null)
p_items (jsonb array)
Format p_items
Array item, setiap elemen minimal:

penjualan_item_id (uuid)
qty (number integer > 0)
[
  { 
"penjualan_item_id"
: 
"uuid-..."
, 
"qty"
: 
1
 },
  { 
"penjualan_item_id"
: 
"uuid-..."
, 
"qty"
: 
3
 }
]

Catatan perilaku:

Deduplikasi qty per penjualan_item_id.
Validasi semua penjualan_item_id harus belong ke p_penjualan_id.
Return tidak boleh melebihi qty asli.
Stok di inventory akan bertambah (karena return penjualan).
Idempotency key sama perilakunya: mengembalikan return yang sama.
Response (jsonb)
{
  
"status"
: 
"ok"
,
  
"penjualan_return_id"
: 
"uuid-..."
,
  
"total_qty"
: 
4
,
  
"affected_items"
: [
    { 
"penjualan_item_id"
: 
"uuid-..."
, 
"qty"
: 
3
 }
  ]
}

Contoh Next.js payload
await
 supabase.rpc(
"penjualan_return_create"
, {
  p_penjualan_id,
  p_tanggal,
  
p_created_by
: user.id,
  
p_note
: note ?? 
null
,
  
p_idempotency_key
: idempotencyKey ?? 
null
,
  
p_items
: items.map(
i
 =>
 ({
    
penjualan_item_id
: i.penjualan_item_id,
    
qty
: i.qty,
  })),
});

3) Rekomendasi frontend (anti double-submit)
Untuk semua tombol submit return:

Generate idempotencyKey (UUID) tiap kali user menekan “Submit”.
Simpan di state request sehingga jika user refresh/klik ulang, key yang sama dipakai lagi.
Tujuan: mencegah duplikasi insert dokumen return




[
  {
    "schema": "public",
    "function_name": "pembelian_return_create",
    "arguments": "p_pembelian_id uuid, p_tanggal date, p_created_by uuid, p_note text, p_idempotency_key uuid, p_items jsonb",
    "kind": "function"
  },
  {
    "schema": "public",
    "function_name": "tambah_pembelian",
    "arguments": "p_nama_barang text, p_qty integer, p_harga numeric, p_supplier_id uuid, p_tanggal date, p_user uuid",
    "kind": "function"
  },
  {
    "schema": "public",
    "function_name": "tambah_pembelian",
    "arguments": "p_nama_barang text, p_barcode text, p_qty integer, p_harga numeric, p_supplier_id uuid, p_tanggal date, p_user uuid",
    "kind": "function"
  },
  {
    "schema": "public",
    "function_name": "tambah_penjualan",
    "arguments": "p_inventory_id uuid, p_qty integer, p_harga numeric, p_tanggal date, p_user uuid",
    "kind": "function"
  }
]