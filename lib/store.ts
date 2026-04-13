import { create } from 'zustand';
import { InventoryItem } from '@/types/inventory';

interface CartItem extends InventoryItem {
  qty: number;
  harga_final: number;
  subtotal: number;
}

interface PembelianStore {
  items: CartItem[];
  supplierId: string | null;
  tanggal: string;
  totalSupplier: number;
  
  addItem: (item: InventoryItem) => void;
  updateQty: (index: number, qty: number) => void;
  updateHargaBeli: (index: number, harga: number) => void;
  removeItem: (index: number) => void;
  setSupplier: (id: string | null) => void;
  setTanggal: (tanggal: string) => void;
  setTotalSupplier: (total: number) => void;
  reset: () => void;
  
  getTotalSistem: () => number;
  getSelisih: () => number;
}

export const usePembelianStore = create<PembelianStore>((set, get) => ({
  items: [],
  supplierId: null,
  tanggal: new Date().toISOString().split('T')[0],
  totalSupplier: 0,

  addItem: (item) => set((state) => {
    const existingIndex = state.items.findIndex(
      i => i.id === item.id && 
           i.harga_beli === item.harga_beli && 
           i.diskon === item.diskon
    );

    if (existingIndex >= 0) {
      const newItems = [...state.items];
      newItems[existingIndex].qty += 1;
      newItems[existingIndex].subtotal = 
        newItems[existingIndex].qty * newItems[existingIndex].harga_final;
      return { items: newItems };
    }

    const harga_final = (item.harga_beli || 0) - item.diskon;
    const newItem: CartItem = {
      ...item,
      qty: 1,
      harga_final,
      subtotal: harga_final,
    };

    return { items: [...state.items, newItem] };
  }),

  updateQty: (index, qty) => set((state) => {
    if (qty <= 0) {
      return { items: state.items.filter((_, i) => i !== index) };
    }
    const newItems = [...state.items];
    newItems[index].qty = qty;
    newItems[index].subtotal = qty * newItems[index].harga_final;
    return { items: newItems };
  }),

  updateHargaBeli: (index, harga) => set((state) => {
    const newItems = [...state.items];
    newItems[index].harga_beli = harga;
    newItems[index].harga_final = harga - newItems[index].diskon;
    newItems[index].subtotal = newItems[index].qty * newItems[index].harga_final;
    return { items: newItems };
  }),

  removeItem: (index) => set((state) => ({
    items: state.items.filter((_, i) => i !== index)
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
}));
