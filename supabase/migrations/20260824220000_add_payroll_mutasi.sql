-- Create the new ledger table
CREATE TYPE payroll_mutasi_jenis AS ENUM ('kredit', 'debit');
CREATE TYPE payroll_mutasi_kategori AS ENUM ('gaji', 'kasbon', 'pencairan', 'lainnya');
CREATE TYPE payroll_mutasi_status AS ENUM ('pending', 'disetujui', 'ditolak');

CREATE TABLE public.payroll_mutasi (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tanggal TIMESTAMPTZ NOT NULL DEFAULT now(),
    jenis payroll_mutasi_jenis NOT NULL,
    kategori payroll_mutasi_kategori NOT NULL,
    nominal NUMERIC NOT NULL CHECK (nominal >= 0),
    keterangan TEXT,
    status payroll_mutasi_status NOT NULL DEFAULT 'disetujui',
    referensi_id UUID, -- Can link to kasbon_id or slip_gaji_id if needed
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for payroll_mutasi
ALTER TABLE public.payroll_mutasi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mutasi"
    ON public.payroll_mutasi
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pending mutasi (kasbon)"
    ON public.payroll_mutasi
    FOR INSERT
    WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins have full access to payroll_mutasi"
    ON public.payroll_mutasi
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- View to calculate current saldo
CREATE OR REPLACE VIEW public.vw_payroll_saldo AS
SELECT
    user_id,
    COALESCE(SUM(CASE WHEN jenis = 'kredit' AND status = 'disetujui' THEN nominal ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN jenis = 'debit' AND status = 'disetujui' THEN nominal ELSE 0 END), 0) AS total_saldo
FROM
    public.payroll_mutasi
GROUP BY
    user_id;

-- Ensure view is accessible to authenticated users
GRANT SELECT ON public.vw_payroll_saldo TO authenticated;

-- Add updated_at trigger
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.payroll_mutasi 
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
