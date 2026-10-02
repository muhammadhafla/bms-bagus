-- 1. Menambahkan kolom barcode pada get_available_return_items
DROP FUNCTION IF EXISTS get_available_return_items(uuid);

CREATE OR REPLACE FUNCTION get_available_return_items(p_supplier_id UUID)
RETURNS TABLE (
  pembelian_item_id UUID,
  pembelian_id UUID,
  inventory_id UUID,
  nama_barang TEXT,
  barcode TEXT,
  harga_beli NUMERIC,
  diskon NUMERIC,
  qty_original INTEGER,
  qty_returned INTEGER,
  qty_remaining INTEGER,
  tanggal_pembelian DATE,
  nomor_nota TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pi.id AS pembelian_item_id,
    pi.pembelian_id,
    pi.inventory_id,
    pi.nama_barang,
    i.barcode,
    pi.harga_beli,
    COALESCE(pi.diskon, 0) AS diskon,
    pi.qty AS qty_original,
    COALESCE(SUM(pri.qty)::INTEGER, 0) AS qty_returned,
    (pi.qty - COALESCE(SUM(pri.qty)::INTEGER, 0)) AS qty_remaining,
    p.tanggal AS tanggal_pembelian,
    p.nomor_nota
  FROM pembelian_items pi
  JOIN pembelian p ON p.id = pi.pembelian_id
  JOIN inventory i ON i.id = pi.inventory_id
  LEFT JOIN pembelian_return_items pri ON pri.pembelian_item_id = pi.id
  WHERE p.supplier_id = p_supplier_id
  GROUP BY 
    pi.id, pi.pembelian_id, pi.inventory_id, pi.nama_barang, 
    i.barcode, pi.harga_beli, pi.diskon, pi.qty, p.tanggal, p.nomor_nota
  HAVING (pi.qty - COALESCE(SUM(pri.qty)::INTEGER, 0)) > 0
  ORDER BY p.tanggal DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_available_return_items(UUID) TO authenticated;

-- 2. Fungsi baru untuk mendeteksi Supplier berdasarkan Barcode/Nama (Global Search)
CREATE OR REPLACE FUNCTION find_suppliers_for_return_by_barcode(p_barcode TEXT)
RETURNS TABLE (
  supplier_id UUID,
  supplier_nama TEXT,
  total_qty_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id AS supplier_id,
    s.nama AS supplier_nama,
    CAST(SUM(pi.qty - COALESCE(pri_qty.returned, 0)) AS INTEGER) AS total_qty_remaining
  FROM inventory i
  JOIN pembelian_items pi ON pi.inventory_id = i.id
  JOIN pembelian p ON p.id = pi.pembelian_id
  JOIN suppliers s ON s.id = p.supplier_id
  LEFT JOIN (
    SELECT pembelian_item_id, SUM(qty) AS returned 
    FROM pembelian_return_items 
    GROUP BY pembelian_item_id
  ) pri_qty ON pri_qty.pembelian_item_id = pi.id
  WHERE (i.barcode = p_barcode OR i.nama ILIKE '%' || p_barcode || '%')
  GROUP BY s.id, s.nama
  HAVING SUM(pi.qty - COALESCE(pri_qty.returned, 0)) > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION find_suppliers_for_return_by_barcode(TEXT) TO authenticated;
