import { supabase } from './client';
import { safeQuery } from './utils';
import {
  Gudang,
  InventoryStock,
  WarehouseItemStock,
  TransferStok,
  StatusTransfer,
  PengeluaranGudang,
  TipePengeluaranGudang,
  WarehouseSummary,
} from '@/types/warehouse';

export const gudangApi = {
  async getAll(options?: { activeOnly?: boolean }) {
    return safeQuery<Gudang[]>(async () => {
      let query = supabase
        .from('gudang')
        .select('*')
        .order('is_default', { ascending: false })
        .order('nama', { ascending: true });

      if (options?.activeOnly) {
        query = query.eq('is_active', true);
      }

      const result = await query;
      return { data: result.data as Gudang[] | null, error: result.error as Error | null };
    });
  },

  async getDefault() {
    return safeQuery<Gudang>(async () => {
      const result = await supabase
        .from('gudang')
        .select('*')
        .eq('is_default', true)
        .limit(1)
        .maybeSingle();

      return { data: result.data as Gudang | null, error: result.error as Error | null };
    });
  },

  async getById(id: string) {
    return safeQuery<Gudang>(async () => {
      const result = await supabase.from('gudang').select('*').eq('id', id).single();
      return { data: result.data as Gudang | null, error: result.error as Error | null };
    });
  },

  async create(data: {
    kode_gudang: string;
    nama: string;
    tipe: 'PUSAT' | 'CABANG' | 'RETUR' | 'TRANSIT';
    alamat?: string | null;
    penanggung_jawab?: string | null;
    kontak_pj?: string | null;
    lokasi_kerja_id?: string | null;
    is_active?: boolean;
    is_default?: boolean;
  }) {
    return safeQuery<Gudang>(async () => {
      const result = await supabase.from('gudang').insert(data).select().single();
      return { data: result.data as Gudang | null, error: result.error as Error | null };
    });
  },

  async update(
    id: string,
    data: Partial<{
      kode_gudang: string;
      nama: string;
      tipe: 'PUSAT' | 'CABANG' | 'RETUR' | 'TRANSIT';
      alamat: string | null;
      penanggung_jawab: string | null;
      kontak_pj: string | null;
      lokasi_kerja_id: string | null;
      is_active: boolean;
      is_default: boolean;
    }>,
  ) {
    return safeQuery<Gudang>(async () => {
      const result = await supabase.from('gudang').update(data).eq('id', id).select().single();
      return { data: result.data as Gudang | null, error: result.error as Error | null };
    });
  },

  async delete(id: string) {
    return safeQuery<void>(async () => {
      const result = await supabase.from('gudang').delete().eq('id', id);
      return { data: undefined, error: result.error as Error | null };
    });
  },
};

export const warehouseStockApi = {
  async getStocksByGudang(
    gudangId: string,
    options?: {
      search?: string;
      categoryId?: string;
      stockStatus?: 'all' | 'low' | 'empty' | 'available';
      rakStatus?: 'all' | 'assigned' | 'unassigned';
      lowStockOnly?: boolean;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    },
  ) {
    return safeQuery<{ data: WarehouseItemStock[]; count: number }>(async () => {
      const page = Math.max(1, options?.page || 1);
      const limit = Math.min(100, Math.max(1, options?.limit || 20));
      const offset = (page - 1) * limit;

      const hasCategoryFilter = !!options?.categoryId;
      const hasSearch = !!options?.search?.trim();
      const inventoryJoin = (hasCategoryFilter || hasSearch)
        ? `inventory:inventory_id!inner (`
        : `inventory:inventory_id (`;

      let query = supabase
        .from('inventory_stocks')
        .select(
          `
          id,
          stok,
          min_stok,
          max_stok,
          rak_lokasi,
          ${inventoryJoin}
            id,
            nama_barang,
            kode_barcode,
            harga_beli_terakhir,
            harga_jual,
            unit,
            stok,
            is_discontinued,
            id_kategori:id_kategori (
              id,
              nama
            )
          )
        `,
          { count: 'exact' },
        )
        .eq('gudang_id', gudangId);

      if (options?.categoryId) {
        query = query.eq('inventory.id_kategori', options.categoryId);
      }

      if (options?.stockStatus === 'low' || options?.lowStockOnly) {
        query = query.lte('stok', 5);
      } else if (options?.stockStatus === 'empty') {
        query = query.eq('stok', 0);
      } else if (options?.stockStatus === 'available') {
        query = query.gt('stok', 0);
      }

      if (options?.rakStatus === 'unassigned') {
        query = query.or('rak_lokasi.is.null,rak_lokasi.eq.');
      } else if (options?.rakStatus === 'assigned') {
        query = query.not('rak_lokasi', 'is', null).neq('rak_lokasi', '');
      }

      if (hasSearch) {
        const safeSearch = options!.search!.trim().replace(/%/g, '').toLowerCase();
        // Search inside joined inventory table (case-insensitive name or barcode)
        query = query.or(
          `nama_barang.ilike.%${safeSearch}%,kode_barcode.ilike.%${safeSearch}%`,
          { foreignTable: 'inventory' },
        );
      }

      const sortBy = options?.sortBy || 'updated_at';
      const isAsc = options?.sortDir === 'asc';

      if (sortBy === 'nama_barang') {
        query = query.order('nama_barang', { foreignTable: 'inventory', ascending: isAsc });
      } else if (['stok', 'rak_lokasi', 'created_at', 'updated_at'].includes(sortBy)) {
        query = query.order(sortBy, { ascending: isAsc, nullsFirst: !isAsc });
      } else {
        query = query.order('updated_at', { ascending: false });
      }

      query = query.range(offset, offset + limit - 1);

      const res = await query;

      if (res.error) {
        return { data: { data: [], count: 0 }, error: res.error as Error | null };
      }

      const rows: WarehouseItemStock[] = (res.data || [])
        .filter((row: any) => row.inventory && !row.inventory.is_discontinued)
        .map((row: any) => ({
          inventory_id: row.inventory.id,
          nama_barang: row.inventory.nama_barang,
          kode_barcode: row.inventory.kode_barcode,
          harga_beli_terakhir: row.inventory.harga_beli_terakhir,
          harga_jual: row.inventory.harga_jual,
          unit: row.inventory.unit,
          id_kategori: row.inventory.id_kategori,
          stok_gudang: row.stok,
          min_stok: row.min_stok ?? 0,
          max_stok: row.max_stok,
          rak_lokasi: row.rak_lokasi,
          stok_global: row.inventory.stok ?? 0,
        }));

      return {
        data: { data: rows, count: res.count || rows.length },
        error: null,
      };
    });
  },

  async updateStockBin(
    inventoryId: string,
    gudangId: string,
    data: { rak_lokasi?: string | null; min_stok?: number; max_stok?: number | null },
  ) {
    return safeQuery<InventoryStock>(async () => {
      const result = await supabase.rpc('update_stock_bin', {
        p_inventory_id: inventoryId,
        p_gudang_id: gudangId,
        p_rak_lokasi: data.rak_lokasi || null,
        p_min_stok: data.min_stok !== undefined ? Number(data.min_stok) : null,
        p_max_stok: data.max_stok !== undefined && data.max_stok !== null ? Number(data.max_stok) : null,
      });

      return { data: result.data as InventoryStock | null, error: result.error as Error | null };
    });
  },

  async getStockByItem(inventoryId: string) {
    return safeQuery<InventoryStock[]>(async () => {
      const result = await supabase
        .from('inventory_stocks')
        .select('*, gudang:gudang_id(*)')
        .eq('inventory_id', inventoryId)
        .order('created_at', { ascending: true });

      return { data: result.data as InventoryStock[] | null, error: result.error as Error | null };
    });
  },

  async getSummary() {
    return safeQuery<WarehouseSummary>(async () => {
      // 1. Total gudang
      const { count: gudangCount } = await supabase
        .from('gudang')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // 2. Total items
      const { count: itemCount } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('is_discontinued', false);

      // 3. Sum stocks per warehouse
      const { data: stocks } = await supabase.from('inventory_stocks').select('gudang_id, stok');

      const { data: gudangList } = await supabase.from('gudang').select('id, tipe');

      let stokPusat = 0;
      let stokCabang = 0;
      const pusatIds = new Set(
        (gudangList || []).filter((g) => g.tipe === 'PUSAT').map((g) => g.id),
      );

      (stocks || []).forEach((s) => {
        if (pusatIds.has(s.gudang_id)) {
          stokPusat += s.stok || 0;
        } else {
          stokCabang += s.stok || 0;
        }
      });

      // 4. In transit transfers
      const { count: inTransitCount } = await supabase
        .from('transfer_stok')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'IN_TRANSIT');

      // 5. Low stock count
      const { count: lowStockCount } = await supabase
        .from('inventory_stocks')
        .select('*', { count: 'exact', head: true })
        .lte('stok', 3);

      return {
        data: {
          total_gudang: gudangCount || 0,
          total_item_unique: itemCount || 0,
          total_stok_pusat: stokPusat,
          total_stok_cabang: stokCabang,
          total_transfer_in_transit: inTransitCount || 0,
          total_low_stock_items: lowStockCount || 0,
        },
        error: null,
      };
    });
  },
};

export const transferStokApi = {
  async getAll(options?: {
    status?: StatusTransfer;
    gudangId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    return safeQuery<{ data: TransferStok[]; count: number }>(async () => {
      const page = Math.max(1, options?.page || 1);
      const limit = Math.min(100, Math.max(1, options?.limit || 20));
      const offset = (page - 1) * limit;

      let query = supabase
        .from('transfer_stok')
        .select(
          `
          *,
          gudang_asal:gudang_asal_id ( id, kode_gudang, nama, tipe ),
          gudang_tujuan:gudang_tujuan_id ( id, kode_gudang, nama, tipe ),
          created_by_profile:created_by ( id, nama ),
          approved_by_profile:approved_by ( id, nama ),
          received_by_profile:received_by ( id, nama ),
          items:transfer_stok_items (
            id,
            qty_kirim,
            qty_terima,
            inventory:inventory_id (
              id,
              nama_barang,
              kode_barcode
            )
          )
        `,
          { count: 'exact' },
        )
        .order('created_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.gudangId) {
        query = query.or(
          `gudang_asal_id.eq.${options.gudangId},gudang_tujuan_id.eq.${options.gudangId}`,
        );
      }

      if (options?.startDate) {
        query = query.gte('created_at', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('created_at', options.endDate);
      }

      if (options?.search) {
        const safeSearch = options.search.trim();
        query = query.or(
          `nomor_transfer.ilike.%${safeSearch}%,kurir_pengirim.ilike.%${safeSearch}%`,
        );
      }

      query = query.range(offset, offset + limit - 1);

      const res = await query;

      if (res.error) {
        return { data: { data: [], count: 0 }, error: res.error as Error | null };
      }

      const transfers: TransferStok[] = (res.data || []).map((t: any) => {
        const items = t.items || [];
        const total_items = items.length;
        const total_qty_kirim = items.reduce((acc: number, it: any) => acc + (it.qty_kirim || 0), 0);
        const total_qty_terima = items.reduce(
          (acc: number, it: any) => acc + (it.qty_terima || 0),
          0,
        );

        return {
          ...t,
          total_items,
          total_qty_kirim,
          total_qty_terima,
        };
      });

      return {
        data: { data: transfers, count: res.count || transfers.length },
        error: null,
      };
    });
  },

  async getById(id: string) {
    return safeQuery<TransferStok>(async () => {
      const result = await supabase
        .from('transfer_stok')
        .select(
          `
          *,
          gudang_asal:gudang_asal_id ( id, kode_gudang, nama, tipe, alamat, penanggung_jawab ),
          gudang_tujuan:gudang_tujuan_id ( id, kode_gudang, nama, tipe, alamat, penanggung_jawab ),
          created_by_profile:created_by ( id, nama ),
          approved_by_profile:approved_by ( id, nama ),
          received_by_profile:received_by ( id, nama ),
          items:transfer_stok_items (
            id,
            inventory_id,
            qty_kirim,
            qty_terima,
            catatan,
            inventory:inventory_id (
              id,
              nama_barang,
              kode_barcode,
              unit,
              harga_beli_terakhir,
              harga_jual
            )
          )
        `,
        )
        .eq('id', id)
        .single();

      if (result.error) {
        return { data: null, error: result.error as Error | null };
      }

      const t = result.data as any;
      const items = t.items || [];
      const total_items = items.length;
      const total_qty_kirim = items.reduce((acc: number, it: any) => acc + (it.qty_kirim || 0), 0);
      const total_qty_terima = items.reduce(
        (acc: number, it: any) => acc + (it.qty_terima || 0),
        0,
      );

      return {
        data: {
          ...t,
          total_items,
          total_qty_kirim,
          total_qty_terima,
        } as TransferStok,
        error: null,
      };
    });
  },

  async create(
    data: {
      gudang_asal_id: string;
      gudang_tujuan_id: string;
      kurir_pengirim?: string | null;
      catatan?: string | null;
      autoKirim?: boolean;
      items: Array<{
        inventory_id: string;
        qty_kirim: number;
        catatan?: string | null;
      }>;
    },
    userId?: string,
  ) {
    return safeQuery<TransferStok>(async () => {
      // 1. Generate nomor transfer
      const { data: nomorData, error: nomorError } = await supabase.rpc('generate_nomor_transfer');
      if (nomorError) throw nomorError;

      const nomorTransfer = nomorData || `TRF/${Date.now()}`;

      // 2. Insert Header
      const { data: header, error: headerError } = await supabase
        .from('transfer_stok')
        .insert({
          nomor_transfer: nomorTransfer,
          gudang_asal_id: data.gudang_asal_id,
          gudang_tujuan_id: data.gudang_tujuan_id,
          kurir_pengirim: data.kurir_pengirim,
          catatan: data.catatan,
          status: 'DRAFT',
          created_by: userId || null,
        })
        .select()
        .single();

      if (headerError || !header) throw headerError;

      // 3. Insert Items
      const itemRows = data.items.map((it) => ({
        transfer_id: header.id,
        inventory_id: it.inventory_id,
        qty_kirim: it.qty_kirim,
        qty_terima: 0,
        catatan: it.catatan,
      }));

      const { error: itemsError } = await supabase.from('transfer_stok_items').insert(itemRows);
      if (itemsError) throw itemsError;

      // 4. Auto kirim jika diminta
      if (data.autoKirim && userId) {
        const { error: kirimError } = await supabase.rpc('kirim_transfer_stok', {
          p_transfer_id: header.id,
          p_user: userId,
        });
        if (kirimError) throw kirimError;
      }

      return { data: header as TransferStok, error: null };
    });
  },

  async kirim(transferId: string, userId: string) {
    return safeQuery<{ success: boolean; status: string }>(async () => {
      const result = await supabase.rpc('kirim_transfer_stok', {
        p_transfer_id: transferId,
        p_user: userId,
      });

      return {
        data: result.data as { success: boolean; status: string } | null,
        error: result.error as Error | null,
      };
    });
  },

  async terima(
    transferId: string,
    items: Array<{ inventory_id: string; qty_terima: number; catatan?: string }>,
    userId: string,
  ) {
    return safeQuery<{ success: boolean; status: string }>(async () => {
      const result = await supabase.rpc('terima_transfer_stok', {
        p_transfer_id: transferId,
        p_items: items,
        p_user: userId,
      });

      return {
        data: result.data as { success: boolean; status: string } | null,
        error: result.error as Error | null,
      };
    });
  },

  async cancel(transferId: string, catatan?: string) {
    return safeQuery<void>(async () => {
      const result = await supabase
        .from('transfer_stok')
        .update({
          status: 'CANCELED',
          catatan: catatan ? `Dibatalkan: ${catatan}` : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transferId)
        .eq('status', 'DRAFT');

      return { data: undefined, error: result.error as Error | null };
    });
  },
};

export const pengeluaranGudangApi = {
  async getAll(options?: {
    gudangId?: string;
    tipe?: TipePengeluaranGudang;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    return safeQuery<{ data: PengeluaranGudang[]; count: number }>(async () => {
      const page = Math.max(1, options?.page || 1);
      const limit = Math.min(100, Math.max(1, options?.limit || 20));
      const offset = (page - 1) * limit;

      let query = supabase
        .from('pengeluaran_gudang')
        .select(
          `
          *,
          gudang:gudang_id ( id, kode_gudang, nama, tipe ),
          created_by_profile:created_by ( id, nama ),
          approved_by_profile:approved_by ( id, nama ),
          items:pengeluaran_gudang_items (
            id,
            qty,
            harga_pokok,
            alasan,
            inventory:inventory_id (
              id,
              nama_barang,
              kode_barcode,
              unit
            )
          )
        `,
          { count: 'exact' },
        )
        .order('created_at', { ascending: false });

      if (options?.gudangId) {
        query = query.eq('gudang_id', options.gudangId);
      }

      if (options?.tipe) {
        query = query.eq('tipe', options.tipe);
      }

      if (options?.status && options.status !== 'ALL') {
        query = query.eq('status', options.status);
      }

      if (options?.startDate) {
        query = query.gte('tanggal', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('tanggal', options.endDate);
      }

      query = query.range(offset, offset + limit - 1);

      const res = await query;

      if (res.error) {
        return { data: { data: [], count: 0 }, error: res.error as Error | null };
      }

      const rows: PengeluaranGudang[] = (res.data || []).map((p: any) => {
        const items = p.items || [];
        const total_items = items.length;
        const total_qty = items.reduce((acc: number, it: any) => acc + (it.qty || 0), 0);
        const total_nominal = items.reduce(
          (acc: number, it: any) => acc + (it.qty || 0) * (it.harga_pokok || 0),
          0,
        );

        return {
          ...p,
          total_items,
          total_qty,
          total_nominal,
        };
      });

      return {
        data: { data: rows, count: res.count || rows.length },
        error: null,
      };
    });
  },

  async create(
    data: {
      gudang_id: string;
      tipe: TipePengeluaranGudang;
      catatan?: string | null;
      autoApprove?: boolean;
      items: Array<{
        inventory_id: string;
        qty: number;
        harga_pokok?: number;
        alasan?: string | null;
      }>;
    },
    userId?: string,
  ) {
    return safeQuery<string>(async () => {
      const result = await supabase.rpc('execute_pengeluaran_gudang', {
        p_gudang_id: data.gudang_id,
        p_tipe: data.tipe,
        p_catatan: data.catatan || '',
        p_items: data.items,
        p_user: userId || null,
        p_auto_approve: !!data.autoApprove,
      });

      return { data: result.data as string | null, error: result.error as Error | null };
    });
  },

  async approve(pengeluaranId: string, userId: string) {
    return safeQuery<{ success: boolean; status: string }>(async () => {
      const result = await supabase.rpc('approve_pengeluaran_gudang', {
        p_pengeluaran_id: pengeluaranId,
        p_user: userId,
      });

      return {
        data: result.data as { success: boolean; status: string } | null,
        error: result.error as Error | null,
      };
    });
  },

  async reject(pengeluaranId: string, note: string, userId: string) {
    return safeQuery<{ success: boolean; status: string }>(async () => {
      const result = await supabase.rpc('reject_pengeluaran_gudang', {
        p_pengeluaran_id: pengeluaranId,
        p_note: note || 'Ditolak oleh admin/supervisor',
        p_user: userId,
      });

      return {
        data: result.data as { success: boolean; status: string } | null,
        error: result.error as Error | null,
      };
    });
  },
};
