-- Update get_low_stock_items to exclude discontinued items
CREATE OR REPLACE FUNCTION get_low_stock_items(p_search TEXT DEFAULT NULL)
RETURNS SETOF public.inventory LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.inventory
    WHERE stok <= minimum_stock
    AND COALESCE(is_discontinued, false) = false
    AND (p_search IS NULL OR nama_barang ILIKE '%' || p_search || '%');
END;
$$;

-- Update get_dashboard_stats to not count discontinued items in low_stock_items
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
    total_inventory_value NUMERIC,
    total_items BIGINT,
    low_stock_items BIGINT
) LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(stok * harga_beli_terakhir), 0) AS total_inventory_value,
        COUNT(id) AS total_items,
        COUNT(id) FILTER (WHERE stok <= minimum_stock AND COALESCE(is_discontinued, false) = false) AS low_stock_items
    FROM public.inventory;
END;
$$;
