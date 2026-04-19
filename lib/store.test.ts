import { describe, it, expect, beforeEach } from 'vitest';
import { usePembelianStore } from './store';
import { InventoryItem } from '@/types/inventory';

const createMockItem = (overrides = {}): InventoryItem => ({
  id: 'inv-1',
  nama_barang: 'Test Item',
  kode_barcode: 'TEST001',
  stok: 100,
  harga_beli: 50000,
  harga_jual: 75000,
  diskon: 0,
  minimum_stock: 10,
  unit: 'pcs',
  kategori: { id: 'cat-1', nama: 'Test' },
  ...overrides,
});

const getStore = () => usePembelianStore.getState();

describe('usePembelianStore', () => {
  beforeEach(() => {
    getStore().reset();
  });

  describe('addItem', () => {
    it('should add new item to empty cart', () => {
      const item = createMockItem();
      getStore().addItem(item);
      const store = getStore();

      expect(store.items).toHaveLength(1);
      expect(store.items[0].qty).toBe(1);
    });

    it('should increment qty for existing item with same price', () => {
      const item = createMockItem({ id: 'inv-1', harga_beli: 50000, diskon: 0 });
      getStore().addItem(item);
      getStore().addItem(item);
      const store = getStore();

      expect(store.items).toHaveLength(1);
      expect(store.items[0].qty).toBe(2);
    });

    it('should add as new item for different price', () => {
      const item1 = createMockItem({ id: 'inv-1', harga_beli: 50000, diskon: 0 });
      const item2 = createMockItem({ id: 'inv-1', harga_beli: 40000, diskon: 0 });
      getStore().addItem(item1);
      getStore().addItem(item2);
      const store = getStore();

      expect(store.items).toHaveLength(2);
    });

    it('should add as new item for different diskon', () => {
      const item1 = createMockItem({ id: 'inv-1', harga_beli: 50000, diskon: 0 });
      const item2 = createMockItem({ id: 'inv-1', harga_beli: 50000, diskon: 5000 });
      getStore().addItem(item1);
      getStore().addItem(item2);
      const store = getStore();

      expect(store.items).toHaveLength(2);
    });
  });

  describe('updateQty', () => {
    it('should update qty for existing item', () => {
      const item = createMockItem();
      getStore().addItem(item);

      getStore().updateQty(0, 5);
      const store = getStore();

      expect(store.items[0].qty).toBe(5);
      expect(store.items[0].subtotal).toBe(5 * 50000);
    });

    it('should remove item when qty is 0', () => {
      const item = createMockItem();
      getStore().addItem(item);

      getStore().updateQty(0, 0);
      const store = getStore();

      expect(store.items).toHaveLength(0);
    });

    it('should remove item when qty is negative', () => {
      const item = createMockItem();
      getStore().addItem(item);

      getStore().updateQty(0, -1);
      const store = getStore();

      expect(store.items).toHaveLength(0);
    });
  });

  describe('updateHargaBeli', () => {
    it('should update harga_beli and recalculate harga_final', () => {
      const item = createMockItem({ diskon: 10000 });
      getStore().addItem(item);

      getStore().updateHargaBeli(0, 60000);
      const store = getStore();

      expect(store.items[0].harga_beli).toBe(60000);
      expect(store.items[0].harga_final).toBe(50000);
    });

    it('should update subtotal after price change', () => {
      const item = createMockItem();
      getStore().addItem(item);

      getStore().updateHargaBeli(0, 40000);
      const store = getStore();

      expect(store.items[0].subtotal).toBe(40000);
    });
  });

  describe('removeItem', () => {
    it('should remove item by index', () => {
      const item = createMockItem();
      getStore().addItem(item);

      getStore().removeItem(0);
      const store = getStore();

      expect(store.items).toHaveLength(0);
    });

    it('should not affect other items', () => {
      getStore().addItem(createMockItem({ id: '1' }));
      getStore().addItem(createMockItem({ id: '2' }));

      getStore().removeItem(0);
      const store = getStore();

      expect(store.items).toHaveLength(1);
    });
  });

  describe('setSupplier', () => {
    it('should set supplier id', () => {
      getStore().setSupplier('sup-123');
      const store = getStore();

      expect(store.supplierId).toBe('sup-123');
    });

    it('should allow null supplier', () => {
      getStore().setSupplier('sup-123');
      getStore().setSupplier(null);
      const store = getStore();

      expect(store.supplierId).toBeNull();
    });
  });

  describe('setTanggal', () => {
    it('should set tanggal', () => {
      getStore().setTanggal('2024-12-31');
      const store = getStore();

      expect(store.tanggal).toBe('2024-12-31');
    });
  });

  describe('setTotalSupplier', () => {
    it('should set totalSupplier', () => {
      getStore().setTotalSupplier(500000);
      const store = getStore();

      expect(store.totalSupplier).toBe(500000);
    });
  });

  describe('reset', () => {
    it('should clear all items', () => {
      getStore().addItem(createMockItem());
      getStore().addItem(createMockItem({ id: '2' }));

      getStore().reset();
      const store = getStore();

      expect(store.items).toHaveLength(0);
    });

    it('should reset supplier and tanggal', () => {
      getStore().setSupplier('sup-123');
      getStore().setTotalSupplier(100000);

      getStore().reset();
      const store = getStore();

      expect(store.supplierId).toBeNull();
      expect(store.totalSupplier).toBe(0);
    });
  });

  describe('getTotalSistem', () => {
    it('should calculate total of all items', () => {
      getStore().addItem(createMockItem({ id: '1', harga_beli: 10000, diskon: 0 }));
      getStore().addItem(createMockItem({ id: '2', harga_beli: 20000, diskon: 0 }));

      const total = getStore().getTotalSistem();

      expect(total).toBe(30000);
    });

    it('should return 0 for empty cart', () => {
      const total = getStore().getTotalSistem();

      expect(total).toBe(0);
    });
  });

  describe('getSelisih', () => {
    it('should calculate difference between supplier total and system total', () => {
      getStore().addItem(createMockItem({ harga_beli: 50000, diskon: 0 }));
      getStore().setTotalSupplier(100000);

      const selisih = getStore().getSelisih();

      expect(selisih).toBe(50000);
    });

    it('should return negative when system total is higher', () => {
      getStore().addItem(createMockItem({ harga_beli: 70000, diskon: 0 }));
      getStore().setTotalSupplier(50000);

      const selisih = getStore().getSelisih();

      expect(selisih).toBe(-20000);
    });
  });
});