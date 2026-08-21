-- Migration to add a high-performance fuzzy search RPC for inventory
-- This uses pg_trgm which is already enabled in the core schema

CREATE OR REPLACE FUNCTION search_inventory(search_query text, limit_val int DEFAULT 20)
RETURNS TABLE (
  id uuid,
  nama_barang text,
  kode_barcode text,
  id_kategori uuid,
  stok int,
  minimum_stock int,
  harga_beli_terakhir numeric,
  harga_jual numeric,
  diskon numeric,
  is_discontinued boolean,
  created_at timestamptz,
  updated_at timestamptz,
  kategori jsonb,
  similarity_score real
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH search_results AS (
    SELECT 
      i.*,
      CASE 
        -- Tier 1: Exact match on barcode (Highest Priority)
        WHEN i.kode_barcode ILIKE search_query THEN 100.0
        -- Tier 1: Exact match on name
        WHEN i.nama_barang ILIKE search_query THEN 99.0
        -- Tier 2: Name starts with query
        WHEN i.nama_barang ILIKE search_query || '%' THEN 95.0
        -- Tier 3: Fuzzy similarity score (using pg_trgm similarity)
        ELSE similarity(i.nama_barang, search_query) * 100.0
      END::real AS calc_score
    FROM inventory i
    WHERE 
      i.kode_barcode ILIKE search_query || '%'
      OR i.nama_barang % search_query
      OR i.nama_barang ILIKE '%' || search_query || '%'
  )
  SELECT 
    sr.id,
    sr.nama_barang,
    sr.kode_barcode,
    sr.id_kategori,
    sr.stok,
    sr.minimum_stock,
    sr.harga_beli_terakhir,
    sr.harga_jual,
    sr.diskon,
    sr.is_discontinued,
    sr.created_at,
    sr.updated_at,
    (
      SELECT jsonb_build_object('id', k.id, 'nama', k.nama)
      FROM kategori k
      WHERE k.id = sr.id_kategori
    ) as kategori,
    sr.calc_score as similarity_score
  FROM search_results sr
  WHERE sr.calc_score > 0
  ORDER BY sr.calc_score DESC, sr.nama_barang ASC
  LIMIT limit_val;
END;
$$;
