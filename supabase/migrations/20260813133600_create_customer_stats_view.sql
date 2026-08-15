-- Create View for Customer Statistics (CRM Analytics)
CREATE OR REPLACE VIEW vw_customer_stats AS
SELECT 
    m.id,
    m.name,
    m.whatsapp_number,
    m.tier_id,
    m.points,
    m.created_at,
    COUNT(p.id) as total_transactions,
    COALESCE(SUM(p.total), 0) as total_spent,
    MAX(p.tanggal) as last_visit
FROM members m
LEFT JOIN penjualan p ON m.id = p.member_id AND p.status = 'paid'
GROUP BY m.id;

-- Grant access to authenticated users
GRANT SELECT ON vw_customer_stats TO authenticated;
GRANT SELECT ON vw_customer_stats TO service_role;
