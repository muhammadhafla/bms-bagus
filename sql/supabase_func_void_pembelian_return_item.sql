CREATE OR REPLACE FUNCTION public.void_pembelian_return_item(
  p_pembelian_return_item_id uuid,
  p_note text default null,
  p_created_by uuid default auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_item record;
  v_now timestamptz := now();
BEGIN
  -- Lock baris untuk update
  SELECT * INTO v_item
  FROM public.pembelian_return_items
  WHERE id = p_pembelian_return_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item pembelian return tidak ditemukan';
  END IF;

  -- Idempotent: jika sudah void, return tanpa error
  IF v_item.voided_at IS NOT NULL THEN
    RETURN v_item.id;
  END IF;

  -- Update status void
  UPDATE public.pembelian_return_items
  SET 
    voided_at = v_now,
    updated_by = p_created_by
  WHERE id = p_pembelian_return_item_id;

  -- Koreksi stok: kembalikan qty ke inventory
  UPDATE public.inventory
  SET 
    stok = stok + v_item.qty,
    updated_at = v_now,
    updated_by = p_created_by
  WHERE id = v_item.inventory_id;

  -- Catat pergerakan stok
  INSERT INTO public.stock_movements (
    inventory_id,
    tipe,
    qty,
    referensi,
    note,
    created_at,
    created_by
  ) VALUES (
    v_item.inventory_id,
    'IN',
    v_item.qty,
    'VOID_RETURN_ITEM:' || v_item.id::text,
    p_note,
    v_now,
    p_created_by
  );

  RETURN v_item.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.void_pembelian_return_item(uuid, text, uuid) TO authenticated;
