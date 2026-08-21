-- ============================================================
-- Modifikasi: get_sales_report
-- Menambahkan grand_total_* menggunakan SUM() OVER()
-- ============================================================
DROP FUNCTION IF EXISTS get_sales_report(DATE, DATE, UUID, INTEGER, INTEGER);

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
  total_count         BIGINT,
  grand_total_sales   NUMERIC,
  grand_total_cash    NUMERIC,
  grand_total_qris    NUMERIC
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
      SUM(fi.qty)                                   AS total_items,
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
    COUNT(*) OVER()::BIGINT                        AS total_count,
    SUM(da.total_sales) OVER()::NUMERIC            AS grand_total_sales,
    SUM(da.total_cash) OVER()::NUMERIC             AS grand_total_cash,
    SUM(da.total_qris) OVER()::NUMERIC             AS grand_total_qris
  FROM daily_agg da
  ORDER BY da.tanggal DESC
  LIMIT v_limit OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sales_report(DATE, DATE, UUID, INTEGER, INTEGER) TO authenticated;

-- ============================================================
-- Modifikasi: get_profit_report
-- Menambahkan grand_total_* menggunakan SUM() OVER()
-- ============================================================
DROP FUNCTION IF EXISTS get_profit_report(DATE, DATE, UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_profit_report(
  p_start_date  DATE    DEFAULT NULL,
  p_end_date    DATE    DEFAULT NULL,
  p_category_id UUID    DEFAULT NULL,
  p_page        INTEGER DEFAULT 1,
  p_limit       INTEGER DEFAULT 20
)
RETURNS TABLE(
  report_date            DATE,
  total_modal            NUMERIC,
  total_penjualan        NUMERIC,
  total_profit           NUMERIC,
  margin_percentage      NUMERIC,
  total_count            BIGINT,
  grand_total_modal      NUMERIC,
  grand_total_penjualan  NUMERIC,
  grand_total_profit     NUMERIC
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
    dp.tanggal                                           AS report_date,
    dp.total_modal,
    dp.total_penjualan,
    dp.total_profit,
    dp.margin_percentage,
    COUNT(*) OVER()::BIGINT                              AS total_count,
    SUM(dp.total_modal) OVER()::NUMERIC                  AS grand_total_modal,
    SUM(dp.total_penjualan) OVER()::NUMERIC              AS grand_total_penjualan,
    SUM(dp.total_profit) OVER()::NUMERIC                 AS grand_total_profit
  FROM daily_profit dp
  ORDER BY dp.tanggal DESC
  LIMIT v_limit OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_profit_report(DATE, DATE, UUID, INTEGER, INTEGER) TO authenticated;

-- ============================================================
-- FUNCTION: export_sales_report
-- Mereturn semua data aggregated sales tanpa paginasi (untuk CSV)
-- ============================================================
CREATE OR REPLACE FUNCTION export_sales_report(
  p_start_date  DATE    DEFAULT NULL,
  p_end_date    DATE    DEFAULT NULL,
  p_category_id UUID    DEFAULT NULL
)
RETURNS TABLE(
  report_date         DATE,
  total_sales         NUMERIC,
  total_cash          NUMERIC,
  total_qris          NUMERIC,
  total_items         BIGINT,
  transaction_count   BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
      SUM(fi.qty)                                   AS total_items,
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
    da.transaction_count::BIGINT
  FROM daily_agg da
  ORDER BY da.tanggal DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION export_sales_report(DATE, DATE, UUID) TO authenticated;

-- ============================================================
-- FUNCTION: export_profit_report
-- Mereturn semua data aggregated profit tanpa paginasi (untuk CSV)
-- ============================================================
CREATE OR REPLACE FUNCTION export_profit_report(
  p_start_date  DATE    DEFAULT NULL,
  p_end_date    DATE    DEFAULT NULL,
  p_category_id UUID    DEFAULT NULL
)
RETURNS TABLE(
  report_date            DATE,
  total_modal            NUMERIC,
  total_penjualan        NUMERIC,
  total_profit           NUMERIC,
  margin_percentage      NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    dp.margin_percentage
  FROM daily_profit dp
  ORDER BY dp.tanggal DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION export_profit_report(DATE, DATE, UUID) TO authenticated;

-- ============================================================
-- FUNCTION: get_dashboard_summary
-- Konsolidasi 5 query overview dasbor menjadi 1 JSON object
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_summary(
  p_start_date DATE DEFAULT NULL,
  p_end_date   DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_busiest_hours JSONB;
  v_categories JSONB;
  v_payments JSONB;
  v_stock_velocity JSONB;
  v_profitability JSONB;
  v_atv JSONB;
  v_start TIMESTAMP;
  v_end TIMESTAMP;
BEGIN
  v_start := CASE WHEN p_start_date IS NOT NULL THEN (p_start_date || ' 00:00:00')::TIMESTAMP ELSE NULL END;
  v_end := CASE WHEN p_end_date IS NOT NULL THEN (p_end_date || ' 23:59:59')::TIMESTAMP ELSE NULL END;

  -- Busiest Hours
  SELECT jsonb_agg(row_to_json(t)) INTO v_busiest_hours
  FROM (
    SELECT * FROM get_analytics_busiest_hours(v_start, v_end)
  ) t;
  
  -- Categories
  SELECT jsonb_agg(row_to_json(t)) INTO v_categories
  FROM (
    SELECT * FROM get_analytics_categories(v_start, v_end)
  ) t;

  -- Payment Methods
  SELECT row_to_json(t)::JSONB INTO v_payments
  FROM (
    SELECT * FROM get_analytics_payment_methods(v_start, v_end)
  ) t;

  -- Stock Velocity
  SELECT jsonb_agg(row_to_json(t)) INTO v_stock_velocity
  FROM (
    SELECT * FROM get_analytics_stock_velocity(v_start, v_end)
  ) t;

  -- Profitability
  SELECT jsonb_agg(row_to_json(t)) INTO v_profitability
  FROM (
    SELECT * FROM get_analytics_profitability(v_start, v_end)
  ) t;

  -- ATV
  SELECT row_to_json(t)::JSONB INTO v_atv
  FROM (
    SELECT * FROM get_analytics_atv(v_start, v_end)
  ) t;

  RETURN jsonb_build_object(
    'busiest_hours', COALESCE(v_busiest_hours, '[]'::jsonb),
    'categories', COALESCE(v_categories, '[]'::jsonb),
    'payments', COALESCE(v_payments, '{}'::jsonb),
    'stock_velocity', COALESCE(v_stock_velocity, '[]'::jsonb),
    'profitability', COALESCE(v_profitability, '[]'::jsonb),
    'atv', COALESCE(v_atv, '{}'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_summary(DATE, DATE) TO authenticated;
