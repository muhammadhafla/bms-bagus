-- Fix missing dashboard functions and kas_log relation

-- 1. get_dashboard_stats
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
    total_inventory_value NUMERIC,
    total_items BIGINT,
    low_stock_items BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(stok * harga_beli_terakhir), 0) AS total_inventory_value,
        COUNT(id) AS total_items,
        COUNT(id) FILTER (WHERE stok <= minimum_stock) AS low_stock_items
    FROM public.inventory;
END;
$$;

-- 2. get_low_stock_items
CREATE OR REPLACE FUNCTION get_low_stock_items(p_search TEXT DEFAULT NULL)
RETURNS SETOF public.inventory LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.inventory
    WHERE stok <= minimum_stock
    AND (p_search IS NULL OR nama_barang ILIKE '%' || p_search || '%');
END;
$$;

-- 3. Fix kas_log foreign key to profiles
ALTER TABLE public.kas_log DROP CONSTRAINT IF EXISTS kas_log_created_by_fkey;
ALTER TABLE public.kas_log ADD CONSTRAINT kas_log_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
