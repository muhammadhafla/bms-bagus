import { describe, it, expect } from 'vitest';
import {
  inventoryItemSchema,
  inventoryUpdateSchema,
  pembelianItemSchema,
  pembelianSubmitSchema,
  penjualanItemSchema,
  penjualanSubmitSchema,
  supplierSchema,
  receiptTemplateSchema,
  validateInventoryItem,
  validateInventoryUpdate,
  validatePembelianSubmit,
  validatePenjualanSubmit,
  validateSupplier,
  validateReceiptTemplate,
} from './validation';

describe('inventoryItemSchema', () => {
  it('should validate valid inventory item', () => {
    const data = { nama_barang: 'Test Item' };
    const result = inventoryItemSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should validate with barcode', () => {
    const data = { nama_barang: 'Test Item', barcode: 'ABC123' };
    const result = inventoryItemSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should validate with kategori', () => {
    const data = { nama_barang: 'Test Item', kategori: 'Electronics' };
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
  it('should validate valid update', () => {
    const data = { harga_jual: 100000, diskon: 10, minimum_stock: 5 };
    const result = inventoryUpdateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should validate negative harga_jual', () => {
    const data = { harga_jual: -100 };
    const result = inventoryUpdateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should validate negative diskon', () => {
    const data = { diskon: -50 };
    const result = inventoryUpdateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should validate negative minimum_stock', () => {
    const data = { minimum_stock: -1 };
    const result = inventoryUpdateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should validate non-integer minimum_stock', () => {
    const data = { minimum_stock: 1.5 };
    const result = inventoryUpdateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should allow diskon in any amount', () => {
    const data = { diskon: 150 };
    const result = inventoryUpdateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should allow optional fields', () => {
    const data = {};
    const result = inventoryUpdateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe('pembelianItemSchema', () => {
  it('should validate valid purchase item', () => {
    const data = {
      inventory_id: '123',
      barcode: 'ABC123',
      nama_barang: 'Test Item',
      qty: 10,
      harga_beli: 50000,
      harga_final: 45000,
      subtotal: 450000,
    };
    const result = pembelianItemSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject empty inventory_id', () => {
    const data = {
      inventory_id: '',
      barcode: 'ABC123',
      nama_barang: 'Test Item',
      qty: 10,
      harga_beli: 50000,
      harga_final: 45000,
      subtotal: 450000,
    };
    const result = pembelianItemSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject qty less than 1', () => {
    const data = {
      inventory_id: '123',
      barcode: 'ABC123',
      nama_barang: 'Test Item',
      qty: 0,
      harga_beli: 50000,
      harga_final: 45000,
      subtotal: 450000,
    };
    const result = pembelianItemSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject negative harga_beli', () => {
    const data = {
      inventory_id: '123',
      barcode: 'ABC123',
      nama_barang: 'Test Item',
      qty: 10,
      harga_beli: -50000,
      harga_final: 45000,
      subtotal: 450000,
    };
    const result = pembelianItemSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should allow optional diskon', () => {
    const data = {
      inventory_id: '123',
      barcode: 'ABC123',
      nama_barang: 'Test Item',
      qty: 10,
      harga_beli: 50000,
      diskon: 5000,
      harga_final: 45000,
      subtotal: 450000,
    };
    const result = pembelianItemSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe('pembelianSubmitSchema', () => {
  it('should validate valid purchase submission', () => {
    const data = {
      supplier_id: 'sup-123',
      tanggal: '2024-01-01',
      items: [
        {
          inventory_id: '123',
          barcode: 'ABC123',
          nama_barang: 'Test Item',
          qty: 10,
          harga_beli: 50000,
          harga_final: 45000,
          subtotal: 450000,
        },
      ],
      total_supplier: 450000,
    };
    const result = pembelianSubmitSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should allow null supplier_id', () => {
    const data = {
      supplier_id: null,
      tanggal: '2024-01-01',
      items: [
        {
          inventory_id: '123',
          barcode: 'ABC123',
          nama_barang: 'Test Item',
          qty: 10,
          harga_beli: 50000,
          harga_final: 45000,
          subtotal: 450000,
        },
      ],
      total_supplier: 450000,
    };
    const result = pembelianSubmitSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject empty items array', () => {
    const data = {
      supplier_id: 'sup-123',
      tanggal: '2024-01-01',
      items: [],
      total_supplier: 0,
    };
    const result = pembelianSubmitSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject empty tanggal', () => {
    const data = {
      supplier_id: 'sup-123',
      tanggal: '',
      items: [
        {
          inventory_id: '123',
          barcode: 'ABC123',
          nama_barang: 'Test Item',
          qty: 10,
          harga_beli: 50000,
          harga_final: 45000,
          subtotal: 450000,
        },
      ],
      total_supplier: 450000,
    };
    const result = pembelianSubmitSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('penjualanItemSchema', () => {
  it('should validate valid sales item', () => {
    const data = {
      inventory_id: '123',
      barcode: 'ABC123',
      nama_barang: 'Test Item',
      qty: 5,
      harga_jual: 100000,
      harga_final: 90000,
      subtotal: 450000,
    };
    const result = penjualanItemSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject qty less than 1', () => {
    const data = {
      inventory_id: '123',
      barcode: 'ABC123',
      nama_barang: 'Test Item',
      qty: 0,
      harga_jual: 100000,
      harga_final: 90000,
      subtotal: 450000,
    };
    const result = penjualanItemSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject negative harga_jual', () => {
    const data = {
      inventory_id: '123',
      barcode: 'ABC123',
      nama_barang: 'Test Item',
      qty: 5,
      harga_jual: -100000,
      harga_final: 90000,
      subtotal: 450000,
    };
    const result = penjualanItemSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('penjualanSubmitSchema', () => {
  it('should validate valid sales submission', () => {
    const data = {
      tanggal: '2024-01-01',
      items: [
        {
          inventory_id: '123',
          barcode: 'ABC123',
          nama_barang: 'Test Item',
          qty: 5,
          harga_jual: 100000,
          harga_final: 90000,
          subtotal: 450000,
        },
      ],
    };
    const result = penjualanSubmitSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject empty items array', () => {
    const data = {
      tanggal: '2024-01-01',
      items: [],
    };
    const result = penjualanSubmitSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('supplierSchema', () => {
  it('should validate valid supplier', () => {
    const data = { nama: 'Supplier ABC' };
    const result = supplierSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should validate with optional fields', () => {
    const data = { nama: 'Supplier ABC', alamat: 'Jl. Test', telepon: '081234567890' };
    const result = supplierSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject empty supplier name', () => {
    const data = { nama: '' };
    const result = supplierSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('receiptTemplateSchema', () => {
  it('should validate valid template', () => {
    const data = { name: 'Template 1', header_text: 'Header', footer_text: 'Footer' };
    const result = receiptTemplateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should allow optional fields', () => {
    const data = { name: 'Template 1', is_active: true };
    const result = receiptTemplateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should validate empty name', () => {
    const data = { name: '' };
    const result = receiptTemplateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('validateInventoryItem', () => {
  it('should return success for valid data', () => {
    const result = validateInventoryItem({ nama_barang: 'Test' });
    expect(result.success).toBe(true);
  });

  it('should return error for invalid data', () => {
    const result = validateInventoryItem({ nama_barang: '' });
    expect(result.success).toBe(false);
  });
});

describe('validateInventoryUpdate', () => {
  it('should return success for valid data', () => {
    const result = validateInventoryUpdate({ harga_jual: 100000 });
    expect(result.success).toBe(true);
  });
});

describe('validatePembelianSubmit', () => {
  it('should return success for valid data', () => {
    const result = validatePembelianSubmit({
      supplier_id: null,
      tanggal: '2024-01-01',
      items: [
        {
          inventory_id: '123',
          barcode: 'ABC123',
          nama_barang: 'Test',
          qty: 1,
          harga_beli: 100000,
          harga_final: 100000,
          subtotal: 100000,
        },
      ],
      total_supplier: 100000,
    });
    expect(result.success).toBe(true);
  });
});

describe('validatePenjualanSubmit', () => {
  it('should return success for valid data', () => {
    const result = validatePenjualanSubmit({
      tanggal: '2024-01-01',
      items: [
        {
          inventory_id: '123',
          barcode: 'ABC123',
          nama_barang: 'Test',
          qty: 1,
          harga_jual: 100000,
          harga_final: 100000,
          subtotal: 100000,
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('validateSupplier', () => {
  it('should return success for valid data', () => {
    const result = validateSupplier({ nama: 'Supplier ABC' });
    expect(result.success).toBe(true);
  });
});

describe('validateReceiptTemplate', () => {
  it('should return success for valid data', () => {
    const result = validateReceiptTemplate({ name: 'Template 1' });
    expect(result.success).toBe(true);
  });
});