-- ==============================================================================
-- MIGRATION: 20261124103000_fase1d_rls_storage_constraints_indexes.sql
-- FASE 1D:
--   1. [SEC-04 / DB] Pembersihan policy RLS wildcard (qual=true / with_check=true)
--      & pengetatan akses tabel inti berdasarkan peran & cabang fail-closed
--      (dengan tetap mempertahankan akses POS & 6 objek katalog publik Kawan Bagus).
--   2. [INT-04] Trigger guard_members_points_columns() agar kolom poin member
--      tidak bisa dimodifikasi langsung oleh client non-admin via PostgREST.
--   3. [DB / Auth] Hardening storage.buckets (5-10MB, MIME non-SVG) & storage.objects.
--   4. [INT-05] CHECK constraints (>= 0 / > 0) via NOT VALID -> VALIDATE.
--   5. [Perf] Foreign key indexes tersisa (member_vouchers, wa_bridge_status).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Pastikan policy anon berbahaya terhapus (idempotent)
--    Catatan: Kawan Bagus tetap membutuhkan SELECT anon pada vw_katalog_publik,
--    inventory_barcodes, member_tiers, loyalty_settings, promosi, promosi_items,
--    point_rewards (is_active = true), & gudang (is_active = true).
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "penjualan_anon_select" ON public.penjualan;
DROP POLICY IF EXISTS "penjualan_items_anon_select" ON public.penjualan_items;
DROP POLICY IF EXISTS "kb_inventory_anon_select" ON public.inventory;
DROP POLICY IF EXISTS "kb_members_anon_select" ON public.members;
DROP POLICY IF EXISTS "kb_member_vouchers_anon_select" ON public.member_vouchers;
DROP POLICY IF EXISTS "member_fcm_tokens_allow_all" ON public.member_fcm_tokens;
DROP POLICY IF EXISTS "Allow anon manage wa_bridge_status" ON public.wa_bridge_status;
DROP POLICY IF EXISTS "Allow anon read wa_bridge_status" ON public.wa_bridge_status;
DROP POLICY IF EXISTS "Allow anon to read wa_outbox for polling" ON public.wa_outbox;
DROP POLICY IF EXISTS "Allow anon to update wa_outbox status" ON public.wa_outbox;

-- ------------------------------------------------------------------------------
-- 2. Pengetatan Policy RLS {authenticated} pada Tabel Transaksional & Operasional
-- ------------------------------------------------------------------------------

-- 2a. penjualan & penjualan_items
DROP POLICY IF EXISTS "penjualan_all_access" ON public.penjualan;
DROP POLICY IF EXISTS "penjualan_insert_staff" ON public.penjualan;
DROP POLICY IF EXISTS "penjualan_select" ON public.penjualan;
DROP POLICY IF EXISTS "penjualan_select_scoped" ON public.penjualan;
DROP POLICY IF EXISTS "penjualan_admin_manage" ON public.penjualan;

CREATE POLICY "penjualan_select_scoped"
ON public.penjualan
FOR SELECT TO authenticated
USING (
    (SELECT public.is_finance_or_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang', 'kasir', 'staff_gudang']))
        AND gudang_id = (SELECT public.get_auth_user_default_gudang())
    )
);

CREATE POLICY "penjualan_admin_manage"
ON public.penjualan
FOR ALL TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "penjualan_items_all_access" ON public.penjualan_items;
DROP POLICY IF EXISTS "penjualan_items_insert_staff" ON public.penjualan_items;
DROP POLICY IF EXISTS "penjualan_items_select" ON public.penjualan_items;
DROP POLICY IF EXISTS "penjualan_items_select_scoped" ON public.penjualan_items;
DROP POLICY IF EXISTS "penjualan_items_admin_manage" ON public.penjualan_items;

CREATE POLICY "penjualan_items_select_scoped"
ON public.penjualan_items
FOR SELECT TO authenticated
USING (
    (SELECT public.is_finance_or_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang', 'kasir', 'staff_gudang']))
        AND EXISTS (
            SELECT 1 FROM public.penjualan p
            WHERE p.id = penjualan_items.penjualan_id
              AND p.gudang_id = (SELECT public.get_auth_user_default_gudang())
        )
    )
);

CREATE POLICY "penjualan_items_admin_manage"
ON public.penjualan_items
FOR ALL TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

-- 2b. penjualan_return & penjualan_return_items
DROP POLICY IF EXISTS "penjualan_return_all_access" ON public.penjualan_return;
DROP POLICY IF EXISTS "penjualan_return_insert_staff" ON public.penjualan_return;
DROP POLICY IF EXISTS "penjualan_return_select" ON public.penjualan_return;
DROP POLICY IF EXISTS "penjualan_return_select_scoped" ON public.penjualan_return;
DROP POLICY IF EXISTS "penjualan_return_admin_manage" ON public.penjualan_return;

CREATE POLICY "penjualan_return_select_scoped"
ON public.penjualan_return
FOR SELECT TO authenticated
USING (
    (SELECT public.is_finance_or_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang', 'kasir', 'staff_gudang']))
        AND gudang_id = (SELECT public.get_auth_user_default_gudang())
    )
);

CREATE POLICY "penjualan_return_admin_manage"
ON public.penjualan_return
FOR ALL TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "penjualan_return_items_all_access" ON public.penjualan_return_items;
DROP POLICY IF EXISTS "penjualan_return_items_insert_staff" ON public.penjualan_return_items;
DROP POLICY IF EXISTS "penjualan_return_items_select" ON public.penjualan_return_items;
DROP POLICY IF EXISTS "penjualan_return_items_select_scoped" ON public.penjualan_return_items;
DROP POLICY IF EXISTS "penjualan_return_items_admin_manage" ON public.penjualan_return_items;

CREATE POLICY "penjualan_return_items_select_scoped"
ON public.penjualan_return_items
FOR SELECT TO authenticated
USING (
    (SELECT public.is_finance_or_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang', 'kasir', 'staff_gudang']))
        AND EXISTS (
            SELECT 1 FROM public.penjualan_return pr
            WHERE pr.id = penjualan_return_items.penjualan_return_id
              AND pr.gudang_id = (SELECT public.get_auth_user_default_gudang())
        )
    )
);

CREATE POLICY "penjualan_return_items_admin_manage"
ON public.penjualan_return_items
FOR ALL TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

-- 2c. kas_log (POS & kas.ts melakukan INSERT/UPSERT langsung, terikat cabang & created_by)
DROP POLICY IF EXISTS "kas_log_all_access" ON public.kas_log;
DROP POLICY IF EXISTS "kas_log_restrict_delete" ON public.kas_log;
DROP POLICY IF EXISTS "kas_log_restrict_update" ON public.kas_log;
DROP POLICY IF EXISTS "kas_log_select_scoped" ON public.kas_log;
DROP POLICY IF EXISTS "kas_log_insert_scoped" ON public.kas_log;
DROP POLICY IF EXISTS "kas_log_update_finance_admin" ON public.kas_log;
DROP POLICY IF EXISTS "kas_log_delete_finance_admin" ON public.kas_log;

CREATE POLICY "kas_log_select_scoped"
ON public.kas_log
FOR SELECT TO authenticated
USING (
    (SELECT public.is_finance_or_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang', 'kasir']))
        AND gudang_id = (SELECT public.get_auth_user_default_gudang())
    )
);

CREATE POLICY "kas_log_insert_scoped"
ON public.kas_log
FOR INSERT TO authenticated
WITH CHECK (
    (SELECT public.is_finance_or_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang', 'kasir']))
        AND gudang_id = (SELECT public.get_auth_user_default_gudang())
        AND (created_by IS NULL OR created_by = (SELECT auth.uid()))
    )
);

CREATE POLICY "kas_log_update_finance_admin"
ON public.kas_log
FOR UPDATE TO authenticated
USING ((SELECT public.is_finance_or_admin()))
WITH CHECK ((SELECT public.is_finance_or_admin()));

CREATE POLICY "kas_log_delete_finance_admin"
ON public.kas_log
FOR DELETE TO authenticated
USING ((SELECT public.is_finance_or_admin()));

-- 2d. pengeluaran_operasional
DROP POLICY IF EXISTS "pengeluaran_operasional_select_policy" ON public.pengeluaran_operasional;
DROP POLICY IF EXISTS "pengeluaran_operasional_insert_policy" ON public.pengeluaran_operasional;
DROP POLICY IF EXISTS "pengeluaran_operasional_update_policy" ON public.pengeluaran_operasional;
DROP POLICY IF EXISTS "pengeluaran_operasional_delete_policy" ON public.pengeluaran_operasional;
DROP POLICY IF EXISTS "pengeluaran_operasional_select_scoped" ON public.pengeluaran_operasional;
DROP POLICY IF EXISTS "pengeluaran_operasional_insert_scoped" ON public.pengeluaran_operasional;
DROP POLICY IF EXISTS "pengeluaran_operasional_update_scoped" ON public.pengeluaran_operasional;
DROP POLICY IF EXISTS "pengeluaran_operasional_delete_finance_admin" ON public.pengeluaran_operasional;

CREATE POLICY "pengeluaran_operasional_select_scoped"
ON public.pengeluaran_operasional
FOR SELECT TO authenticated
USING (
    (SELECT public.is_finance_or_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang']))
        AND gudang_id = (SELECT public.get_auth_user_default_gudang())
    )
);

CREATE POLICY "pengeluaran_operasional_insert_scoped"
ON public.pengeluaran_operasional
FOR INSERT TO authenticated
WITH CHECK (
    (SELECT public.is_finance_or_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang']))
        AND gudang_id = (SELECT public.get_auth_user_default_gudang())
        AND (created_by IS NULL OR created_by = (SELECT auth.uid()))
    )
);

CREATE POLICY "pengeluaran_operasional_update_scoped"
ON public.pengeluaran_operasional
FOR UPDATE TO authenticated
USING (
    (SELECT public.is_finance_or_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang']))
        AND gudang_id = (SELECT public.get_auth_user_default_gudang())
    )
)
WITH CHECK (
    (SELECT public.is_finance_or_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang']))
        AND gudang_id = (SELECT public.get_auth_user_default_gudang())
    )
);

CREATE POLICY "pengeluaran_operasional_delete_finance_admin"
ON public.pengeluaran_operasional
FOR DELETE TO authenticated
USING ((SELECT public.is_finance_or_admin()));

-- 2e. pembelian & pembelian_items (buka SELECT ke finance sesuai ROLE_DAN_HAK_AKSES.md)
DROP POLICY IF EXISTS "pembelian_select_admin" ON public.pembelian;
CREATE POLICY "pembelian_select_admin"
ON public.pembelian
FOR SELECT TO authenticated
USING ((SELECT public.is_finance_or_admin()));

DROP POLICY IF EXISTS "pembelian_items_select_admin" ON public.pembelian_items;
CREATE POLICY "pembelian_items_select_admin"
ON public.pembelian_items
FOR SELECT TO authenticated
USING ((SELECT public.is_finance_or_admin()));

-- 2f. pembelian_return & pembelian_return_items
DROP POLICY IF EXISTS "pembelian_return_insert_staff" ON public.pembelian_return;
DROP POLICY IF EXISTS "pembelian_return_select" ON public.pembelian_return;
DROP POLICY IF EXISTS "pembelian_return_select_scoped" ON public.pembelian_return;
DROP POLICY IF EXISTS "pembelian_return_write_scoped" ON public.pembelian_return;
DROP POLICY IF EXISTS "pembelian_return_admin_manage" ON public.pembelian_return;

CREATE POLICY "pembelian_return_select_scoped"
ON public.pembelian_return
FOR SELECT TO authenticated
USING (
    (SELECT public.is_finance_or_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang']))
        AND gudang_id = (SELECT public.get_auth_user_default_gudang())
    )
);

CREATE POLICY "pembelian_return_admin_manage"
ON public.pembelian_return
FOR ALL TO authenticated
USING ((SELECT public.is_finance_or_admin()))
WITH CHECK ((SELECT public.is_finance_or_admin()));

DROP POLICY IF EXISTS "pembelian_return_items_insert_staff" ON public.pembelian_return_items;
DROP POLICY IF EXISTS "pembelian_return_items_select" ON public.pembelian_return_items;
DROP POLICY IF EXISTS "pembelian_return_items_void_update_all_auth" ON public.pembelian_return_items;
DROP POLICY IF EXISTS "pembelian_return_items_select_scoped" ON public.pembelian_return_items;
DROP POLICY IF EXISTS "pembelian_return_items_admin_manage" ON public.pembelian_return_items;

CREATE POLICY "pembelian_return_items_select_scoped"
ON public.pembelian_return_items
FOR SELECT TO authenticated
USING (
    (SELECT public.is_finance_or_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang']))
        AND EXISTS (
            SELECT 1 FROM public.pembelian_return pr
            WHERE pr.id = pembelian_return_items.pembelian_return_id
              AND pr.gudang_id = (SELECT public.get_auth_user_default_gudang())
        )
    )
);

CREATE POLICY "pembelian_return_items_admin_manage"
ON public.pembelian_return_items
FOR ALL TO authenticated
USING ((SELECT public.is_finance_or_admin()))
WITH CHECK ((SELECT public.is_finance_or_admin()));

-- 2g. transfer_stok & transfer_stok_items
DROP POLICY IF EXISTS "transfer_stok_select" ON public.transfer_stok;
DROP POLICY IF EXISTS "transfer_stok_insert" ON public.transfer_stok;
DROP POLICY IF EXISTS "transfer_stok_update" ON public.transfer_stok;
DROP POLICY IF EXISTS "transfer_stok_delete" ON public.transfer_stok;

CREATE POLICY "transfer_stok_select"
ON public.transfer_stok
FOR SELECT TO authenticated
USING (
    (SELECT public.is_finance_or_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang', 'staff_gudang']))
        AND (
            gudang_asal_id = (SELECT public.get_auth_user_default_gudang())
            OR gudang_tujuan_id = (SELECT public.get_auth_user_default_gudang())
        )
    )
);

CREATE POLICY "transfer_stok_insert"
ON public.transfer_stok
FOR INSERT TO authenticated
WITH CHECK (
    (SELECT public.is_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang', 'staff_gudang']))
        AND gudang_asal_id = (SELECT public.get_auth_user_default_gudang())
    )
);

CREATE POLICY "transfer_stok_update"
ON public.transfer_stok
FOR UPDATE TO authenticated
USING (
    (SELECT public.is_admin())
    OR (
        (SELECT public.is_admin_or_lead_warehouse())
        AND (
            gudang_asal_id = (SELECT public.get_auth_user_default_gudang())
            OR gudang_tujuan_id = (SELECT public.get_auth_user_default_gudang())
        )
    )
)
WITH CHECK (
    (SELECT public.is_admin())
    OR (
        (SELECT public.is_admin_or_lead_warehouse())
        AND (
            gudang_asal_id = (SELECT public.get_auth_user_default_gudang())
            OR gudang_tujuan_id = (SELECT public.get_auth_user_default_gudang())
        )
    )
);

CREATE POLICY "transfer_stok_delete"
ON public.transfer_stok
FOR DELETE TO authenticated
USING (
    (SELECT public.is_admin())
    OR (
        (SELECT public.is_admin_or_lead_warehouse())
        AND status::text = 'DRAFT'
        AND gudang_asal_id = (SELECT public.get_auth_user_default_gudang())
    )
);

DROP POLICY IF EXISTS "transfer_items_all_auth" ON public.transfer_stok_items;
DROP POLICY IF EXISTS "transfer_items_write_auth" ON public.transfer_stok_items;
DROP POLICY IF EXISTS "transfer_items_update_auth" ON public.transfer_stok_items;
DROP POLICY IF EXISTS "transfer_items_select" ON public.transfer_stok_items;
DROP POLICY IF EXISTS "transfer_items_insert_scoped" ON public.transfer_stok_items;
DROP POLICY IF EXISTS "transfer_items_update_scoped" ON public.transfer_stok_items;
DROP POLICY IF EXISTS "transfer_items_delete_scoped" ON public.transfer_stok_items;

CREATE POLICY "transfer_items_select"
ON public.transfer_stok_items
FOR SELECT TO authenticated
USING (
    (SELECT public.is_finance_or_admin())
    OR EXISTS (
        SELECT 1 FROM public.transfer_stok ts
        WHERE ts.id = transfer_stok_items.transfer_id
          AND (
              ts.gudang_asal_id = (SELECT public.get_auth_user_default_gudang())
              OR ts.gudang_tujuan_id = (SELECT public.get_auth_user_default_gudang())
          )
    )
);

CREATE POLICY "transfer_items_insert_scoped"
ON public.transfer_stok_items
FOR INSERT TO authenticated
WITH CHECK (
    (SELECT public.is_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang', 'staff_gudang']))
        AND EXISTS (
            SELECT 1 FROM public.transfer_stok ts
            WHERE ts.id = transfer_stok_items.transfer_id
              AND ts.gudang_asal_id = (SELECT public.get_auth_user_default_gudang())
        )
    )
);

CREATE POLICY "transfer_items_update_scoped"
ON public.transfer_stok_items
FOR UPDATE TO authenticated
USING (
    (SELECT public.is_admin())
    OR (
        (SELECT public.is_admin_or_lead_warehouse())
        AND EXISTS (
            SELECT 1 FROM public.transfer_stok ts
            WHERE ts.id = transfer_stok_items.transfer_id
              AND (
                  ts.gudang_asal_id = (SELECT public.get_auth_user_default_gudang())
                  OR ts.gudang_tujuan_id = (SELECT public.get_auth_user_default_gudang())
              )
        )
    )
)
WITH CHECK (
    (SELECT public.is_admin())
    OR (
        (SELECT public.is_admin_or_lead_warehouse())
        AND EXISTS (
            SELECT 1 FROM public.transfer_stok ts
            WHERE ts.id = transfer_stok_items.transfer_id
              AND (
                  ts.gudang_asal_id = (SELECT public.get_auth_user_default_gudang())
                  OR ts.gudang_tujuan_id = (SELECT public.get_auth_user_default_gudang())
              )
        )
    )
);

CREATE POLICY "transfer_items_delete_scoped"
ON public.transfer_stok_items
FOR DELETE TO authenticated
USING (
    (SELECT public.is_admin())
    OR (
        (SELECT public.is_admin_or_lead_warehouse())
        AND EXISTS (
            SELECT 1 FROM public.transfer_stok ts
            WHERE ts.id = transfer_stok_items.transfer_id
              AND ts.status::text = 'DRAFT'
              AND ts.gudang_asal_id = (SELECT public.get_auth_user_default_gudang())
        )
    )
);

-- 2h. pengeluaran_gudang & pengeluaran_gudang_items
DROP POLICY IF EXISTS "pengeluaran_gudang_select" ON public.pengeluaran_gudang;
DROP POLICY IF EXISTS "pengeluaran_gudang_insert" ON public.pengeluaran_gudang;
DROP POLICY IF EXISTS "pengeluaran_gudang_update" ON public.pengeluaran_gudang;
DROP POLICY IF EXISTS "pengeluaran_gudang_delete" ON public.pengeluaran_gudang;

CREATE POLICY "pengeluaran_gudang_select"
ON public.pengeluaran_gudang
FOR SELECT TO authenticated
USING (
    (SELECT public.is_finance_or_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang', 'staff_gudang']))
        AND gudang_id = (SELECT public.get_auth_user_default_gudang())
    )
);

CREATE POLICY "pengeluaran_gudang_insert"
ON public.pengeluaran_gudang
FOR INSERT TO authenticated
WITH CHECK (
    (SELECT public.is_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang', 'staff_gudang']))
        AND gudang_id = (SELECT public.get_auth_user_default_gudang())
    )
);

CREATE POLICY "pengeluaran_gudang_update"
ON public.pengeluaran_gudang
FOR UPDATE TO authenticated
USING (
    (SELECT public.is_admin())
    OR (
        gudang_id = (SELECT public.get_auth_user_default_gudang())
        AND (
            (SELECT public.is_admin_or_lead_warehouse())
            OR (created_by = (SELECT auth.uid()) AND status::text = 'DRAFT')
        )
    )
)
WITH CHECK (
    (SELECT public.is_admin())
    OR (
        gudang_id = (SELECT public.get_auth_user_default_gudang())
        AND (
            (SELECT public.is_admin_or_lead_warehouse())
            OR (created_by = (SELECT auth.uid()) AND status::text = 'DRAFT')
        )
    )
);

CREATE POLICY "pengeluaran_gudang_delete"
ON public.pengeluaran_gudang
FOR DELETE TO authenticated
USING (
    (SELECT public.is_admin())
    OR (
        (SELECT public.is_admin_or_lead_warehouse())
        AND status::text = 'DRAFT'
        AND gudang_id = (SELECT public.get_auth_user_default_gudang())
    )
);

DROP POLICY IF EXISTS "pengeluaran_items_all_auth" ON public.pengeluaran_gudang_items;
DROP POLICY IF EXISTS "pengeluaran_items_select_scoped" ON public.pengeluaran_gudang_items;
DROP POLICY IF EXISTS "pengeluaran_items_write_scoped" ON public.pengeluaran_gudang_items;

CREATE POLICY "pengeluaran_items_select_scoped"
ON public.pengeluaran_gudang_items
FOR SELECT TO authenticated
USING (
    (SELECT public.is_finance_or_admin())
    OR EXISTS (
        SELECT 1 FROM public.pengeluaran_gudang pg
        WHERE pg.id = pengeluaran_gudang_items.pengeluaran_id
          AND pg.gudang_id = (SELECT public.get_auth_user_default_gudang())
    )
);

CREATE POLICY "pengeluaran_items_write_scoped"
ON public.pengeluaran_gudang_items
FOR ALL TO authenticated
USING (
    (SELECT public.is_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang', 'staff_gudang']))
        AND EXISTS (
            SELECT 1 FROM public.pengeluaran_gudang pg
            WHERE pg.id = pengeluaran_gudang_items.pengeluaran_id
              AND pg.gudang_id = (SELECT public.get_auth_user_default_gudang())
        )
    )
)
WITH CHECK (
    (SELECT public.is_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang', 'staff_gudang']))
        AND EXISTS (
            SELECT 1 FROM public.pengeluaran_gudang pg
            WHERE pg.id = pengeluaran_gudang_items.pengeluaran_id
              AND pg.gudang_id = (SELECT public.get_auth_user_default_gudang())
        )
    )
);

-- 2i. print_jobs (C# BackgroundPrintWorker memakai PostgREST + Realtime terikat gudang_id)
DROP POLICY IF EXISTS "Allow authenticated users to delete print jobs" ON public.print_jobs;
DROP POLICY IF EXISTS "Allow authenticated users to insert print jobs" ON public.print_jobs;
DROP POLICY IF EXISTS "Allow authenticated users to read print jobs" ON public.print_jobs;
DROP POLICY IF EXISTS "Allow authenticated users to update print jobs" ON public.print_jobs;
DROP POLICY IF EXISTS "print_jobs_select_scoped" ON public.print_jobs;
DROP POLICY IF EXISTS "print_jobs_insert_scoped" ON public.print_jobs;
DROP POLICY IF EXISTS "print_jobs_update_scoped" ON public.print_jobs;
DROP POLICY IF EXISTS "print_jobs_delete_admin" ON public.print_jobs;

CREATE POLICY "print_jobs_select_scoped"
ON public.print_jobs
FOR SELECT TO authenticated
USING (
    (SELECT public.is_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang', 'staff_gudang', 'kasir']))
        AND gudang_id = (SELECT public.get_auth_user_default_gudang())
    )
);

CREATE POLICY "print_jobs_insert_scoped"
ON public.print_jobs
FOR INSERT TO authenticated
WITH CHECK (
    (SELECT public.is_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang', 'staff_gudang', 'kasir']))
        AND gudang_id = (SELECT public.get_auth_user_default_gudang())
    )
);

CREATE POLICY "print_jobs_update_scoped"
ON public.print_jobs
FOR UPDATE TO authenticated
USING (
    (SELECT public.is_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang', 'staff_gudang', 'kasir']))
        AND gudang_id = (SELECT public.get_auth_user_default_gudang())
    )
)
WITH CHECK (
    (SELECT public.is_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang', 'staff_gudang', 'kasir']))
        AND gudang_id = (SELECT public.get_auth_user_default_gudang())
    )
);

CREATE POLICY "print_jobs_delete_admin"
ON public.print_jobs
FOR DELETE TO authenticated
USING ((SELECT public.is_admin()));

-- 2j. members + guard_members_points_columns trigger (POS daftar & update preferensi struk)
DROP POLICY IF EXISTS "members_all" ON public.members;
DROP POLICY IF EXISTS "members_staff_select" ON public.members;
DROP POLICY IF EXISTS "members_staff_insert" ON public.members;
DROP POLICY IF EXISTS "members_staff_update" ON public.members;
DROP POLICY IF EXISTS "members_admin_delete" ON public.members;

CREATE POLICY "members_staff_select"
ON public.members
FOR SELECT TO authenticated
USING ((SELECT public.has_any_role(ARRAY['admin', 'finance', 'kepala_cabang', 'kepala_gudang', 'kasir'])));

CREATE POLICY "members_staff_insert"
ON public.members
FOR INSERT TO authenticated
WITH CHECK ((SELECT public.has_any_role(ARRAY['admin', 'kepala_cabang', 'kepala_gudang', 'kasir'])));

CREATE POLICY "members_staff_update"
ON public.members
FOR UPDATE TO authenticated
USING ((SELECT public.has_any_role(ARRAY['admin', 'kepala_cabang', 'kepala_gudang', 'kasir'])))
WITH CHECK ((SELECT public.has_any_role(ARRAY['admin', 'kepala_cabang', 'kepala_gudang', 'kasir'])));

CREATE POLICY "members_admin_delete"
ON public.members
FOR DELETE TO authenticated
USING ((SELECT public.is_admin()));

CREATE OR REPLACE FUNCTION public.guard_members_points_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    IF current_setting('role', true) = 'service_role'
       OR current_user IN ('postgres', 'supabase_admin')
       OR (SELECT public.is_admin()) THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF COALESCE(NEW.points, 0) <> 0 OR COALESCE(NEW.tier_points, 0) <> 0 THEN
            RAISE EXCEPTION 'Forbidden: Saldo poin awal member tidak boleh disetel langsung oleh non-admin.';
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.points IS DISTINCT FROM OLD.points
           OR NEW.tier_points IS DISTINCT FROM OLD.tier_points THEN
            RAISE EXCEPTION 'Forbidden: Saldo poin member hanya dapat berubah melalui transaksi atau admin.';
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_members_points_columns() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_guard_members_points_columns'
          AND tgrelid = 'public.members'::regclass
    ) THEN
        CREATE TRIGGER trg_guard_members_points_columns
        BEFORE INSERT OR UPDATE ON public.members
        FOR EACH ROW
        EXECUTE FUNCTION public.guard_members_points_columns();
    END IF;
END $$;

-- 2k. CRM, Loyalty, WA Settings, WA Bridge Status & Receipt Templates
DROP POLICY IF EXISTS "Allow authenticated full access to crm_campaigns" ON public.crm_campaigns;
DROP POLICY IF EXISTS "crm_campaigns_select_auth" ON public.crm_campaigns;
DROP POLICY IF EXISTS "crm_campaigns_admin_write" ON public.crm_campaigns;
CREATE POLICY "crm_campaigns_select_auth" ON public.crm_campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_campaigns_admin_write" ON public.crm_campaigns FOR ALL TO authenticated
    USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Allow authenticated full access to crm_templates" ON public.crm_templates;
DROP POLICY IF EXISTS "crm_templates_select_auth" ON public.crm_templates;
DROP POLICY IF EXISTS "crm_templates_admin_write" ON public.crm_templates;
CREATE POLICY "crm_templates_select_auth" ON public.crm_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_templates_admin_write" ON public.crm_templates FOR ALL TO authenticated
    USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "loyalty_settings_admin_all" ON public.loyalty_settings;
DROP POLICY IF EXISTS "loyalty_settings_admin_write" ON public.loyalty_settings;
CREATE POLICY "loyalty_settings_admin_write" ON public.loyalty_settings FOR ALL TO authenticated
    USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "member_tiers_all" ON public.member_tiers;
DROP POLICY IF EXISTS "member_tiers_select_auth" ON public.member_tiers;
DROP POLICY IF EXISTS "member_tiers_admin_write" ON public.member_tiers;
CREATE POLICY "member_tiers_select_auth" ON public.member_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "member_tiers_admin_write" ON public.member_tiers FOR ALL TO authenticated
    USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "point_rewards_admin_manage" ON public.point_rewards;
DROP POLICY IF EXISTS "point_rewards_select_auth" ON public.point_rewards;
DROP POLICY IF EXISTS "point_rewards_admin_write" ON public.point_rewards;
CREATE POLICY "point_rewards_select_auth" ON public.point_rewards FOR SELECT TO authenticated USING (true);
CREATE POLICY "point_rewards_admin_write" ON public.point_rewards FOR ALL TO authenticated
    USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "member_vouchers_admin_manage" ON public.member_vouchers;
DROP POLICY IF EXISTS "member_vouchers_select_staff" ON public.member_vouchers;
DROP POLICY IF EXISTS "member_vouchers_admin_write" ON public.member_vouchers;
CREATE POLICY "member_vouchers_select_staff" ON public.member_vouchers FOR SELECT TO authenticated
    USING ((SELECT public.has_any_role(ARRAY['admin', 'finance', 'kepala_cabang', 'kepala_gudang', 'kasir'])));
CREATE POLICY "member_vouchers_admin_write" ON public.member_vouchers FOR ALL TO authenticated
    USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Allow authenticated manage wa_settings" ON public.wa_settings;
DROP POLICY IF EXISTS "wa_settings_admin_write" ON public.wa_settings;
CREATE POLICY "wa_settings_admin_write" ON public.wa_settings FOR ALL TO authenticated
    USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Allow authenticated read wa_bridge_status" ON public.wa_bridge_status;
DROP POLICY IF EXISTS "wa_bridge_status_staff_select" ON public.wa_bridge_status;
CREATE POLICY "wa_bridge_status_staff_select" ON public.wa_bridge_status FOR SELECT TO authenticated
    USING ((SELECT public.has_any_role(ARRAY['admin', 'kepala_cabang', 'kepala_gudang', 'kasir'])));

DROP POLICY IF EXISTS "receipt_templates_all_access" ON public.receipt_templates;

-- 2l. Master Inventory, Barcodes, Stocks, Kategori, Shift Sessions & Stock Movements
DROP POLICY IF EXISTS "inventory_insert" ON public.inventory;
DROP POLICY IF EXISTS "inventory_update_allow_stock_purchase" ON public.inventory;
DROP POLICY IF EXISTS "inventory_update_staff" ON public.inventory;
DROP POLICY IF EXISTS "inventory_insert_lead" ON public.inventory;
DROP POLICY IF EXISTS "inventory_update_lead" ON public.inventory;

CREATE POLICY "inventory_insert_lead" ON public.inventory FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.is_admin_or_lead_warehouse()));
CREATE POLICY "inventory_update_lead" ON public.inventory FOR UPDATE TO authenticated
    USING ((SELECT public.is_admin_or_lead_warehouse()))
    WITH CHECK ((SELECT public.is_admin_or_lead_warehouse()));

DROP POLICY IF EXISTS "inventory_barcodes_insert" ON public.inventory_barcodes;
DROP POLICY IF EXISTS "inventory_barcodes_update" ON public.inventory_barcodes;
DROP POLICY IF EXISTS "inventory_barcodes_delete" ON public.inventory_barcodes;
DROP POLICY IF EXISTS "inventory_barcodes_admin_write" ON public.inventory_barcodes;
CREATE POLICY "inventory_barcodes_admin_write" ON public.inventory_barcodes FOR ALL TO authenticated
    USING ((SELECT public.is_admin_or_lead_warehouse()))
    WITH CHECK ((SELECT public.is_admin_or_lead_warehouse()));

DROP POLICY IF EXISTS "inv_stocks_auth_insert" ON public.inventory_stocks;
DROP POLICY IF EXISTS "inv_stocks_insert_scoped" ON public.inventory_stocks;
CREATE POLICY "inv_stocks_insert_scoped" ON public.inventory_stocks FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT public.is_admin())
        OR (
            (SELECT public.is_admin_or_lead_warehouse())
            AND gudang_id = (SELECT public.get_auth_user_default_gudang())
        )
    );

DROP POLICY IF EXISTS "kategori_insert" ON public.kategori;
DROP POLICY IF EXISTS "kategori_insert_lead" ON public.kategori;
CREATE POLICY "kategori_insert_lead" ON public.kategori FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.is_admin_or_lead_warehouse()));

DROP POLICY IF EXISTS "shift_sessions_insert_policy" ON public.shift_sessions;
DROP POLICY IF EXISTS "shift_sessions_select_policy" ON public.shift_sessions;
DROP POLICY IF EXISTS "shift_sessions_update_policy" ON public.shift_sessions;
DROP POLICY IF EXISTS "shift_sessions_select_scoped" ON public.shift_sessions;
DROP POLICY IF EXISTS "shift_sessions_insert_scoped" ON public.shift_sessions;
DROP POLICY IF EXISTS "shift_sessions_update_scoped" ON public.shift_sessions;

CREATE POLICY "shift_sessions_select_scoped"
ON public.shift_sessions
FOR SELECT TO authenticated
USING (
    (SELECT public.is_finance_or_admin())
    OR kasir_id = (SELECT auth.uid())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang', 'kasir']))
        AND gudang_id = (SELECT public.get_auth_user_default_gudang())
    )
);

CREATE POLICY "shift_sessions_insert_scoped"
ON public.shift_sessions
FOR INSERT TO authenticated
WITH CHECK (
    (SELECT public.is_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang', 'kasir']))
        AND kasir_id = (SELECT auth.uid())
        AND gudang_id = (SELECT public.get_auth_user_default_gudang())
    )
);

CREATE POLICY "shift_sessions_update_scoped"
ON public.shift_sessions
FOR UPDATE TO authenticated
USING (
    (SELECT public.is_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang', 'kasir']))
        AND kasir_id = (SELECT auth.uid())
        AND gudang_id = (SELECT public.get_auth_user_default_gudang())
    )
)
WITH CHECK (
    (SELECT public.is_admin())
    OR (
        (SELECT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang', 'kasir']))
        AND kasir_id = (SELECT auth.uid())
        AND gudang_id = (SELECT public.get_auth_user_default_gudang())
    )
);

DROP POLICY IF EXISTS "stock_movements_insert_authenticated" ON public.stock_movements;
DROP POLICY IF EXISTS "stock_movements_insert_lead" ON public.stock_movements;
CREATE POLICY "stock_movements_insert_lead" ON public.stock_movements FOR INSERT TO authenticated
    WITH CHECK ((SELECT public.is_admin_or_lead_warehouse()));

-- ------------------------------------------------------------------------------
-- 3. [DB / Auth] Hardening Storage Buckets & storage.objects Policies
-- ------------------------------------------------------------------------------
UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id IN ('rewards', 'avatars', 'logo');

UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
WHERE id = 'help-docs';

DROP POLICY IF EXISTS "rewards_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "rewards_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "rewards_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "rewards_admin_write" ON storage.objects;

CREATE POLICY "rewards_admin_write"
ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'rewards' AND (SELECT public.is_admin()))
WITH CHECK (bucket_id = 'rewards' AND (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Allow authenticated insert on help-docs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update on help-docs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete on help-docs" ON storage.objects;
DROP POLICY IF EXISTS "help_docs_admin_write" ON storage.objects;

CREATE POLICY "help_docs_admin_write"
ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'help-docs' AND (SELECT public.is_admin()))
WITH CHECK (bucket_id = 'help-docs' AND (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Auth Insert" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;

CREATE POLICY "avatars_owner_insert"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'avatars'
    AND (
        (storage.foldername(name))[1] = (SELECT auth.uid()::text)
        OR (SELECT public.is_admin())
    )
);

CREATE POLICY "avatars_owner_update"
ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'avatars'
    AND (
        (storage.foldername(name))[1] = (SELECT auth.uid()::text)
        OR (SELECT public.is_admin())
    )
)
WITH CHECK (
    bucket_id = 'avatars'
    AND (
        (storage.foldername(name))[1] = (SELECT auth.uid()::text)
        OR (SELECT public.is_admin())
    )
);

-- ------------------------------------------------------------------------------
-- 4. [INT-05] Data Integrity CHECK Constraints (NOT VALID -> VALIDATE)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    -- inventory
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_inventory_stok_nonneg') THEN
        ALTER TABLE public.inventory ADD CONSTRAINT chk_inventory_stok_nonneg CHECK (stok >= 0) NOT VALID;
        ALTER TABLE public.inventory VALIDATE CONSTRAINT chk_inventory_stok_nonneg;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_inventory_harga_jual_nonneg') THEN
        ALTER TABLE public.inventory ADD CONSTRAINT chk_inventory_harga_jual_nonneg CHECK (harga_jual >= 0) NOT VALID;
        ALTER TABLE public.inventory VALIDATE CONSTRAINT chk_inventory_harga_jual_nonneg;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_inventory_harga_beli_terakhir_nonneg') THEN
        ALTER TABLE public.inventory ADD CONSTRAINT chk_inventory_harga_beli_terakhir_nonneg CHECK (harga_beli_terakhir >= 0) NOT VALID;
        ALTER TABLE public.inventory VALIDATE CONSTRAINT chk_inventory_harga_beli_terakhir_nonneg;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_inventory_diskon_nonneg') THEN
        ALTER TABLE public.inventory ADD CONSTRAINT chk_inventory_diskon_nonneg CHECK (diskon >= 0) NOT VALID;
        ALTER TABLE public.inventory VALIDATE CONSTRAINT chk_inventory_diskon_nonneg;
    END IF;

    -- inventory_stocks
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_inventory_stocks_stok_nonneg') THEN
        ALTER TABLE public.inventory_stocks ADD CONSTRAINT chk_inventory_stocks_stok_nonneg CHECK (stok >= 0) NOT VALID;
        ALTER TABLE public.inventory_stocks VALIDATE CONSTRAINT chk_inventory_stocks_stok_nonneg;
    END IF;

    -- pembelian_items
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pembelian_items_qty_pos') THEN
        ALTER TABLE public.pembelian_items ADD CONSTRAINT chk_pembelian_items_qty_pos CHECK (qty > 0) NOT VALID;
        ALTER TABLE public.pembelian_items VALIDATE CONSTRAINT chk_pembelian_items_qty_pos;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pembelian_items_harga_beli_nonneg') THEN
        ALTER TABLE public.pembelian_items ADD CONSTRAINT chk_pembelian_items_harga_beli_nonneg CHECK (harga_beli >= 0) NOT VALID;
        ALTER TABLE public.pembelian_items VALIDATE CONSTRAINT chk_pembelian_items_harga_beli_nonneg;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pembelian_items_diskon_nonneg') THEN
        ALTER TABLE public.pembelian_items ADD CONSTRAINT chk_pembelian_items_diskon_nonneg CHECK (diskon >= 0) NOT VALID;
        ALTER TABLE public.pembelian_items VALIDATE CONSTRAINT chk_pembelian_items_diskon_nonneg;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pembelian_items_harga_final_nonneg') THEN
        ALTER TABLE public.pembelian_items ADD CONSTRAINT chk_pembelian_items_harga_final_nonneg CHECK (harga_final >= 0) NOT VALID;
        ALTER TABLE public.pembelian_items VALIDATE CONSTRAINT chk_pembelian_items_harga_final_nonneg;
    END IF;

    -- penjualan
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_penjualan_total_nonneg') THEN
        ALTER TABLE public.penjualan ADD CONSTRAINT chk_penjualan_total_nonneg CHECK (total >= 0) NOT VALID;
        ALTER TABLE public.penjualan VALIDATE CONSTRAINT chk_penjualan_total_nonneg;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_penjualan_subtotal_nonneg') THEN
        ALTER TABLE public.penjualan ADD CONSTRAINT chk_penjualan_subtotal_nonneg CHECK (subtotal_sebelum_diskon >= 0) NOT VALID;
        ALTER TABLE public.penjualan VALIDATE CONSTRAINT chk_penjualan_subtotal_nonneg;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_penjualan_cash_nonneg') THEN
        ALTER TABLE public.penjualan ADD CONSTRAINT chk_penjualan_cash_nonneg CHECK (cash_amount >= 0) NOT VALID;
        ALTER TABLE public.penjualan VALIDATE CONSTRAINT chk_penjualan_cash_nonneg;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_penjualan_qris_nonneg') THEN
        ALTER TABLE public.penjualan ADD CONSTRAINT chk_penjualan_qris_nonneg CHECK (qris_amount >= 0) NOT VALID;
        ALTER TABLE public.penjualan VALIDATE CONSTRAINT chk_penjualan_qris_nonneg;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_penjualan_kembalian_nonneg') THEN
        ALTER TABLE public.penjualan ADD CONSTRAINT chk_penjualan_kembalian_nonneg CHECK (kembalian >= 0) NOT VALID;
        ALTER TABLE public.penjualan VALIDATE CONSTRAINT chk_penjualan_kembalian_nonneg;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_penjualan_diskon_nom_nonneg') THEN
        ALTER TABLE public.penjualan ADD CONSTRAINT chk_penjualan_diskon_nom_nonneg CHECK (diskon_nominal >= 0) NOT VALID;
        ALTER TABLE public.penjualan VALIDATE CONSTRAINT chk_penjualan_diskon_nom_nonneg;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_penjualan_pts_redeemed_nonneg') THEN
        ALTER TABLE public.penjualan ADD CONSTRAINT chk_penjualan_pts_redeemed_nonneg CHECK (points_redeemed >= 0) NOT VALID;
        ALTER TABLE public.penjualan VALIDATE CONSTRAINT chk_penjualan_pts_redeemed_nonneg;
    END IF;

    -- members
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_members_points_nonneg') THEN
        ALTER TABLE public.members ADD CONSTRAINT chk_members_points_nonneg CHECK (points >= 0) NOT VALID;
        ALTER TABLE public.members VALIDATE CONSTRAINT chk_members_points_nonneg;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_members_tier_points_nonneg') THEN
        ALTER TABLE public.members ADD CONSTRAINT chk_members_tier_points_nonneg CHECK (tier_points >= 0) NOT VALID;
        ALTER TABLE public.members VALIDATE CONSTRAINT chk_members_tier_points_nonneg;
    END IF;

    -- slip_gaji
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_slip_gaji_total_gaji_harian_nonneg') THEN
        ALTER TABLE public.slip_gaji ADD CONSTRAINT chk_slip_gaji_total_gaji_harian_nonneg CHECK (total_gaji_harian >= 0) NOT VALID;
        ALTER TABLE public.slip_gaji VALIDATE CONSTRAINT chk_slip_gaji_total_gaji_harian_nonneg;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_slip_gaji_gaji_bulanan_nonneg') THEN
        ALTER TABLE public.slip_gaji ADD CONSTRAINT chk_slip_gaji_gaji_bulanan_nonneg CHECK (gaji_bulanan >= 0) NOT VALID;
        ALTER TABLE public.slip_gaji VALIDATE CONSTRAINT chk_slip_gaji_gaji_bulanan_nonneg;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_slip_gaji_gaji_bersih_nonneg') THEN
        ALTER TABLE public.slip_gaji ADD CONSTRAINT chk_slip_gaji_gaji_bersih_nonneg CHECK (gaji_bersih >= 0) NOT VALID;
        ALTER TABLE public.slip_gaji VALIDATE CONSTRAINT chk_slip_gaji_gaji_bersih_nonneg;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. Foreign Key Indexes Tersisa
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_member_vouchers_id_reward ON public.member_vouchers(id_reward);
CREATE INDEX IF NOT EXISTS idx_wa_bridge_status_id_gudang ON public.wa_bridge_status(id_gudang);
