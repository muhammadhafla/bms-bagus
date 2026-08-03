-- Table: promosi
CREATE TABLE IF NOT EXISTS public.promosi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,
    tanggal_mulai TIMESTAMPTZ NOT NULL,
    tanggal_selesai TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Table: promosi_items
CREATE TABLE IF NOT EXISTS public.promosi_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promosi_id UUID NOT NULL REFERENCES public.promosi(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
    diskon_nominal NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (promosi_id, inventory_id)
);

-- Enable RLS
ALTER TABLE public.promosi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promosi_items ENABLE ROW LEVEL SECURITY;

-- Policies: promosi
CREATE POLICY "Enable read access for all authenticated users" 
ON public.promosi FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for admin users" 
ON public.promosi FOR ALL 
USING (public.is_admin());

-- Policies: promosi_items
CREATE POLICY "Enable read access for all authenticated users" 
ON public.promosi_items FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for admin users" 
ON public.promosi_items FOR ALL 
USING (public.is_admin());

-- (Trigger omitted, updated_at will be handled by the application)
