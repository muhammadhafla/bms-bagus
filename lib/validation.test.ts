import { describe, it, expect } from 'vitest';
import {
  inventoryItemSchema,
  inventoryUpdateSchema,
  supplierSchema,
} from './validation';

describe('inventoryItemSchema', () => {
  it('should validate valid inventory item', () => {
    const data = { nama_barang: 'Test Item' };
    const result = inventoryItemSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject empty nama_barang', () => {
    const data = { nama_barang: '' };
    const result = inventoryItemSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('inventoryUpdateSchema', () => {
  it('should validate negative harga_jual', () => {
    const data = { harga_jual: -100 };
    const result = inventoryUpdateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should validate valid diskon', () => {
    const data = { diskon: 50 };
    const result = inventoryUpdateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject diskon over 100%', () => {
    const data = { diskon: 150 };
    const result = inventoryUpdateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('supplierSchema', () => {
  it('should validate valid supplier', () => {
    const data = { nama: 'Supplier ABC' };
    const result = supplierSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject empty supplier name', () => {
    const data = { nama: '' };
    const result = supplierSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});