-- Fix foreign key so PostgREST can join profiles
ALTER TABLE public.payroll_mutasi
  DROP CONSTRAINT IF EXISTS payroll_mutasi_user_id_fkey,
  ADD CONSTRAINT payroll_mutasi_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update view to always return a row per user
CREATE OR REPLACE VIEW public.vw_payroll_saldo AS
SELECT
    p.id as user_id,
    COALESCE(SUM(CASE WHEN m.jenis = 'kredit' AND m.status = 'disetujui' THEN m.nominal ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN m.jenis = 'debit' AND m.status = 'disetujui' THEN m.nominal ELSE 0 END), 0) AS total_saldo
FROM
    public.profiles p
LEFT JOIN
    public.payroll_mutasi m ON p.id = m.user_id
GROUP BY
    p.id;

ALTER VIEW public.vw_payroll_saldo SET (security_invoker = true);
