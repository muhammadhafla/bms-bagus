-- Function: get_available_return_items
-- Returns items from purchases that can be returned to a specific supplier

CREATE OR REPLACE FUNCTION get_available_return_items(p_supplier_id UUID)
RETURNS TABLE (
  pembelian_item_id UUID,
  pembelian_id UUID,
  inventory_id UUID,
  nama_barang TEXT,
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
    pi.harga_beli,
    COALESCE(pi.diskon, 0) AS diskon,
    pi.qty AS qty_original,
    COALESCE(SUM(pri.qty)::INTEGER, 0) AS qty_returned,
    (pi.qty - COALESCE(SUM(pri.qty)::INTEGER, 0)) AS qty_remaining,
    p.tanggal AS tanggal_pembelian,
    p.nomor_nota AS nomor_nota
  FROM pembelian_items pi
  JOIN pembelian p ON p.id = pi.pembelian_id
  LEFT JOIN pembelian_return_items pri 
    ON pri.pembelian_item_id = pi.id
  WHERE p.supplier_id = p_supplier_id
  GROUP BY pi.id, pi.pembelian_id, pi.inventory_id, pi.nama_barang, pi.harga_beli, pi.diskon, pi.qty, p.tanggal, p.nomor_nota
  HAVING (pi.qty - COALESCE(SUM(pri.qty)::INTEGER, 0)) > 0
  ORDER BY p.tanggal DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_available_return_items(UUID) TO authenticated;