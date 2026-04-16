-- Migration: Tambahkan kolom voided_at pada tabel pembelian_return_items
-- Tanggal: 2026-04-16

ALTER TABLE public.pembelian_return_items
ADD COLUMN IF NOT EXISTS voided_at timestamptz;

CREATE INDEX IF NOT EXISTS pembelian_return_items_voided_at_idx
ON public.pembelian_return_items(voided_at);

CREATE POLICY "pembelian_return_items_void_update_all_auth" 
ON public.pembelian_return_items
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);


CREATE OR REPLACE FUNCTION public.void_pembelian_return_item(
  p_pembelian_return_item_id uuid,
  p_note text DEFAULT NULL,
  p_created_by uuid DEFAULT auth.uid()
)
RETURNS TABLE(void_return_item_id uuid)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_inventory_id uuid;
  v_qty int;
  v_now timestamptz := now();
  v_already_voided boolean;
BEGIN
  SELECT pri.inventory_id, pri.qty,
         (pri.voided_at IS NOT NULL) AS already_voided
  INTO v_inventory_id, v_qty, v_already_voided
  FROM public.pembelian_return_items pri
  WHERE pri.id = p_pembelian_return_item_id
  FOR UPDATE;

  IF v_inventory_id IS NULL THEN
    RAISE EXCEPTION 'pembelian_return_items % tidak ditemukan', p_pembelian_return_item_id;
  END IF;

  IF v_already_voided THEN
    RETURN QUERY SELECT p_pembelian_return_item_id;
    RETURN;
  END IF;

  -- lock inventory row agar stok update atomic
  PERFORM 1
  FROM public.inventory
  WHERE id = v_inventory_id
  FOR UPDATE;

  UPDATE public.pembelian_return_items
  SET voided_at = v_now
  WHERE id = p_pembelian_return_item_id;

  -- koreksi stok: void -> tambah balik qty
  UPDATE public.inventory
  SET stok = stok + v_qty,
      updated_at = v_now,
      updated_by = p_created_by
  WHERE id = v_inventory_id;

  INSERT INTO public.stock_movements (
    inventory_id,
    tipe,
    qty,
    referensi,
    created_at
  ) VALUES (
    v_inventory_id,
    'IN',
    v_qty,
    'VOID_RETURN_ITEM:' || p_pembelian_return_item_id::text,
    v_now
  );

  RETURN QUERY SELECT p_pembelian_return_item_id;
END;
$$;