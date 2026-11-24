-- ==============================================================================
-- MIGRATION: 20261124100000_fase1a_pos_return_loyalty_integrity.sql
-- FASE 1A:
--   1. [INT-01] Hardening pay_transaction (19-arg + p_pos_auth_id), drop overload
--      17-arg & 18-arg, validasi role/cabang fail-closed, qty > 0, strict
--      inventory_stocks check, server-side harga/promo/tier/poin (tanpa
--      double-count trigger_update_member_points), & anti-replay pos_authorizations.
--   2. [INT-01] Hardening public.pay_penjualan (auth, role, branch, REVOKE anon).
--   3. [INT-02] Hardening create_penjualan_return (drop 7-arg, 8-arg FOR UPDATE
--      pada penjualan & penjualan_items, harga/cost langsung dari penjualan_items)
--      & penjualan_return_create.
--   4. [INT-04] Hardening Loyalty Kawan Bagus: cabut anon pada
--      redeem_member_reward_atomic, CSPRNG gen_random_bytes(), rate-limit
--      request_member_otp, & FOR UPDATE row lock pada verify_member_otp.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. Tambah kolom tracking anti-replay pada pos_authorizations
-- ------------------------------------------------------------------------------
ALTER TABLE public.pos_authorizations
    ADD COLUMN IF NOT EXISTS consumed_by_penjualan_id UUID;

-- ------------------------------------------------------------------------------
-- 1. Drop overload lama pay_transaction & create_penjualan_return
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.pay_transaction(
    uuid, jsonb, text, numeric, numeric, numeric, numeric, text, uuid,
    timestamp with time zone, uuid, numeric, numeric, numeric, boolean, uuid, uuid
);

DROP FUNCTION IF EXISTS public.pay_transaction(
    uuid, jsonb, text, numeric, numeric, numeric, numeric, text, uuid,
    timestamp with time zone, uuid, numeric, numeric, numeric, boolean, uuid, uuid, text
);

DROP FUNCTION IF EXISTS public.create_penjualan_return(
    uuid, date, text, uuid, jsonb, uuid, uuid
);

-- ------------------------------------------------------------------------------
-- 2. [INT-01] Hardening public.pay_transaction (19-argumen)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pay_transaction(
    p_idempotency_key uuid,
    p_items jsonb,
    p_payment_method text,
    p_cash_amount numeric,
    p_qris_amount numeric,
    p_diskon_nominal numeric,
    p_diskon_persen numeric,
    p_catatan text,
    p_created_by uuid,
    p_created_at timestamp with time zone DEFAULT now(),
    p_member_id uuid DEFAULT NULL::uuid,
    p_points_earned numeric DEFAULT 0,
    p_points_redeemed numeric DEFAULT 0,
    p_discount_member_amount numeric DEFAULT 0,
    p_receipt_sent_via_wa boolean DEFAULT false,
    p_gudang_id uuid DEFAULT NULL::uuid,
    p_shift_id uuid DEFAULT NULL::uuid,
    p_nomor_struk text DEFAULT NULL::text,
    p_pos_auth_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_uid UUID;
    v_actor UUID;
    v_roles TEXT[];
    v_user_gudang UUID;
    v_is_admin BOOLEAN := false;
    v_is_supervisor BOOLEAN := false;
    v_pos_auth RECORD;
    v_pos_auth_valid BOOLEAN := false;

    v_penjualan_id UUID;
    v_existing UUID;
    v_gudang_id UUID;
    v_shift_id UUID;
    v_tx_time TIMESTAMPTZ;

    v_item JSONB;
    v_inventory RECORD;
    v_qty INT;
    v_current_stock INT;

    v_promo_diskon NUMERIC;
    v_server_harga_jual NUMERIC;
    v_server_diskon NUMERIC;
    v_payload_harga_jual NUMERIC;
    v_payload_diskon NUMERIC;
    v_eff_harga_jual NUMERIC;
    v_eff_diskon NUMERIC;
    v_eff_harga_final NUMERIC;
    v_has_manual_item_override BOOLEAN := false;

    v_subtotal NUMERIC := 0;
    v_diskon_nominal NUMERIC := 0;
    v_diskon_persen NUMERIC := 0;
    v_global_discount_total NUMERIC := 0;

    v_member RECORD;
    v_tier RECORD;
    v_loyalty RECORD;
    v_tier_discount_pct NUMERIC := 0;
    v_discount_member_amount NUMERIC := 0;
    v_points_redeemed NUMERIC := 0;
    v_point_to_idr NUMERIC := 1.0;
    v_dow INT;
    v_multiplier NUMERIC := 1.0;
    v_points_earned NUMERIC := 0;

    v_total NUMERIC := 0;
    v_pay_cash NUMERIC := COALESCE(p_cash_amount, 0);
    v_pay_qris NUMERIC := COALESCE(p_qris_amount, 0);
    v_kembalian NUMERIC := 0;
    v_net_cash NUMERIC := 0;
BEGIN
    v_uid := auth.uid();

    IF p_created_by = '00000000-0000-0000-0000-000000000000'::UUID THEN
        p_created_by := NULL;
    END IF;

    IF v_uid IS NOT NULL THEN
        SELECT roles, default_gudang_id
        INTO v_roles, v_user_gudang
        FROM public.profiles
        WHERE id = v_uid;

        IF v_roles IS NULL OR NOT (v_roles && ARRAY['admin', 'kasir', 'kepala_cabang', 'kepala_gudang']::TEXT[]) THEN
            RAISE EXCEPTION 'Forbidden: Peran Anda tidak diizinkan memproses transaksi POS.';
        END IF;

        v_is_admin := ('admin' = ANY(v_roles));
        v_is_supervisor := (v_roles && ARRAY['admin', 'kepala_cabang', 'kepala_gudang']::TEXT[]);
        v_actor := v_uid;

        -- Fail-closed branch isolation untuk non-admin
        IF NOT v_is_admin THEN
            IF v_user_gudang IS NULL THEN
                RAISE EXCEPTION 'Forbidden: Akun kasir belum memiliki penugasan cabang (default_gudang_id).';
            END IF;
            IF p_gudang_id IS NOT NULL AND p_gudang_id <> v_user_gudang THEN
                RAISE EXCEPTION 'Forbidden: Tidak dapat memproses transaksi untuk cabang lain.';
            END IF;
            v_gudang_id := v_user_gudang;
        ELSE
            v_gudang_id := p_gudang_id;
        END IF;
    ELSE
        -- Hanya service_role/postgres yang boleh tanpa auth.uid()
        IF current_setting('role', true) <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
            RAISE EXCEPTION 'Unauthorized: Sesi pengguna tidak ditemukan.';
        END IF;
        v_is_admin := true;
        v_is_supervisor := true;
        v_actor := p_created_by;
        v_gudang_id := p_gudang_id;
    END IF;

    v_tx_time := COALESCE(p_created_at, NOW());

    IF v_gudang_id IS NULL THEN
        SELECT id INTO v_gudang_id FROM public.gudang WHERE is_default = true LIMIT 1;
        IF v_gudang_id IS NULL THEN
            SELECT id INTO v_gudang_id FROM public.gudang ORDER BY created_at ASC LIMIT 1;
        END IF;
    END IF;

    -- Idempotency check SEBELUM klaim pos_auth_id
    SELECT id INTO v_existing
    FROM public.penjualan
    WHERE idempotency_key = p_idempotency_key AND status = 'paid';

    IF v_existing IS NOT NULL THEN
        IF p_nomor_struk IS NOT NULL THEN
            UPDATE public.penjualan
            SET nomor_struk = COALESCE(nomor_struk, p_nomor_struk)
            WHERE id = v_existing;
        END IF;
        RETURN v_existing;
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Keranjang transaksi tidak boleh kosong.';
    END IF;

    IF v_pay_cash < 0 OR v_pay_qris < 0 THEN
        RAISE EXCEPTION 'Nominal pembayaran tidak boleh negatif.';
    END IF;

    -- Validasi p_pos_auth_id jika disediakan
    IF p_pos_auth_id IS NOT NULL THEN
        SELECT * INTO v_pos_auth
        FROM public.pos_authorizations
        WHERE id = p_pos_auth_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Otorisasi POS tidak ditemukan.';
        END IF;

        IF v_pos_auth.status <> 'used' THEN
            RAISE EXCEPTION 'Otorisasi POS belum diverifikasi atau sudah tidak berlaku (status: %).', v_pos_auth.status;
        END IF;

        IF v_pos_auth.consumed_by_penjualan_id IS NOT NULL THEN
            RAISE EXCEPTION 'Otorisasi POS sudah digunakan pada transaksi lain.';
        END IF;

        IF v_uid IS NOT NULL AND v_pos_auth.cashier_id <> v_actor THEN
            RAISE EXCEPTION 'Otorisasi POS bukan milik kasir yang aktif.';
        END IF;

        IF v_pos_auth.gudang_id IS NOT NULL AND v_gudang_id IS NOT NULL AND v_pos_auth.gudang_id <> v_gudang_id THEN
            RAISE EXCEPTION 'Otorisasi POS tidak berlaku untuk cabang ini.';
        END IF;

        IF v_pos_auth.action_type NOT IN ('price_override', 'manual_discount') THEN
            RAISE EXCEPTION 'Tipe otorisasi POS (%) tidak valid untuk transaksi/diskon.', v_pos_auth.action_type;
        END IF;

        IF COALESCE(v_pos_auth.used_at, v_pos_auth.created_at) < (v_tx_time - interval '30 minutes') THEN
            RAISE EXCEPTION 'Otorisasi POS sudah kedaluwarsa untuk waktu transaksi ini.';
        END IF;

        v_pos_auth_valid := true;
    END IF;

    -- Validasi global diskon keranjang
    v_diskon_nominal := COALESCE(p_diskon_nominal, 0);
    v_diskon_persen := COALESCE(p_diskon_persen, 0);

    IF v_diskon_nominal < 0 OR v_diskon_persen < 0 OR v_diskon_persen > 100 THEN
        RAISE EXCEPTION 'Nilai diskon global tidak valid.';
    END IF;

    IF (v_diskon_nominal > 0 OR v_diskon_persen > 0) AND NOT v_is_supervisor AND NOT v_pos_auth_valid THEN
        RAISE EXCEPTION 'Otorisasi supervisor (p_pos_auth_id) diperlukan untuk menerapkan diskon manual.';
    END IF;

    -- Resolve shift_id aman terhadap FK & cabang
    v_shift_id := p_shift_id;
    IF v_shift_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.shift_sessions WHERE id = v_shift_id) THEN
            IF v_actor IS NOT NULL THEN
                INSERT INTO public.shift_sessions (
                    id, kasir_id, kasir_name, gudang_id, start_time, opening_cash, status, created_at
                ) VALUES (
                    v_shift_id,
                    v_actor,
                    COALESCE((SELECT nama FROM public.profiles WHERE id = v_actor), 'Kasir'),
                    v_gudang_id,
                    v_tx_time,
                    0,
                    'OPEN',
                    v_tx_time
                ) ON CONFLICT (id) DO NOTHING;
            ELSE
                v_shift_id := NULL;
            END IF;
        END IF;

        IF v_shift_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.shift_sessions WHERE id = v_shift_id) THEN
            v_shift_id := NULL;
        END IF;
    END IF;

    v_penjualan_id := p_idempotency_key;

    INSERT INTO public.penjualan (
        id, total, status, paid_at, tanggal, payment_method,
        diskon_nominal, diskon_persen, subtotal_sebelum_diskon,
        cash_amount, qris_amount, kembalian, created_by,
        idempotency_key, created_at, member_id, points_earned,
        points_redeemed, discount_member_amount, receipt_sent_via_wa,
        gudang_id, shift_id, nomor_struk
    )
    VALUES (
        v_penjualan_id, 0, 'paid', v_tx_time, (v_tx_time AT TIME ZONE 'Asia/Jakarta')::DATE, p_payment_method,
        v_diskon_nominal, v_diskon_persen, 0,
        v_pay_cash, v_pay_qris, 0, v_actor,
        p_idempotency_key, v_tx_time, p_member_id, 0,
        0, 0, COALESCE(p_receipt_sent_via_wa, false),
        v_gudang_id, v_shift_id, p_nomor_struk
    );

    -- Loop item: validasi qty > 0, lock inventory & inventory_stocks, hitung harga/promo server
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_qty := (v_item->>'qty')::INT;
        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'Kuantitas barang harus lebih dari 0.';
        END IF;

        SELECT * INTO v_inventory
        FROM public.inventory
        WHERE id = (v_item->>'inventory_id')::UUID
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Barang tidak ditemukan: %', (v_item->>'inventory_id')::UUID;
        END IF;

        IF v_gudang_id IS NOT NULL THEN
            SELECT stok INTO v_current_stock
            FROM public.inventory_stocks
            WHERE inventory_id = v_inventory.id AND gudang_id = v_gudang_id
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Stok cabang belum diinisialisasi untuk % pada gudang ini.', v_inventory.nama_barang;
            END IF;

            IF v_current_stock < v_qty THEN
                RAISE EXCEPTION 'Stok di gudang tidak cukup untuk % (Stok Gudang: %, Diminta: %)',
                    v_inventory.nama_barang, v_current_stock, v_qty;
            END IF;

            UPDATE public.inventory_stocks
            SET stok = stok - v_qty,
                updated_at = NOW()
            WHERE inventory_id = v_inventory.id AND gudang_id = v_gudang_id;
        ELSE
            IF COALESCE(v_inventory.stok, 0) < v_qty THEN
                RAISE EXCEPTION 'Stok tidak cukup untuk % (Stok: %, Diminta: %)',
                    v_inventory.nama_barang, COALESCE(v_inventory.stok, 0), v_qty;
            END IF;

            UPDATE public.inventory
            SET stok = stok - v_qty,
                updated_at = NOW()
            WHERE id = v_inventory.id;
        END IF;

        -- Hitung harga & promosi aktif di server
        SELECT COALESCE(MAX(pi.diskon_nominal), 0)
        INTO v_promo_diskon
        FROM public.promosi_items pi
        JOIN public.promosi pr ON pr.id = pi.promosi_id
        WHERE pi.inventory_id = v_inventory.id
          AND LOWER(pr.status) IN ('active', 'aktif')
          AND pr.tanggal_mulai <= v_tx_time
          AND pr.tanggal_selesai >= v_tx_time
          AND (NOT COALESCE(pr.is_member_only, false) OR p_member_id IS NOT NULL);

        v_server_harga_jual := GREATEST(COALESCE(v_inventory.harga_jual, 0), 0);
        v_server_diskon := CASE
            WHEN COALESCE(v_promo_diskon, 0) > 0 THEN LEAST(v_server_harga_jual, v_promo_diskon)
            ELSE LEAST(v_server_harga_jual, GREATEST(COALESCE(v_inventory.diskon, 0), 0))
        END;

        v_payload_harga_jual := NULLIF(v_item->>'harga_jual', '')::NUMERIC;
        v_payload_diskon := COALESCE(NULLIF(v_item->>'diskon', '')::NUMERIC, 0);

        v_has_manual_item_override := (
            (v_payload_harga_jual IS NOT NULL AND v_payload_harga_jual <> v_server_harga_jual)
            OR (v_payload_diskon > v_server_diskon)
        );

        IF v_has_manual_item_override AND (v_is_supervisor OR v_pos_auth_valid) THEN
            v_eff_harga_jual := GREATEST(COALESCE(v_payload_harga_jual, v_server_harga_jual), 0);
            v_eff_diskon := LEAST(v_eff_harga_jual, GREATEST(v_payload_diskon, 0));
        ELSE
            v_eff_harga_jual := v_server_harga_jual;
            v_eff_diskon := v_server_diskon;
        END IF;

        v_eff_harga_final := GREATEST(v_eff_harga_jual - v_eff_diskon, 0);

        INSERT INTO public.penjualan_items (
            id, penjualan_id, inventory_id, nama_barang, qty,
            harga_jual, diskon, harga_final, cost_at_sale
        )
        VALUES (
            gen_random_uuid(), v_penjualan_id, v_inventory.id, v_inventory.nama_barang,
            v_qty, v_eff_harga_jual, v_eff_diskon, v_eff_harga_final,
            COALESCE(v_inventory.harga_beli_terakhir, 0)
        );

        INSERT INTO public.stock_movements (id, inventory_id, tipe, qty, referensi, gudang_id, created_at)
        VALUES (gen_random_uuid(), v_inventory.id, 'OUT', v_qty, v_penjualan_id::TEXT, v_gudang_id, v_tx_time);

        v_subtotal := v_subtotal + (v_eff_harga_final * v_qty);
    END LOOP;

    -- Hitung diskon global (pembulatan sesuai POS)
    v_global_discount_total := ROUND(
        v_diskon_nominal + (v_subtotal * v_diskon_persen / 100.0),
        0
    );

    -- Ambil pengaturan loyalitas
    SELECT * INTO v_loyalty FROM public.loyalty_settings WHERE id = 'default';
    v_point_to_idr := GREATEST(COALESCE(v_loyalty.point_to_idr_ratio, 1.0), 0.0);

    -- Hitung diskon tier, validasi redeem poin, & hitung earn poin di server
    IF p_member_id IS NOT NULL THEN
        SELECT * INTO v_member
        FROM public.members
        WHERE id = p_member_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Member tidak ditemukan.';
        END IF;

        v_points_redeemed := COALESCE(p_points_redeemed, 0);
        IF v_points_redeemed < 0 THEN
            RAISE EXCEPTION 'Jumlah penukaran poin tidak boleh negatif.';
        END IF;
        IF v_points_redeemed > COALESCE(v_member.points, 0) THEN
            RAISE EXCEPTION 'Saldo poin member tidak mencukupi (Tersedia: %, Diminta: %).',
                COALESCE(v_member.points, 0), v_points_redeemed;
        END IF;

        IF v_member.tier_id IS NOT NULL THEN
            SELECT * INTO v_tier FROM public.member_tiers WHERE id = v_member.tier_id;
        END IF;
        IF v_tier IS NULL THEN
            SELECT * INTO v_tier FROM public.member_tiers WHERE UPPER(name) = 'BRONZE' LIMIT 1;
        END IF;

        v_tier_discount_pct := LEAST(GREATEST(COALESCE(v_tier.discount_percentage, 0), 0), 100);
        v_discount_member_amount := ROUND(
            GREATEST(v_subtotal - v_global_discount_total, 0) * v_tier_discount_pct / 100.0,
            0
        );
    ELSE
        IF COALESCE(p_points_redeemed, 0) > 0 THEN
            RAISE EXCEPTION 'Penukaran poin memerlukan member_id yang valid.';
        END IF;
        v_points_redeemed := 0;
        v_discount_member_amount := 0;
    END IF;

    v_total := GREATEST(
        v_subtotal - v_global_discount_total - v_discount_member_amount - (v_points_redeemed * v_point_to_idr),
        0
    );

    IF (v_pay_cash + v_pay_qris) < v_total THEN
        RAISE EXCEPTION 'Pembayaran kurang: total=%, dibayar=%', v_total, (v_pay_cash + v_pay_qris);
    END IF;

    v_kembalian := GREATEST((v_pay_cash + v_pay_qris) - v_total, 0);

    IF p_member_id IS NOT NULL THEN
        v_multiplier := GREATEST(COALESCE(v_tier.point_multiplier, 1.0), 0);
        v_dow := EXTRACT(ISODOW FROM (v_tx_time AT TIME ZONE 'Asia/Jakarta'))::INT;
        IF COALESCE(v_loyalty.double_points_active, false)
           AND v_dow = ANY(COALESCE(v_loyalty.double_points_days, ARRAY[]::INT[])) THEN
            v_multiplier := v_multiplier * GREATEST(COALESCE(v_loyalty.double_points_multiplier, 2.0), 1.0);
        END IF;
        v_points_earned := FLOOR((v_total / 1000.0) * v_multiplier);
    END IF;

    -- Update final header penjualan (termasuk kolom poin/member hasil server)
    UPDATE public.penjualan
    SET total = v_total,
        subtotal_sebelum_diskon = v_subtotal,
        kembalian = v_kembalian,
        points_earned = v_points_earned,
        points_redeemed = v_points_redeemed,
        discount_member_amount = v_discount_member_amount
    WHERE id = v_penjualan_id;

    -- Mutasi saldo poin member secara langsung & atomik di sini:
    -- trigger_update_member_points hanya berjalan AFTER INSERT (yang tadi diisi 0),
    -- sehingga nilai server-side terpakai 1x tanpa double-count.
    IF p_member_id IS NOT NULL AND (v_points_earned <> 0 OR v_points_redeemed <> 0) THEN
        UPDATE public.members
        SET points = GREATEST(COALESCE(points, 0) + v_points_earned - v_points_redeemed, 0),
            tier_points = COALESCE(tier_points, 0) + v_points_earned,
            updated_at = NOW()
        WHERE id = p_member_id;
    END IF;

    -- Tandai pos_authorization sudah dikonsumsi agar tidak bisa di-replay
    IF v_pos_auth_valid THEN
        UPDATE public.pos_authorizations
        SET consumed_by_penjualan_id = v_penjualan_id,
            updated_at = NOW()
        WHERE id = p_pos_auth_id;
    END IF;

    IF upper(p_payment_method) = 'QRIS' THEN
        v_net_cash := 0;
    ELSIF upper(p_payment_method) = 'CASH' THEN
        v_net_cash := v_total;
    ELSIF upper(p_payment_method) = 'CASH_QRIS' THEN
        v_net_cash := GREATEST(v_total - v_pay_qris, 0);
    ELSE
        v_net_cash := v_total;
    END IF;

    INSERT INTO public.kas_log (
        id, tipe, kategori, jumlah, payment_method, referensi_id,
        catatan, created_by, created_at, gudang_id, shift_id
    )
    VALUES (
        v_penjualan_id, 'JUAL', NULL, v_net_cash, p_payment_method, v_penjualan_id,
        COALESCE(NULLIF(p_catatan, ''), 'Penjualan Kasir'), v_actor, v_tx_time, v_gudang_id, v_shift_id
    )
    ON CONFLICT (id) DO UPDATE SET
        tipe = EXCLUDED.tipe,
        kategori = EXCLUDED.kategori,
        jumlah = EXCLUDED.jumlah,
        payment_method = EXCLUDED.payment_method,
        referensi_id = EXCLUDED.referensi_id,
        catatan = EXCLUDED.catatan,
        gudang_id = EXCLUDED.gudang_id,
        shift_id = EXCLUDED.shift_id;

    RETURN v_penjualan_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.pay_transaction(
    uuid, jsonb, text, numeric, numeric, numeric, numeric, text, uuid,
    timestamp with time zone, uuid, numeric, numeric, numeric, boolean, uuid, uuid, text, uuid
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.pay_transaction(
    uuid, jsonb, text, numeric, numeric, numeric, numeric, text, uuid,
    timestamp with time zone, uuid, numeric, numeric, numeric, boolean, uuid, uuid, text, uuid
) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. [INT-01] Hardening public.pay_penjualan
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pay_penjualan(
    p_penjualan_id uuid,
    p_payment_method text,
    p_cash_amount numeric,
    p_qris_amount numeric,
    p_diskon_nominal numeric,
    p_diskon_persen numeric,
    p_kembalian numeric,
    p_catatan text,
    p_created_by uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'rpc', 'pg_temp'
AS $function$
DECLARE
    v_uid UUID;
    v_roles TEXT[];
    v_user_gudang UUID;
    v_penjualan_gudang UUID;
    v_actor UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
        SELECT roles, default_gudang_id
        INTO v_roles, v_user_gudang
        FROM public.profiles
        WHERE id = v_uid;

        IF v_roles IS NULL OR NOT (v_roles && ARRAY['admin', 'kasir', 'kepala_cabang', 'kepala_gudang']::TEXT[]) THEN
            RAISE EXCEPTION 'Forbidden: Peran Anda tidak diizinkan memproses pembayaran.';
        END IF;

        IF NOT ('admin' = ANY(v_roles)) THEN
            IF v_user_gudang IS NULL THEN
                RAISE EXCEPTION 'Forbidden: Akun belum memiliki penugasan cabang (default_gudang_id).';
            END IF;
            SELECT gudang_id INTO v_penjualan_gudang FROM public.penjualan WHERE id = p_penjualan_id;
            IF v_penjualan_gudang IS NOT NULL AND v_penjualan_gudang <> v_user_gudang THEN
                RAISE EXCEPTION 'Forbidden: Tidak dapat membayar transaksi cabang lain.';
            END IF;
        END IF;
        v_actor := v_uid;
    ELSE
        IF current_setting('role', true) <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
            RAISE EXCEPTION 'Unauthorized: Sesi pengguna tidak ditemukan.';
        END IF;
        v_actor := p_created_by;
    END IF;

    RETURN rpc.pay_penjualan(
        p_penjualan_id,
        p_payment_method,
        p_cash_amount,
        p_qris_amount,
        p_diskon_nominal,
        p_diskon_persen,
        p_kembalian,
        p_catatan,
        v_actor
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.pay_penjualan(uuid, text, numeric, numeric, numeric, numeric, numeric, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pay_penjualan(uuid, text, numeric, numeric, numeric, numeric, numeric, text, uuid) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. [INT-02] Hardening create_penjualan_return (8-arg) & penjualan_return_create
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_penjualan_return(
    p_penjualan_id uuid,
    p_tanggal date,
    p_note text,
    p_created_by uuid,
    p_items jsonb,
    p_idempotency_key uuid DEFAULT NULL::uuid,
    p_gudang_id uuid DEFAULT NULL::uuid,
    p_shift_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_uid UUID;
    v_actor UUID;
    v_roles TEXT[];
    v_user_gudang UUID;
    v_is_admin BOOLEAN := false;

    v_return_id UUID;
    v_item JSONB;
    v_penjualan_item_id UUID;
    v_inventory_id UUID;
    v_qty INT;

    v_pi_row RECORD;
    v_harga_jual NUMERIC;
    v_diskon NUMERIC;
    v_harga_final NUMERIC;
    v_cost_at_sale NUMERIC;
    v_original_qty INT;
    v_return_qty INT;

    v_total_refund NUMERIC := 0;
    v_penjualan_total NUMERIC;
    v_penjualan_status TEXT;
    v_penjualan_gudang UUID;
    v_already_refunded NUMERIC := 0;
    v_remaining_refundable NUMERIC := 0;
    v_gudang_id UUID;
    v_shift_id UUID;
    v_stock_exists BOOLEAN;
    v_has_remaining_items BOOLEAN;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
        SELECT roles, default_gudang_id
        INTO v_roles, v_user_gudang
        FROM public.profiles
        WHERE id = v_uid;

        IF v_roles IS NULL OR NOT (v_roles && ARRAY['admin', 'kasir', 'kepala_cabang', 'kepala_gudang']::TEXT[]) THEN
            RAISE EXCEPTION 'Forbidden: Tidak berhak memproses retur penjualan.';
        END IF;

        v_is_admin := ('admin' = ANY(v_roles));
        IF NOT v_is_admin AND v_user_gudang IS NULL THEN
            RAISE EXCEPTION 'Forbidden: Akun belum memiliki penugasan cabang (default_gudang_id).';
        END IF;
        v_actor := v_uid;
    ELSE
        IF current_setting('role', true) <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
            RAISE EXCEPTION 'Unauthorized: Sesi pengguna tidak ditemukan.';
        END IF;
        v_is_admin := true;
        v_actor := p_created_by;
    END IF;

    -- Idempotency check
    IF p_idempotency_key IS NOT NULL AND EXISTS (SELECT 1 FROM public.penjualan_return WHERE id = p_idempotency_key) THEN
        RETURN p_idempotency_key;
    END IF;

    -- Lock header penjualan untuk serialisasi retur paralel
    SELECT total, status, gudang_id
    INTO v_penjualan_total, v_penjualan_status, v_penjualan_gudang
    FROM public.penjualan
    WHERE id = p_penjualan_id
    FOR UPDATE;

    IF v_penjualan_status IS NULL OR v_penjualan_status NOT IN ('paid', 'LUNAS') THEN
        RAISE EXCEPTION 'Penjualan tidak ditemukan atau belum lunas.';
    END IF;

    IF NOT v_is_admin THEN
        IF v_penjualan_gudang IS NOT NULL AND v_penjualan_gudang <> v_user_gudang THEN
            RAISE EXCEPTION 'Forbidden: Tidak dapat meretur transaksi cabang lain.';
        END IF;
        IF p_gudang_id IS NOT NULL AND p_gudang_id <> v_user_gudang THEN
            RAISE EXCEPTION 'Forbidden: Gudang retur harus sesuai dengan cabang Anda.';
        END IF;
        v_gudang_id := COALESCE(v_penjualan_gudang, v_user_gudang);
    ELSE
        v_gudang_id := COALESCE(p_gudang_id, v_penjualan_gudang);
        IF v_gudang_id IS NULL THEN
            SELECT id INTO v_gudang_id FROM public.gudang WHERE is_default = true LIMIT 1;
            IF v_gudang_id IS NULL THEN
                SELECT id INTO v_gudang_id FROM public.gudang ORDER BY created_at ASC LIMIT 1;
            END IF;
        END IF;
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Daftar barang retur tidak boleh kosong.';
    END IF;

    SELECT COALESCE(SUM(kl.jumlah), 0) INTO v_already_refunded
    FROM public.penjualan_return pr
    JOIN public.kas_log kl ON kl.referensi_id = pr.id AND kl.tipe = 'RETURN'
    WHERE pr.penjualan_id = p_penjualan_id;

    v_shift_id := p_shift_id;
    IF v_shift_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.shift_sessions WHERE id = v_shift_id) THEN
        v_shift_id := NULL;
    END IF;

    v_return_id := COALESCE(p_idempotency_key, gen_random_uuid());

    INSERT INTO public.penjualan_return (
        id, penjualan_id, tanggal, note, created_by, gudang_id
    )
    VALUES (
        v_return_id, p_penjualan_id, p_tanggal, p_note, v_actor, v_gudang_id
    );

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_penjualan_item_id := NULLIF(v_item->>'penjualan_item_id', '')::UUID;
        v_inventory_id := NULLIF(v_item->>'inventory_id', '')::UUID;
        v_qty := (v_item->>'qty')::INT;

        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'qty return harus > 0. penjualan_item_id=%', v_penjualan_item_id;
        END IF;

        -- Lock baris penjualan_items dengan FOR UPDATE dan ambil harga/cost asli dari DB
        v_pi_row := NULL;
        IF v_penjualan_item_id IS NOT NULL THEN
            SELECT id, inventory_id, nama_barang, qty, harga_jual, diskon, harga_final, cost_at_sale
            INTO v_pi_row
            FROM public.penjualan_items
            WHERE id = v_penjualan_item_id AND penjualan_id = p_penjualan_id
            FOR UPDATE;
        END IF;

        IF v_pi_row.id IS NULL AND v_inventory_id IS NOT NULL THEN
            SELECT id, inventory_id, nama_barang, qty, harga_jual, diskon, harga_final, cost_at_sale
            INTO v_pi_row
            FROM public.penjualan_items
            WHERE penjualan_id = p_penjualan_id AND inventory_id = v_inventory_id
            ORDER BY id
            LIMIT 1
            FOR UPDATE;
        END IF;

        IF v_pi_row.id IS NULL THEN
            RAISE EXCEPTION 'Item tidak ada di transaksi original';
        END IF;

        v_penjualan_item_id := v_pi_row.id;
        v_inventory_id := v_pi_row.inventory_id;
        v_original_qty := v_pi_row.qty;
        v_harga_jual := GREATEST(COALESCE(v_pi_row.harga_jual, 0), 0);
        v_diskon := GREATEST(COALESCE(v_pi_row.diskon, 0), 0);
        v_harga_final := GREATEST(COALESCE(v_pi_row.harga_final, v_harga_jual - v_diskon), 0);
        v_cost_at_sale := GREATEST(COALESCE(v_pi_row.cost_at_sale, 0), 0);

        SELECT COALESCE(SUM(pri.qty), 0) INTO v_return_qty
        FROM public.penjualan_return pr
        JOIN public.penjualan_return_items pri ON pri.penjualan_return_id = pr.id
        WHERE pr.penjualan_id = p_penjualan_id
          AND (pri.penjualan_item_id = v_penjualan_item_id OR (pri.penjualan_item_id IS NULL AND pri.inventory_id = v_inventory_id));

        IF v_qty > (v_original_qty - v_return_qty) THEN
            RAISE EXCEPTION 'Qty return melebihi yang bisa dikembalikan. Maks: %', (v_original_qty - v_return_qty);
        END IF;

        INSERT INTO public.penjualan_return_items (
            id, penjualan_return_id, penjualan_item_id, inventory_id,
            nama_barang, qty, harga_jual, diskon, harga_final, cost_at_sale
        )
        VALUES (
            gen_random_uuid(), v_return_id, v_penjualan_item_id, v_inventory_id,
            v_pi_row.nama_barang, v_qty, v_harga_jual, v_diskon, v_harga_final, v_cost_at_sale
        );

        -- Lock inventory & inventory_stocks saat restore stok
        PERFORM 1 FROM public.inventory WHERE id = v_inventory_id FOR UPDATE;

        IF v_gudang_id IS NOT NULL THEN
            SELECT EXISTS(SELECT 1 FROM public.inventory_stocks WHERE inventory_id = v_inventory_id AND gudang_id = v_gudang_id)
            INTO v_stock_exists;

            IF v_stock_exists THEN
                PERFORM 1 FROM public.inventory_stocks WHERE inventory_id = v_inventory_id AND gudang_id = v_gudang_id FOR UPDATE;
                UPDATE public.inventory_stocks
                SET stok = stok + v_qty,
                    updated_at = NOW()
                WHERE inventory_id = v_inventory_id AND gudang_id = v_gudang_id;
            ELSE
                INSERT INTO public.inventory_stocks (id, inventory_id, gudang_id, stok, created_at, updated_at)
                VALUES (gen_random_uuid(), v_inventory_id, v_gudang_id, v_qty, NOW(), NOW());
            END IF;
        ELSE
            UPDATE public.inventory
            SET stok = stok + v_qty,
                updated_at = NOW()
            WHERE id = v_inventory_id;
        END IF;

        INSERT INTO public.stock_movements (id, inventory_id, tipe, qty, referensi, gudang_id, created_at)
        VALUES (gen_random_uuid(), v_inventory_id, 'IN', v_qty, v_return_id::text, v_gudang_id, NOW());

        v_total_refund := v_total_refund + (v_harga_final * v_qty);
    END LOOP;

    v_remaining_refundable := GREATEST(0, COALESCE(v_penjualan_total, 0) - COALESCE(v_already_refunded, 0));
    v_total_refund := LEAST(v_total_refund, v_remaining_refundable);

    INSERT INTO public.kas_log (
        id, tipe, jumlah, payment_method, referensi_id, catatan, created_by, created_at, gudang_id, shift_id
    )
    VALUES (
        v_return_id, 'RETURN', v_total_refund, 'CASH', v_return_id,
        COALESCE(p_note, 'Retur Penjualan'), v_actor, NOW(), v_gudang_id, v_shift_id
    )
    ON CONFLICT (id) DO UPDATE
    SET jumlah = EXCLUDED.jumlah,
        catatan = EXCLUDED.catatan,
        shift_id = COALESCE(EXCLUDED.shift_id, public.kas_log.shift_id);

    SELECT EXISTS (
        SELECT 1
        FROM public.penjualan_items pi
        WHERE pi.penjualan_id = p_penjualan_id
          AND pi.qty > (
              SELECT COALESCE(SUM(pri.qty), 0)
              FROM public.penjualan_return pr
              JOIN public.penjualan_return_items pri ON pri.penjualan_return_id = pr.id
              WHERE pr.penjualan_id = p_penjualan_id
                AND (pri.penjualan_item_id = pi.id OR (pri.penjualan_item_id IS NULL AND pri.inventory_id = pi.inventory_id))
          )
    ) INTO v_has_remaining_items;

    IF NOT v_has_remaining_items THEN
        UPDATE public.penjualan
        SET status = 'refunded',
            refunded_at = NOW()
        WHERE id = p_penjualan_id;
    END IF;

    RETURN v_return_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_penjualan_return(uuid, date, text, uuid, jsonb, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_penjualan_return(uuid, date, text, uuid, jsonb, uuid, uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.penjualan_return_create(
    p_penjualan_id uuid,
    p_tanggal date,
    p_created_by uuid,
    p_note text,
    p_idempotency_key uuid,
    p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_uid UUID;
    v_actor UUID;
    v_roles TEXT[];
    v_user_gudang UUID;
    v_is_admin BOOLEAN := false;

    v_return_id uuid;
    v_now timestamptz := now();
    v_total_qty integer;
    v_total_refund numeric := 0;
    v_gudang_id uuid;
    v_penjualan_status text;
    v_item record;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
        SELECT roles, default_gudang_id
        INTO v_roles, v_user_gudang
        FROM public.profiles
        WHERE id = v_uid;

        IF v_roles IS NULL OR NOT (v_roles && ARRAY['admin', 'kasir', 'kepala_cabang', 'kepala_gudang']::TEXT[]) THEN
            RAISE EXCEPTION 'Forbidden: Tidak berhak memproses retur penjualan.';
        END IF;

        v_is_admin := ('admin' = ANY(v_roles));
        IF NOT v_is_admin AND v_user_gudang IS NULL THEN
            RAISE EXCEPTION 'Forbidden: Akun belum memiliki penugasan cabang (default_gudang_id).';
        END IF;
        v_actor := v_uid;
    ELSE
        IF current_setting('role', true) <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
            RAISE EXCEPTION 'Unauthorized: Sesi pengguna tidak ditemukan.';
        END IF;
        v_is_admin := true;
        v_actor := p_created_by;
    END IF;

    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_return_id
        FROM public.penjualan_return
        WHERE idempotency_key = p_idempotency_key
        LIMIT 1;

        IF v_return_id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'status', 'ok',
                'penjualan_return_id', v_return_id,
                'idempotent', true
            );
        END IF;
    END IF;

    -- Lock header penjualan
    SELECT gudang_id, status
    INTO v_gudang_id, v_penjualan_status
    FROM public.penjualan
    WHERE id = p_penjualan_id
    FOR UPDATE;

    IF v_penjualan_status IS NULL OR v_penjualan_status NOT IN ('paid', 'LUNAS') THEN
        RAISE EXCEPTION 'Penjualan tidak ditemukan atau belum lunas.';
    END IF;

    IF NOT v_is_admin THEN
        IF v_gudang_id IS NOT NULL AND v_gudang_id <> v_user_gudang THEN
            RAISE EXCEPTION 'Forbidden: Tidak dapat meretur transaksi cabang lain.';
        END IF;
        v_gudang_id := COALESCE(v_gudang_id, v_user_gudang);
    ELSIF v_gudang_id IS NULL THEN
        SELECT id INTO v_gudang_id FROM public.gudang WHERE is_default = true LIMIT 1;
    END IF;

    CREATE TEMP TABLE _ret_cart (
        penjualan_item_id uuid primary key,
        qty integer
    ) ON COMMIT DROP;

    INSERT INTO _ret_cart (penjualan_item_id, qty)
    SELECT c.penjualan_item_id, sum(c.qty) as qty
    FROM (
        SELECT nullif(btrim(coalesce(item->>'penjualan_item_id', '')), '')::uuid as penjualan_item_id,
               (item->>'qty')::int as qty
        FROM jsonb_array_elements(p_items) as item
    ) c
    GROUP BY c.penjualan_item_id;

    IF NOT EXISTS (SELECT 1 FROM _ret_cart) OR EXISTS (SELECT 1 FROM _ret_cart WHERE penjualan_item_id IS NULL OR qty IS NULL OR qty <= 0) THEN
        RAISE EXCEPTION 'VALIDASI gagal: qty harus > 0 dan penjualan_item_id tidak boleh null.';
    END IF;

    -- Lock semua penjualan_items terkait dengan FOR UPDATE
    PERFORM 1
    FROM public.penjualan_items pi
    JOIN _ret_cart c ON c.penjualan_item_id = pi.id
    WHERE pi.penjualan_id = p_penjualan_id
    FOR UPDATE;

    IF EXISTS (
        SELECT 1 FROM _ret_cart c
        LEFT JOIN public.penjualan_items pi ON pi.id = c.penjualan_item_id AND pi.penjualan_id = p_penjualan_id
        WHERE pi.id IS NULL
    ) THEN
        RAISE EXCEPTION 'VALIDASI gagal: ada penjualan_item_id yang tidak valid untuk penjualan ini.';
    END IF;

    WITH returned_so_far AS (
        SELECT pir.penjualan_item_id, coalesce(sum(pir.qty), 0) as qty_return_total
        FROM public.penjualan_return_items pir
        JOIN public.penjualan_return pr ON pr.id = pir.penjualan_return_id
        WHERE pr.penjualan_id = p_penjualan_id
        GROUP BY pir.penjualan_item_id
    )
    SELECT 1 INTO v_return_id
    FROM (
        SELECT c.penjualan_item_id,
               c.qty as qty_new,
               pi.qty as qty_asli,
               coalesce(r.qty_return_total, 0) as qty_return_so_far
        FROM _ret_cart c
        JOIN public.penjualan_items pi ON pi.id = c.penjualan_item_id
        LEFT JOIN returned_so_far r ON r.penjualan_item_id = c.penjualan_item_id
    ) x
    WHERE (x.qty_return_so_far + x.qty_new) > x.qty_asli
    LIMIT 1;

    IF v_return_id IS NOT NULL THEN
        RAISE EXCEPTION 'RETURN LIMIT gagal: qty return melebihi qty asli per penjualan_item_id.';
    END IF;

    PERFORM 1
    FROM public.inventory inv
    JOIN public.penjualan_items pi ON pi.inventory_id = inv.id
    JOIN _ret_cart c ON c.penjualan_item_id = pi.id
    FOR UPDATE;

    INSERT INTO public.penjualan_return (
        penjualan_id, tanggal, note, created_by, created_at, idempotency_key, gudang_id
    )
    VALUES (
        p_penjualan_id, p_tanggal, p_note, v_actor, v_now, p_idempotency_key, v_gudang_id
    )
    RETURNING id INTO v_return_id;

    WITH ins AS (
        INSERT INTO public.penjualan_return_items (
            penjualan_return_id, penjualan_item_id, inventory_id, nama_barang,
            qty, harga_jual, diskon, harga_final, cost_at_sale
        )
        SELECT v_return_id,
               pi.id,
               pi.inventory_id,
               pi.nama_barang,
               c.qty,
               pi.harga_jual,
               pi.diskon,
               pi.harga_final,
               pi.cost_at_sale
        FROM _ret_cart c
        JOIN public.penjualan_items pi ON pi.id = c.penjualan_item_id
        RETURNING penjualan_item_id, inventory_id, qty, harga_final
    )
    SELECT sum(qty), coalesce(sum(qty * harga_final), 0)
    INTO v_total_qty, v_total_refund
    FROM ins;

    IF v_gudang_id IS NOT NULL THEN
        FOR v_item IN (
            SELECT pi.inventory_id, sum(c.qty) as qty_sum
            FROM _ret_cart c
            JOIN public.penjualan_items pi ON pi.id = c.penjualan_item_id
            GROUP BY pi.inventory_id
        ) LOOP
            PERFORM 1 FROM public.inventory_stocks
            WHERE inventory_id = v_item.inventory_id AND gudang_id = v_gudang_id
            FOR UPDATE;

            INSERT INTO public.inventory_stocks (inventory_id, gudang_id, stok, updated_at)
            VALUES (v_item.inventory_id, v_gudang_id, v_item.qty_sum, v_now)
            ON CONFLICT (inventory_id, gudang_id)
            DO UPDATE SET stok = public.inventory_stocks.stok + v_item.qty_sum,
                          updated_at = v_now;
        END LOOP;
    ELSE
        UPDATE public.inventory inv
        SET stok = inv.stok + x.qty_sum,
            updated_at = v_now
        FROM (
            SELECT pi.inventory_id, sum(c.qty) as qty_sum
            FROM _ret_cart c
            JOIN public.penjualan_items pi ON pi.id = c.penjualan_item_id
            GROUP BY pi.inventory_id
        ) x
        WHERE inv.id = x.inventory_id;
    END IF;

    INSERT INTO public.stock_movements (id, inventory_id, tipe, qty, referensi, gudang_id, created_at)
    SELECT gen_random_uuid(),
           pi.inventory_id,
           'IN'::text,
           c.qty,
           'penjualan_return:' || v_return_id::text || ':' || c.penjualan_item_id::text,
           v_gudang_id,
           v_now
    FROM _ret_cart c
    JOIN public.penjualan_items pi ON pi.id = c.penjualan_item_id;

    IF v_total_refund > 0 THEN
        INSERT INTO public.kas_log (id, tipe, jumlah, payment_method, referensi_id, catatan, created_by, created_at, gudang_id)
        VALUES (
            gen_random_uuid(), 'RETURN', v_total_refund, 'CASH', v_return_id,
            COALESCE(p_note, 'Retur Penjualan'), v_actor, v_now, v_gudang_id
        );
    END IF;

    RETURN jsonb_build_object(
        'status', 'ok',
        'penjualan_return_id', v_return_id,
        'total_qty', v_total_qty,
        'total_refund', v_total_refund,
        'affected_items', (
            SELECT jsonb_agg(jsonb_build_object('penjualan_item_id', penjualan_item_id, 'qty', qty))
            FROM public.penjualan_return_items
            WHERE penjualan_return_id = v_return_id
        )
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.penjualan_return_create(uuid, date, uuid, text, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.penjualan_return_create(uuid, date, uuid, text, uuid, jsonb) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 5. [INT-04] Hardening Loyalty Kawan Bagus
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_member_reward_atomic(
    p_member_id uuid,
    p_reward_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
    v_uid UUID;
    v_roles TEXT[];
    v_settings RECORD;
    v_member RECORD;
    v_reward RECORD;
    v_new_points NUMERIC;
    v_voucher_code TEXT;
    v_expires_at TIMESTAMPTZ;
    v_voucher RECORD;
    v_active_vouchers_count INT;
    v_claims_this_month INT;
    v_current_month_committed NUMERIC;
    v_reward_nominal NUMERIC;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
        SELECT roles INTO v_roles FROM public.profiles WHERE id = v_uid;
        IF v_roles IS NULL OR NOT (v_roles && ARRAY['admin', 'kasir', 'kepala_cabang', 'kepala_gudang']::TEXT[]) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Forbidden: Tidak berhak menukarkan reward member.');
        END IF;
    ELSIF current_setting('role', true) <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized.');
    END IF;

    SELECT * INTO v_settings FROM public.loyalty_settings WHERE id = 'default';
    IF NOT FOUND THEN
        v_settings.monthly_budget_cap := 3000000.00;
        v_settings.max_active_vouchers_per_member := 2;
        v_settings.is_redemption_locked := false;
    END IF;

    IF v_settings.is_redemption_locked THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Penukaran reward sementara dijeda untuk pemeliharaan sistem. Silakan coba kembali nanti.'
        );
    END IF;

    SELECT * INTO v_member FROM public.members WHERE id = p_member_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Data member tidak ditemukan.');
    END IF;

    SELECT * INTO v_reward FROM public.point_rewards WHERE id = p_reward_id AND is_active = true FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Reward tidak tersedia atau sudah nonaktif.');
    END IF;

    IF COALESCE(v_reward.stock, 0) <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Maaf, kuota stok reward ini telah habis.');
    END IF;

    IF v_member.points < v_reward.points_required THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Saldo poin Anda (' || v_member.points::int || ') belum mencukupi untuk reward ini (' || v_reward.points_required::int || ' poin).'
        );
    END IF;

    SELECT COUNT(*) INTO v_active_vouchers_count
    FROM public.member_vouchers
    WHERE id_member = p_member_id
      AND status = 'active'
      AND expires_at > NOW();

    IF v_active_vouchers_count >= COALESCE(v_settings.max_active_vouchers_per_member, 2) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Anda masih memiliki ' || v_active_vouchers_count || ' voucher aktif. Gunakan voucher Anda di kasir terlebih dahulu sebelum menukar lagi ya!'
        );
    END IF;

    IF COALESCE(v_reward.max_claims_per_member, 1) > 0 THEN
        SELECT COUNT(*) INTO v_claims_this_month
        FROM public.member_vouchers
        WHERE id_member = p_member_id
          AND id_reward = p_reward_id
          AND created_at >= date_trunc('month', NOW());

        IF v_claims_this_month >= v_reward.max_claims_per_member THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Anda telah mencapai batas maksimal penukaran untuk reward ini di periode bulan ini.'
            );
        END IF;
    END IF;

    v_reward_nominal := COALESCE(v_reward.discount_nominal, 0.0);
    SELECT COALESCE(SUM(discount_nominal), 0) INTO v_current_month_committed
    FROM public.member_vouchers
    WHERE created_at >= date_trunc('month', NOW())
      AND status IN ('active', 'used');

    IF (v_current_month_committed + v_reward_nominal) > COALESCE(v_settings.monthly_budget_cap, 3000000.00) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Klaim reward bulan ini telah mencapai kuota anggaran maksimal toko. Nantikan pembukaan kuota periode berikutnya!'
        );
    END IF;

    v_new_points := v_member.points - v_reward.points_required;
    UPDATE public.members
    SET points = v_new_points, updated_at = NOW()
    WHERE id = p_member_id;

    UPDATE public.point_rewards
    SET stock = GREATEST(0, stock - 1), updated_at = NOW()
    WHERE id = p_reward_id;

    -- CSPRNG kode voucher KB-XXXX-XXXX
    v_voucher_code := 'KB-'
        || upper(substr(encode(extensions.gen_random_bytes(5), 'hex'), 1, 4))
        || '-'
        || upper(substr(encode(extensions.gen_random_bytes(5), 'hex'), 5, 4));
    v_expires_at := NOW() + (COALESCE(v_reward.valid_days, 30) || ' days')::interval;

    INSERT INTO public.member_vouchers (
        id_member, id_reward, voucher_code, title, discount_nominal,
        min_purchase_amount, status, expires_at
    ) VALUES (
        p_member_id, p_reward_id, v_voucher_code, v_reward.title, v_reward_nominal,
        COALESCE(v_reward.min_purchase_amount, 0.0), 'active', v_expires_at
    )
    RETURNING * INTO v_voucher;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Berhasil menukarkan ' || v_reward.points_required::int || ' poin!',
        'new_points', v_new_points,
        'voucher', jsonb_build_object(
            'id', v_voucher.id,
            'id_member', v_voucher.id_member,
            'id_reward', v_voucher.id_reward,
            'voucher_code', v_voucher.voucher_code,
            'title', v_voucher.title,
            'discount_nominal', v_voucher.discount_nominal,
            'min_purchase_amount', v_voucher.min_purchase_amount,
            'status', v_voucher.status,
            'expires_at', v_voucher.expires_at,
            'created_at', v_voucher.created_at
        )
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Gagal menukarkan reward. Silakan coba beberapa saat lagi.');
END;
$function$;

REVOKE ALL ON FUNCTION public.redeem_member_reward_atomic(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_member_reward_atomic(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.request_member_otp(p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
    v_norm_phone TEXT;
    v_recent_count INT;
    v_otp TEXT;
    v_expires_at TIMESTAMPTZ;
    v_wa_text TEXT;
BEGIN
    v_norm_phone := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');
    IF v_norm_phone LIKE '08%' THEN
        v_norm_phone := '62' || substr(v_norm_phone, 2);
    ELSIF v_norm_phone LIKE '8%' THEN
        v_norm_phone := '62' || v_norm_phone;
    END IF;

    IF length(v_norm_phone) < 10 OR length(v_norm_phone) > 15 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Nomor WhatsApp belum sesuai (minimal 10 digit ya)');
    END IF;

    -- Rate-limit: maksimal 3 permintaan OTP per nomor dalam 15 menit terakhir
    SELECT COUNT(*) INTO v_recent_count
    FROM public.member_otp_sessions
    WHERE phone = v_norm_phone
      AND created_at > NOW() - interval '15 minutes';

    IF v_recent_count >= 3 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Terlalu banyak permintaan OTP. Tunggu 15 menit.');
    END IF;

    -- CSPRNG 6-digit OTP
    v_otp := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint & 2147483647) % 900000 + 100000)::text, 6, '0');
    v_expires_at := NOW() + interval '5 minutes';

    UPDATE public.member_otp_sessions
    SET expires_at = NOW() - interval '1 minute'
    WHERE phone = v_norm_phone AND expires_at > NOW();

    INSERT INTO public.member_otp_sessions (phone, otp_code, attempts, expires_at)
    VALUES (v_norm_phone, v_otp, 0, v_expires_at);

    v_wa_text := 'Hai Kawan Bagus! Ini kode OTP kamu: *' || v_otp || '*' || chr(10) || chr(10) ||
                 'Berlaku 5 menit ya. Kasir atau pihak Toko Bagus tidak akan pernah minta kode ini. Jaga baik-baik ya!';

    INSERT INTO public.wa_outbox (phone, message, type, source, status)
    VALUES (v_norm_phone, v_wa_text, 'text', 'pos_cashier', 'pending');

    RETURN jsonb_build_object(
        'success', true,
        'phone', v_norm_phone,
        'message', 'Kode OTP sudah dikirim ke WhatsApp kamu ya.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Gagal memproses permintaan OTP. Silakan coba beberapa saat lagi.');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.request_member_otp(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.verify_member_otp(
    p_phone text,
    p_otp text,
    p_name text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
    v_norm_phone TEXT;
    v_clean_otp TEXT;
    v_session RECORD;
    v_member RECORD;
    v_tier RECORD;
    v_default_tier_id UUID;
    v_alt_phone TEXT;
    v_new_attempts INT;
BEGIN
    v_norm_phone := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');
    IF v_norm_phone LIKE '08%' THEN
        v_norm_phone := '62' || substr(v_norm_phone, 2);
    ELSIF v_norm_phone LIKE '8%' THEN
        v_norm_phone := '62' || v_norm_phone;
    END IF;

    v_clean_otp := trim(COALESCE(p_otp, ''));

    -- Lock sesi OTP aktif dengan FOR UPDATE untuk mencegah race condition brute-force paralel
    SELECT * INTO v_session
    FROM public.member_otp_sessions
    WHERE phone = v_norm_phone AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Kode OTP sudah kedaluwarsa atau belum diminta. Yuk minta kode baru.');
    END IF;

    IF COALESCE(v_session.attempts, 0) >= 4 THEN
        UPDATE public.member_otp_sessions
        SET expires_at = NOW() - interval '1 minute'
        WHERE id = v_session.id;
        RETURN jsonb_build_object('success', false, 'message', 'Sudah beberapa kali salah kode. Silakan minta kode baru ya.');
    END IF;

    IF v_session.otp_code <> v_clean_otp THEN
        v_new_attempts := COALESCE(v_session.attempts, 0) + 1;
        UPDATE public.member_otp_sessions
        SET attempts = v_new_attempts,
            expires_at = CASE WHEN v_new_attempts >= 4 THEN NOW() - interval '1 minute' ELSE expires_at END
        WHERE id = v_session.id;

        RETURN jsonb_build_object('success', false, 'message', 'Kode OTP yang kamu masukkan keliru. Cek lagi pesan WhatsApp-nya ya.');
    END IF;

    UPDATE public.member_otp_sessions
    SET expires_at = NOW() - interval '1 minute'
    WHERE id = v_session.id;

    v_alt_phone := CASE WHEN v_norm_phone LIKE '62%' THEN '0' || substr(v_norm_phone, 3) ELSE v_norm_phone END;
    SELECT * INTO v_member
    FROM public.members
    WHERE whatsapp_number = v_norm_phone OR whatsapp_number = v_alt_phone
    LIMIT 1;

    IF FOUND THEN
        IF p_name IS NOT NULL AND trim(p_name) <> '' AND (v_member.name LIKE '%Pelanggan%' OR v_member.name = '') THEN
            UPDATE public.members
            SET name = trim(p_name), updated_at = NOW()
            WHERE id = v_member.id;

            SELECT * INTO v_member FROM public.members WHERE id = v_member.id;
        END IF;
    ELSE
        SELECT id INTO v_default_tier_id
        FROM public.member_tiers
        WHERE LOWER(name) LIKE '%bronze%'
        ORDER BY min_points_required ASC
        LIMIT 1;

        INSERT INTO public.members (
            name, whatsapp_number, tier_id, points, tier_points, prefer_digital_receipt
        ) VALUES (
            COALESCE(NULLIF(trim(p_name), ''), 'Kawan Bagus'),
            v_norm_phone, v_default_tier_id, 0, 0, true
        )
        RETURNING * INTO v_member;
    END IF;

    SELECT * INTO v_tier FROM public.member_tiers WHERE id = v_member.tier_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Berhasil masuk!',
        'member', jsonb_build_object(
            'id', v_member.id,
            'name', v_member.name,
            'whatsapp_number', v_member.whatsapp_number,
            'tier_id', v_member.tier_id,
            'tier_name', COALESCE(v_tier.name, 'Bronze'),
            'discount_percentage', COALESCE(v_tier.discount_percentage, 0.0),
            'point_multiplier', COALESCE(v_tier.point_multiplier, 1.0),
            'points', COALESCE(v_member.points, 0),
            'tier_points', COALESCE(v_member.tier_points, 0),
            'prefer_digital_receipt', COALESCE(v_member.prefer_digital_receipt, true),
            'created_at', v_member.created_at
        )
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Gagal memverifikasi OTP. Silakan coba beberapa saat lagi.');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.verify_member_otp(text, text, text) TO anon, authenticated, service_role;
