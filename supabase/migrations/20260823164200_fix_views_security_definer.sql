-- Fix SECURITY DEFINER on v_recent_transactions by using security_invoker = on
CREATE OR REPLACE VIEW public.v_recent_transactions WITH (security_invoker = on) AS
SELECT 
    id, 
    'penjualan' AS type, 
    total, 
    tanggal, 
    created_at
FROM penjualan

UNION ALL

SELECT 
    id, 
    'pembelian' AS type, 
    total_sistem AS total, 
    tanggal, 
    created_at
FROM pembelian;
