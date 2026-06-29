CREATE OR REPLACE FUNCTION get_low_stock_items(p_search text DEFAULT NULL)
RETURNS SETOF inventory AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM inventory 
  WHERE minimum_stock IS NOT NULL 
    AND stok <= minimum_stock
    AND is_discontinued = false
    AND (
      p_search IS NULL 
      OR p_search = ''
      OR nama_barang ILIKE '%' || p_search || '%' 
      OR kode_barcode ILIKE '%' || p_search || '%'
    )
  ORDER BY nama_barang ASC;
END;
$$ LANGUAGE plpgsql STABLE;
