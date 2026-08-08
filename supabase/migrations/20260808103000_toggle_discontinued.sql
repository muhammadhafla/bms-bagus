-- Migration to add atomic toggle_discontinued RPC

CREATE OR REPLACE FUNCTION toggle_discontinued(p_id uuid, p_user uuid)
RETURNS SETOF inventory AS $$
  UPDATE inventory
  SET is_discontinued = NOT is_discontinued,
      discontinued_at = CASE WHEN NOT is_discontinued THEN NOW() ELSE NULL END,
      discontinued_by = CASE WHEN NOT is_discontinued THEN p_user ELSE NULL END,
      updated_by = p_user,
      updated_at = NOW()
  WHERE id = p_id
  RETURNING *;
$$ LANGUAGE sql SECURITY DEFINER;
