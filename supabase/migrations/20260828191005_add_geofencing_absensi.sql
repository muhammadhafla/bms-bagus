-- Create lokasi_kerja table
CREATE TABLE IF NOT EXISTS public.lokasi_kerja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    radius_meter INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for lokasi_kerja
ALTER TABLE public.lokasi_kerja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read active lokasi_kerja"
    ON public.lokasi_kerja FOR SELECT
    USING (is_active = true OR is_admin());

CREATE POLICY "Admins can insert lokasi_kerja"
    ON public.lokasi_kerja FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update lokasi_kerja"
    ON public.lokasi_kerja FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete lokasi_kerja"
    ON public.lokasi_kerja FOR DELETE
    USING (is_admin());

-- Add tracking columns to kehadiran
ALTER TABLE public.kehadiran
ADD COLUMN lat_masuk NUMERIC,
ADD COLUMN lng_masuk NUMERIC,
ADD COLUMN lat_pulang NUMERIC,
ADD COLUMN lng_pulang NUMERIC,
ADD COLUMN lokasi_masuk_id UUID REFERENCES public.lokasi_kerja(id) ON DELETE SET NULL,
ADD COLUMN lokasi_pulang_id UUID REFERENCES public.lokasi_kerja(id) ON DELETE SET NULL;

-- Insert a default store location (e.g. Jakarta Center) so it's not empty
-- (User can update this via admin panel later)
INSERT INTO public.lokasi_kerja (nama, latitude, longitude, radius_meter)
VALUES ('Toko Pusat', -6.200000, 106.816666, 100);

-- Create Haversine distance function in meters
CREATE OR REPLACE FUNCTION public.calculate_distance(
    lat1 NUMERIC, 
    lon1 NUMERIC, 
    lat2 NUMERIC, 
    lon2 NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
    x NUMERIC = 6371000; -- Earth radius in meters
    pi NUMERIC = 3.141592653589793;
    lat1_rad NUMERIC = lat1 * pi / 180;
    lat2_rad NUMERIC = lat2 * pi / 180;
    dlat NUMERIC = (lat2 - lat1) * pi / 180;
    dlon NUMERIC = (lon2 - lon1) * pi / 180;
    a NUMERIC;
    c NUMERIC;
BEGIN
    a = power(sin(dlat / 2), 2) + cos(lat1_rad) * cos(lat2_rad) * power(sin(dlon / 2), 2);
    c = 2 * atan2(sqrt(a), sqrt(1 - a));
    RETURN x * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create RPC for Absen Masuk with GPS
CREATE OR REPLACE FUNCTION public.absen_masuk_with_gps(
    p_user_id UUID,
    p_status_hadir VARCHAR,
    p_lat NUMERIC,
    p_lng NUMERIC
) RETURNS public.kehadiran AS $$
DECLARE
    v_lokasi RECORD;
    v_closest_lokasi_id UUID;
    v_closest_distance NUMERIC := 9999999;
    v_distance NUMERIC;
    v_kehadiran public.kehadiran;
BEGIN
    -- Find if the coords are within any active location
    FOR v_lokasi IN SELECT * FROM public.lokasi_kerja WHERE is_active = true LOOP
        v_distance := public.calculate_distance(p_lat, p_lng, v_lokasi.latitude, v_lokasi.longitude);
        IF v_distance <= v_lokasi.radius_meter AND v_distance < v_closest_distance THEN
            v_closest_distance := v_distance;
            v_closest_lokasi_id := v_lokasi.id;
        END IF;
    END LOOP;

    -- If not inside any radius, reject
    IF v_closest_lokasi_id IS NULL THEN
        RAISE EXCEPTION 'Koordinat berada di luar jangkauan seluruh toko/cabang.';
    END IF;

    -- Insert record
    INSERT INTO public.kehadiran (
        user_id, 
        tanggal, 
        waktu_masuk, 
        status_hadir, 
        lat_masuk, 
        lng_masuk, 
        lokasi_masuk_id
    ) VALUES (
        p_user_id, 
        CURRENT_DATE, 
        now(), 
        p_status_hadir, 
        p_lat, 
        p_lng, 
        v_closest_lokasi_id
    ) RETURNING * INTO v_kehadiran;

    RETURN v_kehadiran;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RPC for Absen Pulang with GPS
CREATE OR REPLACE FUNCTION public.absen_pulang_with_gps(
    p_kehadiran_id UUID,
    p_menit_kerja INTEGER,
    p_menit_telat INTEGER,
    p_menit_lembur INTEGER,
    p_lat NUMERIC,
    p_lng NUMERIC
) RETURNS public.kehadiran AS $$
DECLARE
    v_lokasi RECORD;
    v_closest_lokasi_id UUID;
    v_closest_distance NUMERIC := 9999999;
    v_distance NUMERIC;
    v_kehadiran public.kehadiran;
    v_is_lembur BOOLEAN;
    v_status_lembur VARCHAR;
BEGIN
    -- Find if the coords are within any active location
    FOR v_lokasi IN SELECT * FROM public.lokasi_kerja WHERE is_active = true LOOP
        v_distance := public.calculate_distance(p_lat, p_lng, v_lokasi.latitude, v_lokasi.longitude);
        IF v_distance <= v_lokasi.radius_meter AND v_distance < v_closest_distance THEN
            v_closest_distance := v_distance;
            v_closest_lokasi_id := v_lokasi.id;
        END IF;
    END LOOP;

    -- If not inside any radius, reject
    IF v_closest_lokasi_id IS NULL THEN
        RAISE EXCEPTION 'Koordinat berada di luar jangkauan seluruh toko/cabang.';
    END IF;

    -- Compute lembur
    v_is_lembur := p_menit_lembur > 30;
    IF v_is_lembur THEN
        v_status_lembur := 'pending';
    ELSE
        v_status_lembur := 'tidak_ada';
    END IF;

    -- Update record
    UPDATE public.kehadiran SET
        waktu_pulang = now(),
        menit_kerja = p_menit_kerja,
        menit_telat = CASE WHEN p_menit_telat > 30 THEN p_menit_telat ELSE 0 END,
        menit_lembur_aktual = p_menit_lembur,
        status_lembur = v_status_lembur,
        lat_pulang = p_lat,
        lng_pulang = p_lng,
        lokasi_pulang_id = v_closest_lokasi_id
    WHERE id = p_kehadiran_id
    RETURNING * INTO v_kehadiran;

    RETURN v_kehadiran;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
