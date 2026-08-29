-- ==========================================================
-- Migration: 20260830110000_pembelian_gudang_sync.sql
-- Description: Menghubungkan Pembelian dengan Gudang Target
-- ==========================================================

-- 1. Tambah kolom gudang_id ke tabel pembelian jika belum ada
ALTER TABLE public.pembelian ADD COLUMN IF NOT EXISTS gudang_id UUID REFERENCES public.gudang(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pembelian_gudang_id ON public.pembelian(gudang_id);

-- 2. Trigger auto-update inventory_stocks saat pembelian_items ditambahkan
CREATE OR REPLACE FUNCTION public.sync_pembelian_item_to_gudang()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_gudang_id UUID;
BEGIN
    -- Ambil gudang_id dari header pembelian
    SELECT gudang_id INTO v_gudang_id
    FROM public.pembelian
    WHERE id = NEW.pembelian_id;

    -- Jika tidak dispesifikasikan di pembelian, fallback ke gudang default (Pusat)
    IF v_gudang_id IS NULL THEN
        SELECT id INTO v_gudang_id
        FROM public.gudang
        WHERE is_default = true
        LIMIT 1;
    END IF;

    IF v_gudang_id IS NOT NULL AND NEW.qty > 0 THEN
        INSERT INTO public.inventory_stocks (inventory_id, gudang_id, stok, updated_at)
        VALUES (NEW.inventory_id, v_gudang_id, NEW.qty, now())
        ON CONFLICT (inventory_id, gudang_id)
        DO UPDATE SET stok = public.inventory_stocks.stok + NEW.qty,
                      updated_at = now();

        -- Update stock_movements reference to include gudang_id
        UPDATE public.stock_movements
        SET gudang_id = v_gudang_id
        WHERE referensi = NEW.pembelian_id::TEXT AND inventory_id = NEW.inventory_id AND gudang_id IS NULL;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_pembelian_item_to_gudang ON public.pembelian_items;
CREATE TRIGGER trg_sync_pembelian_item_to_gudang
  AFTER INSERT ON public.pembelian_items
  FOR EACH ROW EXECUTE PROCEDURE public.sync_pembelian_item_to_gudang();
