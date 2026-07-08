-- SQL Functions: get_sales_report & get_profit_report (Server-side aggregation)
-- Mengganti client-side aggregation yang menarik semua rows ke browser
-- Semua grouping, sorting, dan pagination dilakukan di PostgreSQL

-- ============================================================
-- FUNCTION 1: get_sales_report
-- Laporan penjualan per hari dengan aggregasi server-side
-- ============================================================
CREATE OR REPLACE FUNCTION get_sales_report(
  p_start_date  DATE    DEFAULT NULL,
  p_end_date    DATE    DEFAULT NULL,
  p_category_id UUID    DEFAULT NULL,
  p_page        INTEGER DEFAULT 1,
  p_limit       INTEGER DEFAULT 20
)
RETURNS TABLE(
  report_date         DATE,
  total_sales         NUMERIC,
  total_cash          NUMERIC,
  total_qris          NUMERIC,
  total_items         BIGINT,
  transaction_count   BIGINT,
  total_count         BIGINT    -- total rows for pagination (window function)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INTEGER := (GREATEST(1, p_page) - 1) * LEAST(100, GREATEST(1, p_limit));
  v_limit  INTEGER := LEAST(100, GREATEST(1, p_limit));
BEGIN
  RETURN QUERY
  WITH filtered_items AS (
    SELECT
      p.tanggal,
      pi.penjualan_id,
      SUM(pi.harga_final * pi.qty) AS item_total,
      SUM(pi.qty) AS qty,
      MAX(COALESCE(p.cash_amount, 0) - COALESCE(p.kembalian, 0)) AS cash_amount,
      MAX(p.qris_amount) AS qris_amount
    FROM penjualan_items pi
    JOIN penjualan p ON p.id = pi.penjualan_id
    JOIN inventory i ON i.id = pi.inventory_id
    WHERE
      (p_start_date  IS NULL OR p.tanggal >= p_start_date)
      AND (p_end_date  IS NULL OR p.tanggal <= p_end_date)
      AND (p_category_id IS NULL OR i.id_kategori = p_category_id)
    GROUP BY p.tanggal, pi.penjualan_id
  ),
  daily_agg AS (
    SELECT
      fi.tanggal,
      SUM(fi.item_total)                            AS total_sales,
      SUM(COALESCE(fi.cash_amount, 0))              AS total_cash,
      SUM(COALESCE(fi.qris_amount, 0))              AS total_qris,
      SUM(fi.qty)                                    AS total_items,
      COUNT(fi.penjualan_id)                        AS transaction_count
    FROM filtered_items fi
    GROUP BY fi.tanggal
  )
  SELECT
    da.tanggal                                     AS report_date,
    da.total_sales,
    da.total_cash,
    da.total_qris,
    da.total_items::BIGINT,
    da.transaction_count::BIGINT,
    COUNT(*) OVER()::BIGINT                        AS total_count
  FROM daily_agg da
  ORDER BY da.tanggal DESC
  LIMIT v_limit OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sales_report(DATE, DATE, UUID, INTEGER, INTEGER) TO authenticated;


-- ============================================================
-- FUNCTION 2: get_profit_report
-- Laporan laba per hari menggunakan cost_at_sale sebagai HPP
-- ============================================================
CREATE OR REPLACE FUNCTION get_profit_report(
  p_start_date  DATE    DEFAULT NULL,
  p_end_date    DATE    DEFAULT NULL,
  p_category_id UUID    DEFAULT NULL,
  p_page        INTEGER DEFAULT 1,
  p_limit       INTEGER DEFAULT 20
)
RETURNS TABLE(
  report_date         DATE,
  total_modal         NUMERIC,
  total_penjualan     NUMERIC,
  total_profit        NUMERIC,
  margin_percentage   NUMERIC,
  total_count         BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INTEGER := (GREATEST(1, p_page) - 1) * LEAST(100, GREATEST(1, p_limit));
  v_limit  INTEGER := LEAST(100, GREATEST(1, p_limit));
BEGIN
  RETURN QUERY
  WITH filtered_items AS (
    SELECT
      p.tanggal,
      pi.cost_at_sale * pi.qty AS item_cogs,
      pi.harga_final  * pi.qty AS item_revenue
    FROM penjualan_items pi
    JOIN penjualan p ON p.id = pi.penjualan_id
    JOIN inventory i ON i.id = pi.inventory_id
    WHERE
      (p_start_date  IS NULL OR p.tanggal >= p_start_date)
      AND (p_end_date  IS NULL OR p.tanggal <= p_end_date)
      AND (p_category_id IS NULL OR i.id_kategori = p_category_id)
  ),
  daily_profit AS (
    SELECT
      fi.tanggal,
      SUM(fi.item_cogs)                                                       AS total_modal,
      SUM(fi.item_revenue)                                                    AS total_penjualan,
      SUM(fi.item_revenue) - SUM(fi.item_cogs)                               AS total_profit,
      CASE
        WHEN SUM(fi.item_revenue) > 0
        THEN ROUND(((SUM(fi.item_revenue) - SUM(fi.item_cogs)) / SUM(fi.item_revenue)) * 100, 2)
        ELSE 0
      END                                                                     AS margin_percentage
    FROM filtered_items fi
    GROUP BY fi.tanggal
  )
  SELECT
    dp.tanggal            AS report_date,
    dp.total_modal,
    dp.total_penjualan,
    dp.total_profit,
    dp.margin_percentage,
    COUNT(*) OVER()::BIGINT AS total_count
  FROM daily_profit dp
  ORDER BY dp.tanggal DESC
  LIMIT v_limit OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_profit_report(DATE, DATE, UUID, INTEGER, INTEGER) TO authenticated;


-- ============================================================
-- FUNCTION 3: get_top_selling_items
-- Top N item terlaris berdasarkan qty terjual + profit
-- ============================================================
CREATE OR REPLACE FUNCTION get_top_selling_items(
  p_start_date  DATE    DEFAULT NULL,
  p_end_date    DATE    DEFAULT NULL,
  p_category_id UUID    DEFAULT NULL,
  p_limit       INTEGER DEFAULT 10
)
RETURNS TABLE(
  inventory_id  UUID,
  nama_barang   TEXT,
  total_qty     BIGINT,
  total_sales   NUMERIC,
  total_profit  NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pi.inventory_id,
    pi.nama_barang,
    SUM(pi.qty)::BIGINT                              AS total_qty,
    SUM(pi.harga_final * pi.qty)                    AS total_sales,
    SUM((pi.harga_final - pi.cost_at_sale) * pi.qty) AS total_profit
  FROM penjualan_items pi
  JOIN penjualan p ON p.id = pi.penjualan_id
  JOIN inventory i ON i.id = pi.inventory_id
  WHERE
    (p_start_date  IS NULL OR p.tanggal >= p_start_date)
    AND (p_end_date  IS NULL OR p.tanggal <= p_end_date)
    AND (p_category_id IS NULL OR i.id_kategori = p_category_id)
  GROUP BY pi.inventory_id, pi.nama_barang
  ORDER BY total_qty DESC
  LIMIT LEAST(100, GREATEST(1, p_limit));
END;
$$;

GRANT EXECUTE ON FUNCTION get_top_selling_items(DATE, DATE, UUID, INTEGER) TO authenticated;
