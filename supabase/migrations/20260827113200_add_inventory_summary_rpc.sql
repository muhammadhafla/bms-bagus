CREATE OR REPLACE FUNCTION public.get_inventory_summary()
RETURNS TABLE (
  total_items BIGINT,
  total_stok BIGINT,
  total_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_items,
    SUM(stok)::BIGINT as total_stok,
    SUM(stok * COALESCE(harga_beli_terakhir, 0))::NUMERIC as total_value
  FROM public.inventory;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp';
