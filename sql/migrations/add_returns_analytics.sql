CREATE OR REPLACE FUNCTION get_analytics_returns(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_revenue_returned NUMERIC;
  v_total_transactions INTEGER;
  v_top_items JSONB;
  v_reasons JSONB;
BEGIN
  -- 1. KPI
  SELECT 
    COALESCE(SUM(pri.harga_final * pri.qty), 0),
    COUNT(DISTINCT pr.id)
  INTO 
    v_total_revenue_returned,
    v_total_transactions
  FROM penjualan_return pr
  JOIN penjualan_return_items pri ON pr.id = pri.penjualan_return_id
  WHERE (p_start_date IS NULL OR pr.tanggal >= p_start_date::date)
    AND (p_end_date IS NULL OR pr.tanggal <= p_end_date::date);

  -- 2. Top Items
  SELECT COALESCE(jsonb_agg(item_agg), '[]'::jsonb)
  INTO v_top_items
  FROM (
    SELECT 
      pri.inventory_id,
      pri.nama_barang,
      SUM(pri.qty)::integer as total_qty,
      SUM(pri.harga_final * pri.qty)::numeric as total_value
    FROM penjualan_return pr
    JOIN penjualan_return_items pri ON pr.id = pri.penjualan_return_id
    WHERE (p_start_date IS NULL OR pr.tanggal >= p_start_date::date)
      AND (p_end_date IS NULL OR pr.tanggal <= p_end_date::date)
    GROUP BY pri.inventory_id, pri.nama_barang
    ORDER BY total_qty DESC, total_value DESC
    LIMIT 10
  ) item_agg;

  -- 3. Reasons
  SELECT COALESCE(jsonb_agg(reason_agg), '[]'::jsonb)
  INTO v_reasons
  FROM (
    SELECT 
      COALESCE(pr.note, 'Tanpa Alasan') as reason,
      COUNT(DISTINCT pr.id)::integer as count
    FROM penjualan_return pr
    WHERE (p_start_date IS NULL OR pr.tanggal >= p_start_date::date)
      AND (p_end_date IS NULL OR pr.tanggal <= p_end_date::date)
    GROUP BY COALESCE(pr.note, 'Tanpa Alasan')
    ORDER BY count DESC
  ) reason_agg;

  RETURN jsonb_build_object(
    'kpi', jsonb_build_object(
      'total_revenue_returned', COALESCE(v_total_revenue_returned, 0),
      'total_transactions', COALESCE(v_total_transactions, 0)
    ),
    'top_items', v_top_items,
    'reasons', v_reasons
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_analytics_returns TO authenticated;
