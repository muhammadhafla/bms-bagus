-- ==============================================================================
-- MIGRATION ARCHIVE: 20261108134258_add_ota_system_config_policy.sql
-- DESKRIPSI:
--   Snapshot historis migrasi remote `20261108134258_add_ota_system_config_policy`
--   agar riwayat Git sinkron dengan `supabase_migrations.schema_migrations`.
--   CATATAN KEAMANAN: Policy `system_config_authenticated_read_ota` di bawah ini
--   telah resmi dicabut pada migrasi `20261124090000_fase0a_profiles_secrets_pulang_awal_trigger.sql`
--   ([SEC-02]) sehingga tabel `public.system_config` hanya dapat dibaca oleh admin.
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'system_config'
      AND policyname = 'system_config_authenticated_read_ota'
  ) THEN
    CREATE POLICY "system_config_authenticated_read_ota"
    ON public.system_config
    FOR SELECT
    TO authenticated
    USING (key LIKE 'github_%' OR key LIKE 'ota_%');
  END IF;
END $$;
