import { z } from 'zod';

export const inventoryItemSchema = z.object({
  nama_barang: z
    .string()
    .trim()
    .min(1, 'Nama barang wajib diisi')
    .max(255, 'Nama barang maksimal 255 karakter'),
  kode_barcode: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
  id_kategori: z.uuid('Format kategori ID tidak valid').optional(),
  kategori: z.string().trim().optional(),
  harga_beli_terakhir: z.number().min(0, 'Harga beli tidak boleh negatif').optional(),
  harga_jual: z.number().min(0, 'Harga jual tidak boleh negatif').optional(),
  diskon: z.number().min(0, 'Diskon tidak boleh negatif').optional(),
});

export const inventoryUpdateSchema = z.object({
  nama_barang: z.string().trim().min(1).max(255).optional(),
  kode_barcode: z.string().trim().min(1).optional(),
  harga_jual: z.number().min(0, 'Harga jual tidak boleh negatif').optional(),
  harga_beli_terakhir: z.number().min(0, 'Harga beli tidak boleh negatif').optional(),
  diskon: z.number().min(0, 'Diskon tidak boleh negatif').optional(),
  minimum_stock: z
    .number()
    .int('Minimal stock harus bilangan bulat')
    .min(0, 'Minimal stock tidak boleh negatif')
    .optional(),
});

export const pembelianItemSchema = z
  .object({
    inventory_id: z.string().optional(),
    barcode: z.string().optional(),
    nama_barang: z.string().trim().min(1, 'Nama barang wajib diisi').max(255, 'Nama barang maksimal 255 karakter'),
    qty: z.number().int('Qty harus bilangan bulat').min(1, 'Qty minimal 1'),
    harga_beli: z.number().min(0, 'Harga beli tidak boleh negatif').optional(),
    harga_jual: z.number().min(0, 'Harga jual tidak boleh negatif').optional(),
    diskon: z.number().min(0, 'Diskon tidak boleh negatif').optional(),
    harga_final: z.number().min(0, 'Harga final tidak boleh negatif'),
    subtotal: z.number().min(0, 'Subtotal tidak boleh negatif').optional(),
  })
  .refine(
    (data) => Boolean((data.inventory_id && data.inventory_id.trim()) || (data.barcode && data.barcode.trim())),
    { message: 'Item wajib memiliki inventory ID atau barcode', path: ['inventory_id'] },
  )
  .refine(
    (data) => {
      if (data.harga_beli === undefined) return true;
      const expectedFinal = data.harga_beli - (data.diskon || 0);
      return Math.abs(data.harga_final - expectedFinal) < 1;
    },
    { message: 'Harga final tidak konsisten dengan harga beli - diskon', path: ['harga_final'] },
  )
  .refine(
    (data) => {
      if (data.subtotal === undefined) return true;
      return Math.abs(data.subtotal - data.qty * data.harga_final) < 1;
    },
    { message: 'Subtotal tidak konsisten dengan qty × harga final', path: ['subtotal'] },
  );

export const pembelianSubmitSchema = z.object({
  supplier_id: z.uuid('Format supplier ID tidak valid').nullable(),
  supplier_nama: z.string().nullable().optional(),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  items: z.array(pembelianItemSchema).min(1, 'Minimal 1 item'),
  total_supplier: z.number().min(0, 'Total supplier tidak boleh negatif'),
  gudang_id: z.uuid('Format gudang ID tidak valid').nullable().optional(),
  nomor_nota: z.string().max(100).optional(),
  note: z.string().max(1000).optional(),
  idempotency_key: z.string().optional(),
});

export const supplierSchema = z.object({
  nama: z.string().trim().min(1, 'Nama supplier wajib diisi').max(255),
  alamat: z.string().optional(),
  kontak: z.string().optional(),
  telepon: z.string().optional(),
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

export function validateSupplier(data: unknown) {
  return supplierSchema.safeParse(data);
}
