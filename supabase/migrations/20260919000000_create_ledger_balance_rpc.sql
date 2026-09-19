CREATE OR REPLACE FUNCTION get_ledger_with_balance(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_tipe text DEFAULT NULL,
    p_sumber text DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_gudang_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    tanggal DATE,
    tipe_transaksi text,
    sumber text,
    referensi_id UUID,
    keterangan TEXT,
    nominal NUMERIC,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    gudang_id UUID,
    profiles JSONB,
    gudang JSONB,
    saldo_berjalan NUMERIC
) AS $$$
DECLARE
    v_opening_balance NUMERIC := 0;
BEGIN
    IF p_start_date IS NOT NULL THEN
        SELECT COALESCE(SUM(CASE WHEN b.tipe_transaksi = 'PEMASUKAN' THEN b.nominal ELSE -b.nominal END), 0)
        INTO v_opening_balance
        FROM buku_besar b
        WHERE b.tanggal < p_start_date
          AND (p_gudang_id IS NULL OR b.gudang_id = p_gudang_id);
    END IF;

    RETURN QUERY
    WITH filtered_ledger AS (
        SELECT 
            b.*,
            jsonb_build_object('nama', p.nama) as profiles,
            jsonb_build_object('id', g.id, 'nama', g.nama, 'kode_gudang', g.kode_gudang) as gudang
        FROM buku_besar b
        LEFT JOIN profiles p ON p.id = b.created_by
        LEFT JOIN gudang g ON g.id = b.gudang_id
        WHERE 
            (p_start_date IS NULL OR b.tanggal >= p_start_date)
            AND (p_end_date IS NULL OR b.tanggal <= p_end_date)
            AND (p_tipe IS NULL OR b.tipe_transaksi::text = p_tipe)
            AND (p_sumber IS NULL OR b.sumber::text = p_sumber)
            AND (p_gudang_id IS NULL OR b.gudang_id = p_gudang_id)
            AND (p_search IS NULL OR b.keterangan ILIKE '%' || p_search || '%')
    )
    SELECT 
        fl.id,
        fl.tanggal,
        fl.tipe_transaksi::text,
        fl.sumber::text,
        fl.referensi_id,
        fl.keterangan,
        fl.nominal,
        fl.created_by,
        fl.created_at,
        fl.gudang_id,
        fl.profiles,
        fl.gudang,
        v_opening_balance + SUM(CASE WHEN fl.tipe_transaksi::text = 'PEMASUKAN' THEN fl.nominal ELSE -fl.nominal END) 
            OVER (ORDER BY fl.tanggal ASC, fl.created_at ASC) as saldo_berjalan
    FROM filtered_ledger fl
    ORDER BY fl.tanggal DESC, fl.created_at DESC;
END;
$$$ LANGUAGE plpgsql SECURITY DEFINER;
