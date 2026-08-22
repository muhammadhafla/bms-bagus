CREATE OR REPLACE VIEW v_recent_transactions AS
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
