CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  total_inventory_value numeric,
  total_items bigint,
  low_stock_items bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(stok * COALESCE(harga_beli_terakhir, 0)), 0)::numeric AS total_inventory_value,
    COUNT(*) AS total_items,
    COUNT(*) FILTER (WHERE minimum_stock IS NOT NULL AND stok < minimum_stock AND is_discontinued = false) AS low_stock_items
  FROM inventory;
END;
$$ LANGUAGE plpgsql STABLE;
