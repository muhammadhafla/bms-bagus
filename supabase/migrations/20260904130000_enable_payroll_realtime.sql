-- Enable Realtime for kehadiran and payroll_mutasi
ALTER TABLE kehadiran REPLICA IDENTITY FULL;
ALTER TABLE payroll_mutasi REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'kehadiran'
    ) THEN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE kehadiran';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'payroll_mutasi'
    ) THEN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE payroll_mutasi';
    END IF;
END
$$;
