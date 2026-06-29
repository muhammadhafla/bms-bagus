-- Migration 003: Sprint 2 Performance Optimizations (RPCs)
-- This migration adds server-side aggregation and pagination logic to reduce client-side load.

-- 1. Function to get dashboard statistics
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
 RETURNS json
 LANGUAGE sql
 STABLE
AS $function$
  SELECT json_build_object(
    'total_inventory_value', COALESCE(SUM(stok * COALESCE(harga_beli_terakhir, 0)), 0),
    'total_items', COUNT(*),
    'low_stock_count', COUNT(*) FILTER (
      WHERE minimum_stock IS NOT NULL 
        AND stok <= minimum_stock 
        AND (is_discontinued IS NULL OR NOT is_discontinued)
    )
  ) FROM inventory
$function$;

-- 2. Function for paginated inventory retrieval
CREATE OR REPLACE FUNCTION public.get_inventory_paginated(p_search text DEFAULT NULL::text, p_category_id uuid DEFAULT NULL::uuid, p_low_stock_only boolean DEFAULT false, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS SETOF inventory
 LANGUAGE sql
 STABLE
AS $function$
  SELECT * FROM inventory
  WHERE 
    (p_search IS NULL OR nama_barang ILIKE '%' || p_search || '%' OR kode_barcode ILIKE '%' || p_search || '%')
    AND (p_category_id IS NULL OR id_kategori = p_category_id)
    AND (NOT p_low_stock_only OR (minimum_stock IS NOT NULL AND stok <= minimum_stock))
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset
$function$;
