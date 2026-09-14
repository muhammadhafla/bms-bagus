-- Migration: Fix get_penjualan_returned_items volatility category
-- STABLE is inappropriate for a function that queries frequently-written tables.
-- Use VOLATILE (the default) so PostgreSQL never caches the result across statements.

CREATE OR REPLACE FUNCTION public.get_penjualan_returned_items(p_penjualan_id uuid)
RETURNS TABLE (
  penjualan_item_id uuid,
  inventory_id uuid,
  returned_qty int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    COALESCE(pri.penjualan_item_id, pi.id) AS penjualan_item_id,
    COALESCE(pri.inventory_id, pi.inventory_id) AS inventory_id,
    COALESCE(SUM(pri.qty), 0)::int AS returned_qty
  FROM public.penjualan_return pr
  JOIN public.penjualan_return_items pri ON pri.penjualan_return_id = pr.id
  LEFT JOIN public.penjualan_items pi ON pi.id = pri.penjualan_item_id
  WHERE pr.penjualan_id = p_penjualan_id
  GROUP BY COALESCE(pri.penjualan_item_id, pi.id), COALESCE(pri.inventory_id, pi.inventory_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_penjualan_returned_items(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_penjualan_returned_items(uuid) TO service_role;
