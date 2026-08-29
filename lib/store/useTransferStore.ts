import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TransferCartItem {
  inventory_id: string;
  nama_barang: string;
  kode_barcode: string;
  unit: string;
  stok_tersedia: number;
  qty_kirim: number;
  catatan: string;
  rak_lokasi?: string | null;
}

interface TransferStore {
  items: TransferCartItem[];
  gudangAsalId: string;
  gudangTujuanId: string;
  kurir: string;
  catatan: string;
  tanggalKirim: string;
  highlightedItemId: string | null;

  setGudangAsalId: (id: string) => void;
  setGudangTujuanId: (id: string) => void;
  setKurir: (kurir: string) => void;
  setCatatan: (catatan: string) => void;
  setTanggalKirim: (date: string) => void;
  setHighlightedItemId: (id: string | null) => void;

  addItem: (item: Omit<TransferCartItem, 'qty_kirim' | 'catatan'> & { qty_kirim?: number; catatan?: string }) => { added: boolean; isIncremented: boolean; message?: string };
  updateQty: (inventory_id: string, qty: number) => void;
  updateCatatan: (inventory_id: string, catatan: string) => void;
  removeItem: (inventory_id: string) => void;
  reset: () => void;
  clearItemsOnly: () => void;

  getTotalItems: () => number;
  getTotalQty: () => number;
}

export const useTransferStore = create<TransferStore>()(
  persist(
    (set, get) => ({
      items: [],
      gudangAsalId: '',
      gudangTujuanId: '',
      kurir: '',
      catatan: '',
      tanggalKirim: new Date().toISOString().split('T')[0],
      highlightedItemId: null,

      setGudangAsalId: (id: string) => set({ gudangAsalId: id }),
      setGudangTujuanId: (id: string) => set({ gudangTujuanId: id }),
      setKurir: (kurir: string) => set({ kurir }),
      setCatatan: (catatan: string) => set({ catatan }),
      setTanggalKirim: (tanggalKirim: string) => set({ tanggalKirim }),
      setHighlightedItemId: (id: string | null) => set({ highlightedItemId: id }),

      addItem: (newItem) => {
        const state = get();
        const existingIndex = state.items.findIndex(
          (i) => i.inventory_id === newItem.inventory_id,
        );

        if (existingIndex >= 0) {
          const existingItem = state.items[existingIndex];
          const newQty = existingItem.qty_kirim + (newItem.qty_kirim || 1);

          if (newQty > existingItem.stok_tersedia) {
            set({ highlightedItemId: existingItem.inventory_id });
            return {
              added: false,
              isIncremented: false,
              message: `Stok tidak mencukupi (Maks: ${existingItem.stok_tersedia} ${existingItem.unit || 'pcs'})`,
            };
          }

          const updatedItems = [...state.items];
          updatedItems[existingIndex] = {
            ...existingItem,
            qty_kirim: newQty,
          };

          set({
            items: updatedItems,
            highlightedItemId: existingItem.inventory_id,
          });

          return { added: true, isIncremented: true };
        }

        if (newItem.stok_tersedia <= 0) {
          return {
            added: false,
            isIncremented: false,
            message: `Stok barang di gudang pengirim kosong`,
          };
        }

        const initialQty = Math.min(newItem.qty_kirim || 1, newItem.stok_tersedia);
        const itemToAdd: TransferCartItem = {
          inventory_id: newItem.inventory_id,
          nama_barang: newItem.nama_barang,
          kode_barcode: newItem.kode_barcode,
          unit: newItem.unit || 'pcs',
          stok_tersedia: newItem.stok_tersedia,
          qty_kirim: initialQty,
          catatan: newItem.catatan || '',
          rak_lokasi: newItem.rak_lokasi || null,
        };

        set({
          items: [...state.items, itemToAdd],
          highlightedItemId: newItem.inventory_id,
        });

        return { added: true, isIncremented: false };
      },

      updateQty: (inventory_id: string, qty: number) => {
        set((state) => {
          if (qty <= 0) {
            return { items: state.items.filter((item) => item.inventory_id !== inventory_id) };
          }
          return {
            items: state.items.map((item) => {
              if (item.inventory_id !== inventory_id) return item;
              const validatedQty = Math.min(qty, item.stok_tersedia);
              return { ...item, qty_kirim: validatedQty };
            }),
          };
        });
      },

      updateCatatan: (inventory_id: string, catatan: string) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.inventory_id === inventory_id ? { ...item, catatan } : item,
          ),
        }));
      },

      removeItem: (inventory_id: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.inventory_id !== inventory_id),
        }));
      },

      reset: () => {
        set({
          items: [],
          kurir: '',
          catatan: '',
          tanggalKirim: new Date().toISOString().split('T')[0],
          highlightedItemId: null,
        });
      },

      clearItemsOnly: () => {
        set({
          items: [],
          highlightedItemId: null,
        });
      },

      getTotalItems: () => get().items.length,
      getTotalQty: () => get().items.reduce((acc, it) => acc + (it.qty_kirim || 0), 0),
    }),
    {
      name: 'transfer-stok-draft-storage',
    },
  ),
);
