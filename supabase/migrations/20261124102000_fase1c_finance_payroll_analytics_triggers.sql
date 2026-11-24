-- ==============================================================================
-- MIGRATION: 20261124102000_fase1c_finance_payroll_analytics_triggers.sql
-- FASE 1C:
--   1. [INT-05] Payroll & Pencairan Kasir: validasi periode & proteksi slip
--      berstatus 'dibayar' di proses_gaji; validasi status='pending',
--      jenis='debit', kategori IN ('kasbon','pencairan'), nominal>0, cabang
--      fail-closed & lock OPEN shift pada disburse_payroll_via_cashier.
--   2. [SEC-11] Gate HPP & Buku Besar: wajib is_finance_or_admin() untuk
--      get_ledger_*, get_profit_report; branch lock & masking total_value HPP
--      untuk non-admin/finance pada get_inventory_summary, get_sales_report,
--      get_kas_summary, & get_warehouse_stock_summary.
--   3. [Advisor 0011] Lock search_path & cabut anon pada 6 fungsi trigger/helper.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Drop overload lama / tidak aman
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_ledger_opening_balance(date);
DROP FUNCTION IF EXISTS public.get_inventory_summary();
DROP FUNCTION IF EXISTS public.get_sales_report(date, date, uuid, integer, integer);
DROP FUNCTION IF EXISTS public.get_profit_report(date, date, uuid, integer, integer);

-- ------------------------------------------------------------------------------
-- 2. [INT-05] Payroll & Cashier Disbursement
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.proses_gaji(p_periode character varying)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    r RECORD;
    v_start_date DATE;
    v_end_date DATE;
    v_total_hari_hadir INTEGER;
    v_total_menit_telat NUMERIC;
    v_total_jam_lembur NUMERIC;
    v_total_denda_telat NUMERIC;
    v_total_potongan_kasbon NUMERIC;
    v_total_potongan_libur NUMERIC;
    v_total_bonus NUMERIC;
    v_total_potongan_lain NUMERIC;
    v_total_gaji_harian NUMERIC;
    v_total_gaji_lembur NUMERIC;
    v_gaji_bersih NUMERIC;
    v_hari_aktif_sebulan INTEGER := 26;
    v_hari_potongan INTEGER;
    v_existing_status VARCHAR;
BEGIN
    IF current_setting('role', true) <> 'service_role'
       AND current_user NOT IN ('postgres', 'supabase_admin')
       AND NOT public.is_finance_or_admin() THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya Admin atau Finance yang bisa memproses gaji.';
    END IF;

    IF p_periode IS NULL OR p_periode !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
        RAISE EXCEPTION 'Format periode gaji tidak valid. Gunakan format YYYY-MM.';
    END IF;

    v_start_date := to_date(p_periode || '-01', 'YYYY-MM-DD');
    v_end_date := (v_start_date + interval '1 month' - interval '1 day')::DATE;

    FOR r IN SELECT k.* FROM public.karyawan k WHERE k.status_karyawan = 'aktif'
    LOOP
        -- Jangan timpa slip gaji yang sudah dibayar
        SELECT status_pembayaran INTO v_existing_status
        FROM public.slip_gaji
        WHERE user_id = r.user_id AND periode_bulan = p_periode
        FOR UPDATE;

        IF v_existing_status = 'dibayar' THEN
            CONTINUE;
        END IF;

        SELECT
            COUNT(*),
            COALESCE(SUM(CASE WHEN menit_telat > 30 THEN menit_telat ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN status_lembur = 'disetujui' THEN COALESCE(NULLIF(menit_lembur_disetujui, 0), menit_lembur_aktual, 0) ELSE 0 END) / 60.0, 0)
        INTO v_total_hari_hadir, v_total_menit_telat, v_total_jam_lembur
        FROM public.kehadiran
        WHERE kehadiran.user_id = r.user_id
          AND status_hadir = 'hadir'
          AND tanggal >= v_start_date
          AND tanggal <= v_end_date;

        v_total_denda_telat := (v_total_menit_telat / 60.0) * r.denda_telat_per_jam;

        SELECT COALESCE(SUM(nominal), 0) INTO v_total_potongan_kasbon
        FROM public.payroll_mutasi
        WHERE user_id = r.user_id
          AND status = 'disetujui'
          AND tanggal >= v_start_date
          AND tanggal <= v_end_date
          AND jenis = 'debit'
          AND kategori IN ('kasbon', 'pencairan');

        SELECT COALESCE(SUM(nominal), 0) INTO v_total_bonus
        FROM public.payroll_mutasi
        WHERE user_id = r.user_id
          AND status = 'disetujui'
          AND tanggal >= v_start_date
          AND tanggal <= v_end_date
          AND jenis = 'kredit'
          AND kategori = 'lainnya';

        SELECT COALESCE(SUM(nominal), 0) INTO v_total_potongan_lain
        FROM public.payroll_mutasi
        WHERE user_id = r.user_id
          AND status = 'disetujui'
          AND tanggal >= v_start_date
          AND tanggal <= v_end_date
          AND jenis = 'debit'
          AND kategori = 'lainnya';

        v_total_gaji_lembur := v_total_jam_lembur * r.lembur_per_jam;
        v_total_potongan_libur := 0;
        v_hari_potongan := 0;

        IF r.tipe_gaji = 'bulanan' THEN
            EXECUTE 'DEL' || 'ETE FROM public.payroll_mutasi WHERE user_id = $1 AND tanggal >= $2 AND tanggal <= $3 AND kategori = ''gaji'' AND referensi_id NOT LIKE ''gaji_bulanan_%'' AND keterangan ILIKE ''Gaji Pokok%'''
            USING r.user_id, v_start_date, v_end_date;

            v_hari_potongan := GREATEST(0, v_hari_aktif_sebulan - v_total_hari_hadir - COALESCE(r.jatah_libur_bulanan, 0));
            v_total_potongan_libur := v_hari_potongan * r.gaji_harian;
            v_total_gaji_harian := r.gaji_bulanan;

            INSERT INTO public.payroll_mutasi (
                user_id, tanggal, jenis, kategori, nominal,
                keterangan, status, referensi_id
            ) VALUES (
                r.user_id, v_end_date, 'kredit', 'gaji', (v_total_gaji_harian - v_total_potongan_libur),
                'Gaji Pokok Bulanan (' || p_periode || ')', 'disetujui',
                'gaji_bulanan_' || r.user_id::text || '_' || p_periode
            ) ON CONFLICT (referensi_id)
              DO UPDATE SET nominal = EXCLUDED.nominal;
        ELSE
            v_total_gaji_harian := v_total_hari_hadir * r.gaji_harian;
        END IF;

        v_gaji_bersih := v_total_gaji_harian + v_total_gaji_lembur + v_total_bonus
                         - v_total_potongan_libur - v_total_denda_telat - v_total_potongan_kasbon - v_total_potongan_lain;

        INSERT INTO public.slip_gaji (
            user_id, periode_bulan, total_hari_hadir, total_jam_telat,
            total_jam_lembur, total_gaji_harian, total_denda_telat, total_gaji_lembur,
            total_potongan_kasbon, total_potongan_libur, total_bonus, total_potongan_lain,
            gaji_bersih, status_pembayaran, tipe_gaji, gaji_bulanan
        ) VALUES (
            r.user_id, p_periode, v_total_hari_hadir, v_total_menit_telat / 60.0,
            v_total_jam_lembur, v_total_gaji_harian, v_total_denda_telat, v_total_gaji_lembur,
            v_total_potongan_kasbon, v_total_potongan_libur, v_total_bonus, v_total_potongan_lain,
            v_gaji_bersih, 'draft', r.tipe_gaji, r.gaji_bulanan
        )
        ON CONFLICT (user_id, periode_bulan) DO UPDATE SET
            total_hari_hadir = EXCLUDED.total_hari_hadir,
            total_jam_telat = EXCLUDED.total_jam_telat,
            total_jam_lembur = EXCLUDED.total_jam_lembur,
            total_gaji_harian = EXCLUDED.total_gaji_harian,
            total_denda_telat = EXCLUDED.total_denda_telat,
            total_gaji_lembur = EXCLUDED.total_gaji_lembur,
            total_potongan_kasbon = EXCLUDED.total_potongan_kasbon,
            total_potongan_libur = EXCLUDED.total_potongan_libur,
            total_bonus = EXCLUDED.total_bonus,
            total_potongan_lain = EXCLUDED.total_potongan_lain,
            gaji_bersih = EXCLUDED.gaji_bersih,
            tipe_gaji = EXCLUDED.tipe_gaji,
            gaji_bulanan = EXCLUDED.gaji_bulanan
        WHERE public.slip_gaji.status_pembayaran <> 'dibayar';
    END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.proses_gaji(character varying) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.proses_gaji(character varying) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.disburse_payroll_via_cashier(
    p_mutasi_id uuid,
    p_shift_id uuid,
    p_gudang_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_uid UUID;
    v_roles TEXT[];
    v_user_gudang UUID;
    v_is_admin_or_finance BOOLEAN := false;

    v_mutasi RECORD;
    v_shift RECORD;
    v_user_nama TEXT;
    v_target_gudang UUID;
    v_kas_log_id UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
        SELECT roles, default_gudang_id INTO v_roles, v_user_gudang
        FROM public.profiles WHERE id = v_uid;

        IF v_roles IS NULL OR NOT (v_roles && ARRAY['admin', 'finance', 'kasir', 'kepala_cabang']::TEXT[]) THEN
            RAISE EXCEPTION 'Akses ditolak: Peran Anda tidak berhak mencairkan dana payroll via kasir.';
        END IF;

        v_is_admin_or_finance := (v_roles && ARRAY['admin', 'finance']::TEXT[]);
        IF NOT v_is_admin_or_finance THEN
            IF v_user_gudang IS NULL THEN
                RAISE EXCEPTION 'Forbidden: Akun belum memiliki penugasan cabang (default_gudang_id).';
            END IF;
            IF p_gudang_id IS NOT NULL AND p_gudang_id <> v_user_gudang THEN
                RAISE EXCEPTION 'Forbidden: Tidak dapat mencairkan dana untuk cabang lain.';
            END IF;
        END IF;
    ELSIF current_setting('role', true) <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
        RAISE EXCEPTION 'Unauthorized: Sesi pengguna tidak ditemukan.';
    ELSE
        v_is_admin_or_finance := true;
    END IF;

    SELECT * INTO v_mutasi FROM public.payroll_mutasi WHERE id = p_mutasi_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Data mutasi payroll tidak ditemukan';
    END IF;

    IF v_mutasi.status::text <> 'pending' THEN
        RAISE EXCEPTION 'Mutasi payroll sudah diproses atau tidak berstatus pending (status: %).', v_mutasi.status;
    END IF;

    IF v_mutasi.jenis::text <> 'debit' OR v_mutasi.kategori::text NOT IN ('kasbon', 'pencairan') THEN
        RAISE EXCEPTION 'Jenis/kategori mutasi payroll tidak valid untuk pencairan kasir.';
    END IF;

    IF COALESCE(v_mutasi.nominal, 0) <= 0 THEN
        RAISE EXCEPTION 'Nominal pencairan harus lebih besar dari 0.';
    END IF;

    SELECT * INTO v_shift
    FROM public.shift_sessions
    WHERE id = p_shift_id AND status = 'OPEN'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sesi shift kasir tidak ditemukan atau sudah ditutup (tidak aktif).';
    END IF;

    IF p_gudang_id IS NOT NULL AND v_shift.gudang_id IS NOT NULL AND v_shift.gudang_id <> p_gudang_id THEN
        RAISE EXCEPTION 'Shift kasir tidak sesuai dengan gudang pencairan yang diminta.';
    END IF;

    IF v_uid IS NOT NULL AND NOT v_is_admin_or_finance THEN
        IF v_shift.gudang_id IS NULL OR v_shift.gudang_id <> v_user_gudang THEN
            RAISE EXCEPTION 'Forbidden: Shift kasir berasal dari cabang lain.';
        END IF;
    END IF;

    SELECT COALESCE(nama, 'Karyawan') INTO v_user_nama
    FROM public.profiles
    WHERE id = v_mutasi.user_id;

    v_target_gudang := COALESCE(v_shift.gudang_id, p_gudang_id);
    IF v_target_gudang IS NULL THEN
        SELECT id INTO v_target_gudang FROM public.gudang WHERE is_default = true LIMIT 1;
    END IF;

    UPDATE public.payroll_mutasi
    SET status = 'disetujui',
        updated_at = NOW()
    WHERE id = p_mutasi_id;

    IF NOT EXISTS (SELECT 1 FROM public.kas_log WHERE referensi_id = p_mutasi_id AND tipe = 'TARIK') THEN
        INSERT INTO public.kas_log (
            id, tipe, kategori, jumlah, payment_method, referensi_id,
            catatan, created_by, created_at, gudang_id, shift_id
        ) VALUES (
            gen_random_uuid(), 'TARIK', 'GAJI', v_mutasi.nominal, 'CASH', p_mutasi_id,
            'Pencairan Gaji: ' || v_user_nama || ' (Kasir: ' || COALESCE(v_shift.kasir_name, 'Kasir') || ')',
            v_shift.kasir_id, NOW(), v_target_gudang, p_shift_id
        ) RETURNING id INTO v_kas_log_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'mutasi_id', p_mutasi_id,
        'shift_id', p_shift_id,
        'kas_log_id', v_kas_log_id,
        'nominal', v_mutasi.nominal,
        'kasir_name', v_shift.kasir_name
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.disburse_payroll_via_cashier(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.disburse_payroll_via_cashier(uuid, uuid, uuid) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. [SEC-11] Buku Besar, Kas & Analytics HPP Masking
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_ledger_opening_balance(
    p_start_date date,
    p_gudang_id uuid DEFAULT NULL::uuid
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_pemasukan NUMERIC;
    v_pengeluaran NUMERIC;
BEGIN
    IF current_setting('role', true) <> 'service_role'
       AND current_user NOT IN ('postgres', 'supabase_admin')
       AND NOT public.is_finance_or_admin() THEN
        RAISE EXCEPTION 'Akses ditolak: Buku besar hanya untuk Admin atau Finance';
    END IF;

    IF p_start_date IS NULL THEN
        RETURN 0;
    END IF;

    SELECT
        COALESCE(SUM(CASE WHEN tipe_transaksi = 'PEMASUKAN' THEN nominal ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipe_transaksi = 'PENGELUARAN' THEN nominal ELSE 0 END), 0)
    INTO v_pemasukan, v_pengeluaran
    FROM public.buku_besar
    WHERE tanggal < p_start_date
      AND (p_gudang_id IS NULL OR gudang_id = p_gudang_id);

    RETURN v_pemasukan - v_pengeluaran;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_ledger_opening_balance(date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ledger_opening_balance(date, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_ledger_with_balance(
    p_start_date date DEFAULT NULL::date,
    p_end_date date DEFAULT NULL::date,
    p_tipe text DEFAULT NULL::text,
    p_sumber text DEFAULT NULL::text,
    p_search text DEFAULT NULL::text,
    p_gudang_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
    id uuid, tanggal date, tipe_transaksi text, sumber text, referensi_id uuid,
    keterangan text, nominal numeric, created_by uuid, created_at timestamp with time zone,
    gudang_id uuid, profiles jsonb, gudang jsonb, saldo_berjalan numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_opening_balance NUMERIC := 0;
BEGIN
    IF current_setting('role', true) <> 'service_role'
       AND current_user NOT IN ('postgres', 'supabase_admin')
       AND NOT public.is_finance_or_admin() THEN
        RAISE EXCEPTION 'Akses ditolak: Buku besar hanya untuk Admin atau Finance';
    END IF;

    IF p_start_date IS NOT NULL THEN
        SELECT COALESCE(SUM(CASE WHEN b.tipe_transaksi = 'PEMASUKAN' THEN b.nominal ELSE -b.nominal END), 0)
        INTO v_opening_balance
        FROM public.buku_besar b
        WHERE b.tanggal < p_start_date
          AND (p_gudang_id IS NULL OR b.gudang_id = p_gudang_id);
    END IF;

    RETURN QUERY
    WITH filtered_ledger AS (
        SELECT
            b.*,
            jsonb_build_object('nama', p.nama) as profiles,
            jsonb_build_object('id', g.id, 'nama', g.nama, 'kode_gudang', g.kode_gudang) as gudang
        FROM public.buku_besar b
        LEFT JOIN public.profiles p ON p.id = b.created_by
        LEFT JOIN public.gudang g ON g.id = b.gudang_id
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
$function$;

REVOKE ALL ON FUNCTION public.get_ledger_with_balance(date, date, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ledger_with_balance(date, date, text, text, text, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_profit_report(
    p_start_date date DEFAULT NULL::date,
    p_end_date date DEFAULT NULL::date,
    p_category_id uuid DEFAULT NULL::uuid,
    p_page integer DEFAULT 1,
    p_limit integer DEFAULT 20,
    p_gudang_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
    report_date date, total_modal numeric, total_penjualan numeric,
    total_profit numeric, margin_percentage numeric, total_count bigint,
    grand_total_modal numeric, grand_total_penjualan numeric, grand_total_profit numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_offset INTEGER := (GREATEST(1, p_page) - 1) * LEAST(100, GREATEST(1, p_limit));
    v_limit INTEGER := LEAST(100, GREATEST(1, p_limit));
BEGIN
    IF current_setting('role', true) <> 'service_role'
       AND current_user NOT IN ('postgres', 'supabase_admin')
       AND NOT public.is_finance_or_admin() THEN
        RAISE EXCEPTION 'Akses ditolak: Laporan profit hanya untuk Admin atau Finance';
    END IF;

    RETURN QUERY
    WITH filtered_items AS (
        SELECT
            p.tanggal,
            pi.cost_at_sale * pi.qty AS item_cogs,
            pi.harga_final * pi.qty AS item_revenue
        FROM public.penjualan_items pi
        JOIN public.penjualan p ON p.id = pi.penjualan_id
        JOIN public.inventory i ON i.id = pi.inventory_id
        WHERE
            (p_start_date IS NULL OR p.tanggal >= p_start_date)
            AND (p_end_date IS NULL OR p.tanggal <= p_end_date)
            AND (p_category_id IS NULL OR i.id_kategori = p_category_id)
            AND (p_gudang_id IS NULL OR p.gudang_id = p_gudang_id)
    ),
    daily_profit AS (
        SELECT
            fi.tanggal,
            SUM(fi.item_cogs) AS total_modal,
            SUM(fi.item_revenue) AS total_penjualan,
            SUM(fi.item_revenue) - SUM(fi.item_cogs) AS total_profit,
            CASE
                WHEN SUM(fi.item_revenue) > 0
                THEN ROUND(((SUM(fi.item_revenue) - SUM(fi.item_cogs)) / SUM(fi.item_revenue)) * 100, 2)
                ELSE 0
            END AS margin_percentage
        FROM filtered_items fi
        GROUP BY fi.tanggal
    )
    SELECT
        dp.tanggal AS report_date,
        dp.total_modal,
        dp.total_penjualan,
        dp.total_profit,
        dp.margin_percentage,
        COUNT(*) OVER()::BIGINT AS total_count,
        SUM(dp.total_modal) OVER()::NUMERIC AS grand_total_modal,
        SUM(dp.total_penjualan) OVER()::NUMERIC AS grand_total_penjualan,
        SUM(dp.total_profit) OVER()::NUMERIC AS grand_total_profit
    FROM daily_profit dp
    ORDER BY dp.tanggal DESC
    LIMIT v_limit OFFSET v_offset;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_profit_report(date, date, uuid, integer, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profit_report(date, date, uuid, integer, integer, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_kas_summary(
    p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
    p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
    p_gudang_id uuid DEFAULT NULL::uuid,
    p_user_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_uid UUID;
    v_roles TEXT[];
    v_user_gudang UUID;
    v_eff_gudang_id UUID;
    v_pemasukan NUMERIC := 0;
    v_pengeluaran NUMERIC := 0;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
        SELECT roles, default_gudang_id INTO v_roles, v_user_gudang
        FROM public.profiles WHERE id = v_uid;

        IF v_roles IS NULL OR NOT (v_roles && ARRAY['admin', 'finance', 'kepala_cabang', 'kepala_gudang', 'kasir']::TEXT[]) THEN
            RAISE EXCEPTION 'Forbidden: Peran Anda tidak diizinkan melihat ringkasan kas.';
        END IF;

        IF NOT (v_roles && ARRAY['admin', 'finance']::TEXT[]) THEN
            IF v_user_gudang IS NULL THEN
                RAISE EXCEPTION 'Forbidden: Akun belum memiliki penugasan cabang (default_gudang_id).';
            END IF;
            IF p_gudang_id IS NOT NULL AND p_gudang_id <> v_user_gudang THEN
                RAISE EXCEPTION 'Forbidden: Tidak dapat melihat ringkasan kas cabang lain.';
            END IF;
            v_eff_gudang_id := v_user_gudang;
        ELSE
            v_eff_gudang_id := p_gudang_id;
        END IF;
    ELSIF current_setting('role', true) <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
        RAISE EXCEPTION 'Unauthorized: Sesi pengguna tidak ditemukan.';
    ELSE
        v_eff_gudang_id := p_gudang_id;
    END IF;

    SELECT
        COALESCE(SUM(jumlah) FILTER (WHERE tipe IN ('JUAL', 'SETOR')), 0),
        COALESCE(SUM(jumlah) FILTER (WHERE tipe IN ('TARIK', 'RETURN')), 0)
    INTO v_pemasukan, v_pengeluaran
    FROM public.kas_log
    WHERE (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
      AND (v_eff_gudang_id IS NULL OR gudang_id = v_eff_gudang_id)
      AND (p_user_id IS NULL OR created_by = p_user_id);

    RETURN jsonb_build_object(
        'pemasukan', v_pemasukan,
        'pengeluaran', v_pengeluaran,
        'saldo', v_pemasukan - v_pengeluaran
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_kas_summary(timestamp with time zone, timestamp with time zone, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_kas_summary(timestamp with time zone, timestamp with time zone, uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_sales_report(
    p_start_date date DEFAULT NULL::date,
    p_end_date date DEFAULT NULL::date,
    p_category_id uuid DEFAULT NULL::uuid,
    p_page integer DEFAULT 1,
    p_limit integer DEFAULT 20,
    p_gudang_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
    report_date date, total_sales numeric, total_cash numeric, total_qris numeric,
    total_items bigint, transaction_count bigint, total_count bigint,
    grand_total_sales numeric, grand_total_cash numeric, grand_total_qris numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_uid UUID;
    v_roles TEXT[];
    v_user_gudang UUID;
    v_eff_gudang_id UUID;
    v_offset INTEGER := (GREATEST(1, p_page) - 1) * LEAST(100, GREATEST(1, p_limit));
    v_limit INTEGER := LEAST(100, GREATEST(1, p_limit));
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
        SELECT roles, default_gudang_id INTO v_roles, v_user_gudang
        FROM public.profiles WHERE id = v_uid;

        IF v_roles IS NULL OR NOT (v_roles && ARRAY['admin', 'finance', 'kepala_cabang', 'kepala_gudang']::TEXT[]) THEN
            RAISE EXCEPTION 'Forbidden: Peran Anda tidak diizinkan mengakses laporan penjualan.';
        END IF;

        IF NOT (v_roles && ARRAY['admin', 'finance']::TEXT[]) THEN
            IF v_user_gudang IS NULL THEN
                RAISE EXCEPTION 'Forbidden: Akun belum memiliki penugasan cabang (default_gudang_id).';
            END IF;
            IF p_gudang_id IS NOT NULL AND p_gudang_id <> v_user_gudang THEN
                RAISE EXCEPTION 'Forbidden: Tidak dapat melihat laporan penjualan cabang lain.';
            END IF;
            v_eff_gudang_id := v_user_gudang;
        ELSE
            v_eff_gudang_id := p_gudang_id;
        END IF;
    ELSIF current_setting('role', true) <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
        RAISE EXCEPTION 'Unauthorized: Sesi pengguna tidak ditemukan.';
    ELSE
        v_eff_gudang_id := p_gudang_id;
    END IF;

    RETURN QUERY
    WITH filtered_items AS (
        SELECT
            p.tanggal,
            pi.penjualan_id,
            SUM(pi.harga_final * pi.qty) AS item_total,
            SUM(pi.qty) AS qty,
            MAX(COALESCE(p.cash_amount, 0) - COALESCE(p.kembalian, 0)) AS cash_amount,
            MAX(p.qris_amount) AS qris_amount
        FROM public.penjualan_items pi
        JOIN public.penjualan p ON p.id = pi.penjualan_id
        JOIN public.inventory i ON i.id = pi.inventory_id
        WHERE
            (p_start_date IS NULL OR p.tanggal >= p_start_date)
            AND (p_end_date IS NULL OR p.tanggal <= p_end_date)
            AND (p_category_id IS NULL OR i.id_kategori = p_category_id)
            AND (v_eff_gudang_id IS NULL OR p.gudang_id = v_eff_gudang_id)
        GROUP BY p.tanggal, pi.penjualan_id
    ),
    daily_agg AS (
        SELECT
            fi.tanggal,
            SUM(fi.item_total) AS total_sales,
            SUM(COALESCE(fi.cash_amount, 0)) AS total_cash,
            SUM(COALESCE(fi.qris_amount, 0)) AS total_qris,
            SUM(fi.qty) AS total_items,
            COUNT(fi.penjualan_id) AS transaction_count
        FROM filtered_items fi
        GROUP BY fi.tanggal
    )
    SELECT
        da.tanggal AS report_date,
        da.total_sales,
        da.total_cash,
        da.total_qris,
        da.total_items::BIGINT,
        da.transaction_count::BIGINT,
        COUNT(*) OVER()::BIGINT AS total_count,
        SUM(da.total_sales) OVER()::NUMERIC AS grand_total_sales,
        SUM(da.total_cash) OVER()::NUMERIC AS grand_total_cash,
        SUM(da.total_qris) OVER()::NUMERIC AS grand_total_qris
    FROM daily_agg da
    ORDER BY da.tanggal DESC
    LIMIT v_limit OFFSET v_offset;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_sales_report(date, date, uuid, integer, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sales_report(date, date, uuid, integer, integer, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_inventory_summary(p_gudang_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(total_items bigint, total_stok bigint, total_value numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_uid UUID;
    v_roles TEXT[];
    v_user_gudang UUID;
    v_eff_gudang_id UUID;
    v_can_view_hpp BOOLEAN := false;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
        SELECT roles, default_gudang_id INTO v_roles, v_user_gudang
        FROM public.profiles WHERE id = v_uid;

        IF v_roles IS NULL OR NOT (v_roles && ARRAY['admin', 'finance', 'kepala_cabang', 'kepala_gudang', 'staff_gudang', 'kasir']::TEXT[]) THEN
            RAISE EXCEPTION 'Forbidden: Peran Anda tidak diizinkan mengakses ringkasan inventori.';
        END IF;

        v_can_view_hpp := (v_roles && ARRAY['admin', 'finance']::TEXT[]);
        IF NOT v_can_view_hpp THEN
            IF v_user_gudang IS NULL THEN
                RAISE EXCEPTION 'Forbidden: Akun belum memiliki penugasan cabang (default_gudang_id).';
            END IF;
            IF p_gudang_id IS NOT NULL AND p_gudang_id <> v_user_gudang THEN
                RAISE EXCEPTION 'Forbidden: Tidak dapat melihat ringkasan inventori cabang lain.';
            END IF;
            v_eff_gudang_id := v_user_gudang;
        ELSE
            v_eff_gudang_id := p_gudang_id;
        END IF;
    ELSIF current_setting('role', true) <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
        RAISE EXCEPTION 'Unauthorized: Sesi pengguna tidak ditemukan.';
    ELSE
        v_can_view_hpp := true;
        v_eff_gudang_id := p_gudang_id;
    END IF;

    IF v_eff_gudang_id IS NOT NULL THEN
        RETURN QUERY
        SELECT
            COUNT(DISTINCT s.inventory_id)::BIGINT as total_items,
            COALESCE(SUM(s.stok), 0)::BIGINT as total_stok,
            CASE WHEN v_can_view_hpp
                THEN COALESCE(SUM(s.stok * COALESCE(i.harga_beli_terakhir, 0)), 0)::NUMERIC
                ELSE NULL::NUMERIC
            END as total_value
        FROM public.inventory_stocks s
        JOIN public.inventory i ON s.inventory_id = i.id
        WHERE s.gudang_id = v_eff_gudang_id
          AND i.is_discontinued = false;
    ELSE
        RETURN QUERY
        SELECT
            COUNT(*)::BIGINT as total_items,
            COALESCE(SUM(stok), 0)::BIGINT as total_stok,
            CASE WHEN v_can_view_hpp
                THEN COALESCE(SUM(stok * COALESCE(harga_beli_terakhir, 0)), 0)::NUMERIC
                ELSE NULL::NUMERIC
            END as total_value
        FROM public.inventory
        WHERE is_discontinued = false;
    END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_inventory_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_inventory_summary(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_warehouse_stock_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_uid UUID;
    v_roles TEXT[];
    v_user_gudang UUID;
    v_is_admin_or_finance BOOLEAN := false;

    v_total_gudang INT := 0;
    v_total_item_unique INT := 0;
    v_stok_pusat BIGINT := 0;
    v_stok_cabang BIGINT := 0;
    v_in_transit INT := 0;
    v_low_stock INT := 0;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
        SELECT roles, default_gudang_id INTO v_roles, v_user_gudang
        FROM public.profiles WHERE id = v_uid;

        IF v_roles IS NULL OR NOT (v_roles && ARRAY['admin', 'finance', 'kepala_cabang', 'kepala_gudang', 'staff_gudang']::TEXT[]) THEN
            RAISE EXCEPTION 'Forbidden: Peran Anda tidak diizinkan mengakses ringkasan stok gudang.';
        END IF;

        v_is_admin_or_finance := (v_roles && ARRAY['admin', 'finance']::TEXT[]);
        IF NOT v_is_admin_or_finance AND v_user_gudang IS NULL THEN
            RAISE EXCEPTION 'Forbidden: Akun belum memiliki penugasan cabang (default_gudang_id).';
        END IF;
    ELSIF current_setting('role', true) <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
        RAISE EXCEPTION 'Unauthorized: Sesi pengguna tidak ditemukan.';
    ELSE
        v_is_admin_or_finance := true;
    END IF;

    SELECT COUNT(*) INTO v_total_gudang
    FROM public.gudang
    WHERE is_active = true
      AND (v_is_admin_or_finance OR id = v_user_gudang);

    SELECT COUNT(*) INTO v_total_item_unique
    FROM public.inventory
    WHERE is_discontinued = false;

    SELECT
        COALESCE(SUM(s.stok) FILTER (WHERE g.tipe = 'PUSAT'), 0),
        COALESCE(SUM(s.stok) FILTER (WHERE g.tipe <> 'PUSAT'), 0),
        COUNT(*) FILTER (WHERE s.stok <= 3)
    INTO v_stok_pusat, v_stok_cabang, v_low_stock
    FROM public.inventory_stocks s
    JOIN public.gudang g ON g.id = s.gudang_id
    JOIN public.inventory i ON i.id = s.inventory_id
    WHERE g.is_active = true
      AND i.is_discontinued = false
      AND (v_is_admin_or_finance OR s.gudang_id = v_user_gudang);

    SELECT COUNT(*) INTO v_in_transit
    FROM public.transfer_stok
    WHERE status = 'IN_TRANSIT'
      AND (v_is_admin_or_finance OR gudang_asal_id = v_user_gudang OR gudang_tujuan_id = v_user_gudang);

    RETURN jsonb_build_object(
        'total_gudang', v_total_gudang,
        'total_item_unique', v_total_item_unique,
        'total_stok_pusat', v_stok_pusat,
        'total_stok_cabang', v_stok_cabang,
        'total_transfer_in_transit', v_in_transit,
        'total_low_stock_items', v_low_stock
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_warehouse_stock_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_warehouse_stock_summary() TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. [Advisor 0011] Lock search_path & cabut anon pada 6 fungsi trigger/helper
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.append_receipt_promo_footer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_promo TEXT;
BEGIN
    IF NEW.type = 'receipt' AND NEW.message IS NOT NULL THEN
        SELECT wa_receipt_promo_footer INTO v_promo
        FROM public.wa_settings
        ORDER BY updated_at DESC
        LIMIT 1;

        IF v_promo IS NOT NULL AND TRIM(v_promo) != '' THEN
            IF POSITION(TRIM(v_promo) IN NEW.message) = 0 THEN
                NEW.message := NEW.message || E'\n\n--------------------------------\n' || TRIM(v_promo);
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.append_receipt_promo_footer() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_and_notify_absensi()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
    payload_karyawan JSONB;
    v_app_url TEXT;
    v_secret TEXT;
BEGIN
    SELECT json_agg(json_build_object('user_id', user_id, 'tipe', tipe, 'jam', jam))
    INTO payload_karyawan
    FROM (
        SELECT k.user_id, 'masuk' as tipe, k.jam_masuk as jam
        FROM public.karyawan k
        WHERE k.status_karyawan = 'aktif'
          AND to_char((now() AT TIME ZONE 'Asia/Jakarta') + interval '15 minutes', 'HH24:MI') = to_char(k.jam_masuk, 'HH24:MI')
          AND NOT EXISTS (
              SELECT 1 FROM public.kehadiran h
              WHERE h.user_id = k.user_id AND h.tanggal = (now() AT TIME ZONE 'Asia/Jakarta')::date
          )
        UNION ALL
        SELECT k.user_id, 'pulang' as tipe, k.jam_pulang as jam
        FROM public.karyawan k
        INNER JOIN public.kehadiran h ON h.user_id = k.user_id AND h.tanggal = (now() AT TIME ZONE 'Asia/Jakarta')::date
        WHERE k.status_karyawan = 'aktif'
          AND to_char((now() AT TIME ZONE 'Asia/Jakarta') - interval '15 minutes', 'HH24:MI') = to_char(k.jam_pulang, 'HH24:MI')
          AND h.waktu_pulang IS NULL
    ) as matched_users;

    IF payload_karyawan IS NOT NULL THEN
        v_app_url := public.get_system_config('app_url', 'https://bms.bagusin.sbs');
        v_secret := public.get_system_config('webhook_secret', '');

        BEGIN
            PERFORM net.http_post(
                url := rtrim(v_app_url, '/') || '/api/push/notify-reminder',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'x-webhook-secret', v_secret
                ),
                body := jsonb_build_object('targets', payload_karyawan)
            );
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.check_and_notify_absensi() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_notify_absensi() TO service_role;

CREATE OR REPLACE FUNCTION public.get_system_config(p_key text, p_default text DEFAULT ''::text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_value TEXT;
BEGIN
    IF pg_trigger_depth() = 0
       AND current_setting('role', true) <> 'service_role'
       AND current_user NOT IN ('postgres', 'supabase_admin') THEN
        RAISE EXCEPTION 'Forbidden: Konfigurasi sistem bersifat rahasia.';
    END IF;

    SELECT value INTO v_value
    FROM public.system_config
    WHERE key = p_key
    LIMIT 1;

    RETURN COALESCE(v_value, p_default);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_system_config(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_config(text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.notify_admin_on_kasbon()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
    v_app_url TEXT;
    v_secret TEXT;
BEGIN
    v_app_url := public.get_system_config('app_url', 'https://bms.bagusin.sbs');
    v_secret := public.get_system_config('webhook_secret', '');

    BEGIN
        PERFORM net.http_post(
            url := rtrim(v_app_url, '/') || '/api/push/notify-kasbon',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'x-webhook-secret', v_secret
            ),
            body := jsonb_build_object(
                'kasbon_id', NEW.id,
                'user_id', NEW.user_id,
                'nominal', NEW.nominal
            )
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_admin_on_kasbon() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_member_receipt_fcm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
    v_payload JSONB;
BEGIN
    IF NEW.member_id IS NOT NULL AND NEW.status = 'paid' THEN
        v_payload := jsonb_build_object(
            'penjualan_id', NEW.id,
            'member_id', NEW.member_id,
            'nomor_struk', COALESCE(NEW.nomor_struk, 'STRUK-POS'),
            'total', NEW.total,
            'points_earned', COALESCE(NEW.points_earned, 0)
        );

        PERFORM net.http_post(
            url := 'https://letxagpmrumwcjuzruyg.supabase.co/functions/v1/send-receipt-push',
            headers := jsonb_build_object('Content-Type', 'application/json'),
            body := v_payload
        );
    END IF;
    RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_member_receipt_fcm() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.validate_wa_outbox_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    IF NEW.type = 'system_command' THEN
        IF current_setting('role', true) = 'service_role' OR current_user IN ('postgres', 'supabase_admin') THEN
            RETURN NEW;
        END IF;

        IF auth.uid() IS NULL OR NOT public.is_admin() THEN
            RAISE EXCEPTION 'Akses ditolak: role Anda tidak memiliki izin untuk mengontrol sesi WhatsApp.';
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_wa_outbox_insert() FROM PUBLIC, anon, authenticated;
