import { z } from 'zod';

export const inventoryItemSchema = z.object({
  nama_barang: z.string().min(1, 'Nama barang wajib diisi'),
  barcode: z.string().optional(),
  kategori: z.string().optional(),
});

export const inventoryUpdateSchema = z.object({
  harga_jual: z.number().min(0, 'Harga jual tidak boleh negatif').optional(),
  diskon: z.number().min(0, 'Diskon tidak boleh negatif').optional(),
  minimum_stock: z.number().int('Minimal stock harus bilangan bulat').min(0, 'Minimal stock tidak boleh negatif').optional(),
});

export const pembelianItemSchema = z.object({
  inventory_id: z.string().min(1, 'Inventory ID wajib diisi'),
  barcode: z.string(),
  nama_barang: z.string(),
  qty: z.number().int('Qty harus bilangan bulat').min(1, 'Qty minimal 1'),
  harga_beli: z.number().min(0, 'Harga beli tidak boleh negatif'),
  diskon: z.number().min(0, 'Diskon tidak boleh negatif').optional(),
  harga_final: z.number().min(0, 'Harga final tidak boleh negatif'),
  subtotal: z.number().min(0, 'Subtotal tidak boleh negatif'),
});

export const pembelianSubmitSchema = z.object({
  supplier_id: z.string().nullable(),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  items: z.array(pembelianItemSchema).min(1, 'Minimal 1 item'),
  total_supplier: z.number().min(0, 'Total supplier tidak boleh negatif'),
});

export const penjualanItemSchema = z.object({
  inventory_id: z.string().min(1, 'Inventory ID wajib diisi'),
  barcode: z.string(),
  nama_barang: z.string(),
  qty: z.number().int('Qty harus bilangan bulat').min(1, 'Qty minimal 1'),
  harga_jual: z.number().min(0, 'Harga jual tidak boleh negatif'),
  diskon: z.number().min(0, 'Diskon tidak boleh negatif').optional(),
  harga_final: z.number().min(0, 'Harga final tidak boleh negatif'),
  subtotal: z.number().min(0, 'Subtotal tidak boleh negatif'),
});

export const penjualanSubmitSchema = z.object({
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  items: z.array(penjualanItemSchema).min(1, 'Minimal 1 item'),
});

export const supplierSchema = z.object({
  nama: z.string().min(1, 'Nama supplier wajib diisi'),
  alamat: z.string().optional(),
  telepon: z.string().optional(),
});

export const receiptTemplateSchema = z.object({
  name: z.string().min(1, 'Nama template wajib diisi'),
  header_text: z.string().optional(),
  footer_text: z.string().optional(),
  is_active: z.boolean().optional(),
});

export function validateInventoryItem(data: unknown) {
  return inventoryItemSchema.safeParse(data);
}

export function validateInventoryUpdate(data: unknown) {
  return inventoryUpdateSchema.safeParse(data);
}

export function validatePembelianSubmit(data: unknown) {
  return pembelianSubmitSchema.safeParse(data);
}

export function validatePenjualanSubmit(data: unknown) {
  return penjualanSubmitSchema.safeParse(data);
}

export function validateSupplier(data: unknown) {
  return supplierSchema.safeParse(data);
}

export function validateReceiptTemplate(data: unknown) {
  return receiptTemplateSchema.safeParse(data);
}