-- SQL Functions: Dashboard Stats & 7-Day Trend (Server-side aggregation)
-- Mengganti logika client-side yang salah hitung profit (penjualan - pembelian)
-- Profit yang benar = revenue - cost_at_sale (HPP)

-- ============================================================
-- FUNCTION 1: get_today_profit
-- Menghitung profit hari ini berdasarkan cost_at_sale (HPP)
-- Dipanggil bersama get_dashboard_stats yang sudah ada
-- ============================================================
CREATE OR REPLACE FUNCTION get_today_profit(p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_revenue  NUMERIC := 0;
  v_today_cogs     NUMERIC := 0;
  v_today_profit   NUMERIC := 0;
  v_today_transactions INTEGER := 0;
  v_today_purchases NUMERIC := 0;
BEGIN
  -- Hitung revenue, COGS (cost_at_sale), dan jumlah transaksi penjualan hari ini
  SELECT
    COALESCE(SUM(pi.harga_final * pi.qty), 0),
    COALESCE(SUM(pi.cost_at_sale * pi.qty), 0),
    COUNT(DISTINCT pi.penjualan_id)
  INTO v_today_revenue, v_today_cogs, v_today_transactions
  FROM penjualan_items pi
  JOIN penjualan p ON p.id = pi.penjualan_id
  WHERE p.tanggal = p_date;

  v_today_profit := v_today_revenue - v_today_cogs;

  -- Total pembelian hari ini (untuk info)
  SELECT COALESCE(SUM(total_sistem), 0)
  INTO v_today_purchases
  FROM pembelian
  WHERE tanggal = p_date;

  RETURN jsonb_build_object(
    'today_sales',        v_today_revenue,
    'today_cogs',         v_today_cogs,
    'today_profit',       v_today_profit,
    'today_purchases',    v_today_purchases,
    'today_transactions', v_today_transactions
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_today_profit(DATE) TO authenticated;


-- ============================================================
-- FUNCTION 2: get_7day_trend_v2
-- Menghitung trend 7 hari dengan profit berbasis cost_at_sale
-- Mengganti logika client-side yang salah
-- ============================================================
CREATE OR REPLACE FUNCTION get_7day_trend_v2(p_start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '6 days')::DATE)
RETURNS TABLE(
  trend_date   DATE,
  penjualan    NUMERIC,
  pembelian    NUMERIC,
  profit       NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(p_start_date, CURRENT_DATE, '1 day'::interval)::DATE AS d
  ),
  daily_penjualan AS (
    SELECT
      p.tanggal,
      SUM(pi.harga_final * pi.qty)  AS revenue,
      SUM(pi.cost_at_sale * pi.qty) AS cogs
    FROM penjualan p
    JOIN penjualan_items pi ON pi.penjualan_id = p.id
    WHERE p.tanggal BETWEEN p_start_date AND CURRENT_DATE
    GROUP BY p.tanggal
  ),
  daily_pembelian AS (
    SELECT
      pb.tanggal,
      SUM(pb.total_sistem) AS total_beli
    FROM pembelian pb
    WHERE pb.tanggal BETWEEN p_start_date AND CURRENT_DATE
    GROUP BY pb.tanggal
  )
  SELECT
    ds.d                                        AS trend_date,
    COALESCE(dp.revenue, 0)                     AS penjualan,
    COALESCE(pb.total_beli, 0)                  AS pembelian,
    COALESCE(dp.revenue, 0) - COALESCE(dp.cogs, 0) AS profit
  FROM date_series ds
  LEFT JOIN daily_penjualan dp ON dp.tanggal = ds.d
  LEFT JOIN daily_pembelian pb ON pb.tanggal = ds.d
  ORDER BY ds.d ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_7day_trend_v2(DATE) TO authenticated;
