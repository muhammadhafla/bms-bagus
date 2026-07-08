-- ============================================================
-- RETAIL ANALYTICS RPCs
-- ============================================================

-- 1. get_analytics_busiest_hours
CREATE OR REPLACE FUNCTION get_analytics_busiest_hours(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date   TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  hour_of_day       INTEGER,
  transaction_count BIGINT,
  total_revenue     NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(HOUR FROM p.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::INTEGER AS hour_of_day,
    COUNT(p.id)::BIGINT AS transaction_count,
    SUM(p.total) AS total_revenue
  FROM penjualan p
  WHERE (p_start_date IS NULL OR p.created_at >= p_start_date)
    AND (p_end_date IS NULL OR p.created_at <= p_end_date)
  GROUP BY EXTRACT(HOUR FROM p.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')
  ORDER BY hour_of_day ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_analytics_busiest_hours TO authenticated;

-- 2. get_analytics_categories
CREATE OR REPLACE FUNCTION get_analytics_categories(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date   TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  category_name TEXT,
  total_revenue NUMERIC,
  total_items   BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(k.nama, 'Uncategorized') AS category_name,
    SUM(pi.harga_final * pi.qty) AS total_revenue,
    SUM(pi.qty)::BIGINT AS total_items
  FROM penjualan_items pi
  JOIN penjualan p ON p.id = pi.penjualan_id
  JOIN inventory i ON i.id = pi.inventory_id
  LEFT JOIN kategori k ON k.id = i.id_kategori
  WHERE (p_start_date IS NULL OR p.created_at >= p_start_date)
    AND (p_end_date IS NULL OR p.created_at <= p_end_date)
  GROUP BY k.id, k.nama
  ORDER BY total_revenue DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_analytics_categories TO authenticated;

-- 3. get_analytics_payment_methods
CREATE OR REPLACE FUNCTION get_analytics_payment_methods(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date   TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  total_cash        NUMERIC,
  total_qris        NUMERIC,
  transaction_count BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(COALESCE(p.cash_amount, 0)) AS total_cash,
    SUM(COALESCE(p.qris_amount, 0)) AS total_qris,
    COUNT(p.id)::BIGINT AS transaction_count
  FROM penjualan p
  WHERE (p_start_date IS NULL OR p.created_at >= p_start_date)
    AND (p_end_date IS NULL OR p.created_at <= p_end_date);
END;
$$;

GRANT EXECUTE ON FUNCTION get_analytics_payment_methods TO authenticated;

-- 4. get_analytics_stock_velocity
CREATE OR REPLACE FUNCTION get_analytics_stock_velocity(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date   TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  inventory_id   UUID,
  nama_barang    TEXT,
  total_sold     BIGINT,
  sales_velocity NUMERIC,
  current_stock  INTEGER
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_days NUMERIC;
BEGIN
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    v_days := EXTRACT(EPOCH FROM (p_end_date - p_start_date)) / 86400.0;
  ELSE
    v_days := 1.0;
  END IF;
  
  IF v_days <= 0 THEN
    v_days := 1.0;
  END IF;

  RETURN QUERY
  SELECT
    i.id AS inventory_id,
    i.nama_barang,
    SUM(pi.qty)::BIGINT AS total_sold,
    ROUND((SUM(pi.qty) / v_days)::NUMERIC, 2) AS sales_velocity,
    i.stok AS current_stock
  FROM inventory i
  LEFT JOIN penjualan_items pi ON pi.inventory_id = i.id
  LEFT JOIN penjualan p ON p.id = pi.penjualan_id
  WHERE (p_start_date IS NULL OR p.created_at >= p_start_date)
    AND (p_end_date IS NULL OR p.created_at <= p_end_date)
  GROUP BY i.id, i.nama_barang, i.stok
  HAVING SUM(pi.qty) > 0
  ORDER BY sales_velocity DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_analytics_stock_velocity TO authenticated;

-- 5. get_analytics_profitability_and_atv
CREATE OR REPLACE FUNCTION get_analytics_profitability(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date   TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  inventory_id   UUID,
  nama_barang    TEXT,
  total_sold     BIGINT,
  total_profit   NUMERIC,
  profit_margin  NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id AS inventory_id,
    i.nama_barang,
    SUM(pi.qty)::BIGINT AS total_sold,
    SUM((pi.harga_final - pi.cost_at_sale) * pi.qty) AS total_profit,
    CASE 
      WHEN SUM(pi.harga_final * pi.qty) > 0 
      THEN ROUND((SUM((pi.harga_final - pi.cost_at_sale) * pi.qty) / SUM(pi.harga_final * pi.qty)) * 100, 2)
      ELSE 0 
    END AS profit_margin
  FROM penjualan_items pi
  JOIN penjualan p ON p.id = pi.penjualan_id
  JOIN inventory i ON i.id = pi.inventory_id
  WHERE (p_start_date IS NULL OR p.created_at >= p_start_date)
    AND (p_end_date IS NULL OR p.created_at <= p_end_date)
  GROUP BY i.id, i.nama_barang
  HAVING SUM(pi.qty) > 0
  ORDER BY total_profit DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_analytics_profitability TO authenticated;

-- get_analytics_atv
CREATE OR REPLACE FUNCTION get_analytics_atv(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date   TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  avg_transaction_value NUMERIC,
  items_per_ticket      NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE 
      WHEN COUNT(DISTINCT p.id) > 0 THEN ROUND(SUM(p.total) / COUNT(DISTINCT p.id), 2)
      ELSE 0
    END AS avg_transaction_value,
    CASE
      WHEN COUNT(DISTINCT p.id) > 0 THEN ROUND(SUM(pi.qty)::NUMERIC / COUNT(DISTINCT p.id), 2)
      ELSE 0
    END AS items_per_ticket
  FROM penjualan p
  LEFT JOIN penjualan_items pi ON pi.penjualan_id = p.id
  WHERE (p_start_date IS NULL OR p.created_at >= p_start_date)
    AND (p_end_date IS NULL OR p.created_at <= p_end_date);
END;
$$;

GRANT EXECUTE ON FUNCTION get_analytics_atv TO authenticated;

-- ============================================================
-- 6. get_analytics_sales_trend (Hour, Day, Date)
-- ============================================================
CREATE OR REPLACE FUNCTION get_analytics_sales_trend(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date   TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_group_by   TEXT DEFAULT 'hour'
)
RETURNS TABLE (
  label_waktu       TEXT,
  transaction_count BIGINT,
  total_revenue     NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  IF p_group_by = 'day' THEN
    RETURN QUERY
    SELECT
      to_char(p.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta', 'Day') AS label_waktu,
      COUNT(p.id)::BIGINT AS transaction_count,
      SUM(p.total) AS total_revenue
    FROM penjualan p
    WHERE (p_start_date IS NULL OR p.created_at >= p_start_date)
      AND (p_end_date IS NULL OR p.created_at <= p_end_date)
    GROUP BY EXTRACT(ISODOW FROM p.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta'), to_char(p.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta', 'Day')
    ORDER BY EXTRACT(ISODOW FROM p.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta') ASC;
  ELSIF p_group_by = 'date' THEN
    RETURN QUERY
    SELECT
      to_char(p.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS label_waktu,
      COUNT(p.id)::BIGINT AS transaction_count,
      SUM(p.total) AS total_revenue
    FROM penjualan p
    WHERE (p_start_date IS NULL OR p.created_at >= p_start_date)
      AND (p_end_date IS NULL OR p.created_at <= p_end_date)
    GROUP BY to_char(p.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD')
    ORDER BY to_char(p.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') ASC;
  ELSE
    -- default to 'hour'
    RETURN QUERY
    SELECT
      LPAD(EXTRACT(HOUR FROM p.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::TEXT, 2, '0') || ':00' AS label_waktu,
      COUNT(p.id)::BIGINT AS transaction_count,
      SUM(p.total) AS total_revenue
    FROM penjualan p
    WHERE (p_start_date IS NULL OR p.created_at >= p_start_date)
      AND (p_end_date IS NULL OR p.created_at <= p_end_date)
    GROUP BY EXTRACT(HOUR FROM p.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')
    ORDER BY EXTRACT(HOUR FROM p.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta') ASC;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_analytics_sales_trend TO authenticated;
