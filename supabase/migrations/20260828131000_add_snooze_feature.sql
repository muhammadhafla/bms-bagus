-- Add snoozed_until column
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMP WITH TIME ZONE;

-- Update get_low_stock_items to exclude snoozed items
CREATE OR REPLACE FUNCTION get_low_stock_items(p_search TEXT DEFAULT NULL)
RETURNS SETOF public.inventory LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.inventory
    WHERE stok <= minimum_stock
    AND COALESCE(is_discontinued, false) = false
    AND (snoozed_until IS NULL OR snoozed_until < NOW())
    AND (p_search IS NULL OR nama_barang ILIKE '%' || p_search || '%');
END;
$$;

-- Update get_dashboard_stats to exclude snoozed items from low_stock count
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
        COUNT(id) FILTER (WHERE stok <= minimum_stock AND COALESCE(is_discontinued, false) = false AND (snoozed_until IS NULL OR snoozed_until < NOW())) AS low_stock_items
    FROM public.inventory;
END;
$$;

-- Create RPC for snoozing
CREATE OR REPLACE FUNCTION snooze_low_stock_item(p_id UUID, p_days INT, p_user UUID)
RETURNS SETOF public.inventory LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
    UPDATE public.inventory
    SET snoozed_until = NOW() + (p_days || ' days')::INTERVAL,
        updated_by = p_user,
        updated_at = NOW()
    WHERE id = p_id;
    
    RETURN QUERY SELECT * FROM public.inventory WHERE id = p_id;
END;
$$;
