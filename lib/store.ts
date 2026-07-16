import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { InventoryItem } from '@/types/inventory';

export interface CartItem extends InventoryItem {
  qty: number;
  harga_final: number;
  subtotal: number;
}

interface PembelianStore {
  items: CartItem[];
  supplierId: string | null;
  tanggal: string;
  totalSupplier: number;
  
  addItem: (item: InventoryItem, initialQty?: number) => void;
  updateQty: (id: string, qty: number) => void;
  updateHargaBeli: (id: string, harga: number) => void;
  updateHargaJual: (id: string, harga: number) => void;
  removeItem: (id: string) => void;
  setSupplier: (id: string | null) => void;
  setTanggal: (tanggal: string) => void;
  setTotalSupplier: (total: number) => void;
  reset: () => void;
  
  getTotalSistem: () => number;
  getSelisih: () => number;
}

export const usePembelianStore = create<PembelianStore>()(
  persist(
    (set, get) => ({
  items: [],
  supplierId: null,
  tanggal: new Date().toISOString().split('T')[0],
  totalSupplier: 0,

  addItem: (item, initialQty = 1) => set((state) => {
    const existingIndex = state.items.findIndex(
      i => i.id === item.id && 
           i.harga_beli === item.harga_beli
    );

    if (existingIndex >= 0) {
      return {
        items: state.items.map((item, i) =>
          i === existingIndex
            ? { ...item, qty: item.qty + initialQty, subtotal: (item.qty + initialQty) * item.harga_final }
            : item
        )
      };
    }

    const harga_final = item.harga_beli || 0;
    const newItem: CartItem = {
      ...item,
      qty: initialQty,
      harga_final,
      subtotal: harga_final * initialQty,
    };

    return { items: [...state.items, newItem] };
  }),

  updateQty: (id, qty) => set((state) => {
    if (qty <= 0) {
      return { items: state.items.filter(item => item.id !== id) };
    }
    return {
      items: state.items.map(item =>
        item.id === id ? { ...item, qty, subtotal: qty * item.harga_final } : item
      )
    };
  }),

  updateHargaBeli: (id, harga) => set((state) => {
    return {
      items: state.items.map(item => {
        if (item.id !== id) return item;
        const harga_final = harga;
        return { ...item, harga_beli: harga, harga_final, subtotal: item.qty * harga_final };
      })
    };
  }),

  updateHargaJual: (id, harga) => set((state) => {
    return {
      items: state.items.map(item => {
        if (item.id !== id) return item;
        return { ...item, harga_jual: harga };
      })
    };
  }),

  removeItem: (id) => set((state) => ({
    items: state.items.filter(item => item.id !== id)
  })),

  setSupplier: (id) => set({ supplierId: id }),
  setTanggal: (tanggal) => set({ tanggal }),
  setTotalSupplier: (total) => set({ totalSupplier: total }),

  reset: () => set({
    items: [],
    supplierId: null,
    tanggal: new Date().toISOString().split('T')[0],
    totalSupplier: 0,
  }),

  getTotalSistem: () => {
    return get().items.reduce((sum, item) => sum + item.subtotal, 0);
  },

  getSelisih: () => {
    return get().totalSupplier - get().getTotalSistem();
  },
}),
  {
    name: 'pembelian-draft-storage',
  }
));

export interface PrintItem extends InventoryItem {
  qty: number;
}

interface BulkPrintStore {
  items: PrintItem[];
  
  addItem: (item: InventoryItem, initialQty?: number) => void;
  updateQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  reset: () => void;
}

export const useBulkPrintStore = create<BulkPrintStore>((set) => ({
  items: [],

  addItem: (item, initialQty = 1) => set((state) => {
    const existingIndex = state.items.findIndex(i => i.id === item.id);

    if (existingIndex >= 0) {
      return {
        items: state.items.map((item, i) =>
          i === existingIndex
            ? { ...item, qty: item.qty + initialQty }
            : item
        )
      };
    }

    const newItem: PrintItem = {
      ...item,
      qty: initialQty,
    };

    return { items: [...state.items, newItem] };
  }),

  updateQty: (id, qty) => set((state) => {
    if (qty <= 0) {
      return { items: state.items.filter(item => item.id !== id) };
    }
    return {
      items: state.items.map(item =>
        item.id === id ? { ...item, qty } : item
      )
    };
  }),

  removeItem: (id) => set((state) => ({
    items: state.items.filter(item => item.id !== id)
  })),

  reset: () => set({
    items: [],
  }),
}));

