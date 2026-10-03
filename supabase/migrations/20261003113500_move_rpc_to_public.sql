-- Migrate all warehouse RPC functions from `rpc` schema to `public` schema
-- because supabase-js client's `.rpc()` method defaults to `public` schema
-- and they were throwing "Could not find the function public.<name> in the schema cache".

ALTER FUNCTION rpc.kirim_transfer_stok(uuid, uuid) SET SCHEMA public;
ALTER FUNCTION rpc.terima_transfer_stok(uuid, jsonb, uuid) SET SCHEMA public;
ALTER FUNCTION rpc.execute_pengeluaran_gudang(uuid, tipe_pengeluaran_gudang, text, jsonb, uuid) SET SCHEMA public;
ALTER FUNCTION rpc.execute_pengeluaran_gudang(uuid, tipe_pengeluaran_gudang, text, jsonb, uuid, boolean) SET SCHEMA public;
ALTER FUNCTION rpc.approve_pengeluaran_gudang(uuid, uuid) SET SCHEMA public;
ALTER FUNCTION rpc.reject_pengeluaran_gudang(uuid, text, uuid) SET SCHEMA public;
ALTER FUNCTION rpc.update_stock_bin(uuid, uuid, text, integer, integer) SET SCHEMA public;
