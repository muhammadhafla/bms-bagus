'use client';

import { useState, useCallback, useEffect } from 'react';
import { IconPackage, IconDotsVertical } from '@tabler/icons-react';
import { InventoryItem } from '@/types/inventory';
import { formatCurrency } from '@/lib/utils';
import { inventoryApi, kategoriApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AdminOnly } from '@/components/role';
import { SlideOver } from '@/components/ui/SlideOver';
import TextInput from '@/components/ui/TextInput';
import SelectInput from '@/components/ui/SelectInput';
import Button from '@/components/ui/Button';

interface InventoryTableProps {
  items: InventoryItem[];
  onUpdate: (id: string, data: Partial<InventoryItem>) => void;
  onDelete?: (id: string) => void;
}

interface EditForm {
  nama_barang: string;
  kode_barcode: string;
  id_kategori: string;
  harga_beli_terakhir: number;
  harga_jual: number;
  diskon: number;
  minimum_stock: number;
}

export function InventoryTable({ items, onUpdate, onDelete }: InventoryTableProps) {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [kategoriList, setKategoriList] = useState<string[]>([]);
  const [editForm, setEditForm] = useState<EditForm>({
    nama_barang: '',
    kode_barcode: '',
    id_kategori: '',
    harga_beli_terakhir: 0,
    harga_jual: 0,
    diskon: 0,
    minimum_stock: 0,
  });
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchKategoris = async () => {
      const result = await kategoriApi.getAll();
      if (!result.error && result.data) {
        setKategoriList(result.data.map(k => k.nama));
      }
    };
    fetchKategoris();
  }, []);

  const openSlideOver = useCallback((item: InventoryItem) => {
    setSelectedItem(item);
    setEditForm({
      nama_barang: item.nama_barang || '',
      kode_barcode: item.kode_barcode || '',
      id_kategori: item.id_kategori?.nama || '',
      harga_beli_terakhir: item.harga_beli_terakhir || 0,
      harga_jual: item.harga_jual || 0,
      diskon: item.diskon || 0,
      minimum_stock: item.minimum_stock || 0,
    });
    setIsSlideOverOpen(true);
  }, []);

  const closeSlideOver = useCallback(() => {
    setIsSlideOverOpen(false);
    setSelectedItem(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedItem) return;

    let id_kategori: string | undefined;
    if (editForm.id_kategori) {
      const kategoriResult = await kategoriApi.getByName(editForm.id_kategori);
      id_kategori = kategoriResult.data?.id;
    }
    
    const updateData: Record<string, unknown> = {
      nama_barang: editForm.nama_barang,
      kode_barcode: editForm.kode_barcode,
      ...(id_kategori && { id_kategori }),
      harga_beli_terakhir: editForm.harga_beli_terakhir,
      harga_jual: editForm.harga_jual,
      diskon: editForm.diskon,
      minimum_stock: editForm.minimum_stock,
    };

    const result = await inventoryApi.update(selectedItem.id, updateData);
    console.log('Update result:', result);
    console.log('Update data sent:', updateData);
    console.log('Item ID:', selectedItem.id);
    if (!result.error && result.data) {
      const updatedItem = {
        ...result.data,
        id_kategori: result.data.id_kategori || result.data.kategori,
      };
      onUpdate(selectedItem.id, updatedItem);
      showToast('Perubahan disimpan', 'success');
    } else {
      console.log('Update error:', result.error);
      showToast('Gagal menyimpan perubahan', 'error');
    }
    setSaveConfirm(false);
    closeSlideOver();
  }, [selectedItem, editForm, onUpdate, showToast, closeSlideOver]);

  const handleDelete = useCallback(async () => {
    if (!selectedItem || !onDelete) return;
    
    await onDelete(selectedItem.id);
    showToast('Barang dihapus', 'success');
    setDeleteConfirm(false);
    closeSlideOver();
  }, [selectedItem, onDelete, showToast, closeSlideOver]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-neutral-400 dark:text-neutral-500">
        <IconPackage size={64} className="mb-4 opacity-50" />
        <p className="text-lg font-medium">Tidak ada data inventory</p>
        <p className="text-sm">Tambahkan barang melalui halaman Pembelian</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
      <table className="w-full min-w-[900px]">
        <thead className="bg-neutral-50 dark:bg-neutral-950 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Barcode</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Nama Barang</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Kategori</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Harga Beli</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Harga Jual</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Diskon</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Stok</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Min Stock</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {items.map((item) => {
            const isLowStock = item.stok <= (item.minimum_stock || 0);

            return (
              <tr 
                key={item.id} 
                className={isLowStock ? 'bg-red-50/50 dark:bg-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/50' : 'bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800'}
              >
                <td className="px-4 py-3 text-sm font-mono text-neutral-900 dark:text-neutral-100">{item.kode_barcode}</td>
                <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">{item.nama_barang}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                    {item.id_kategori?.nama || '-'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-300">
                  {formatCurrency(item.harga_beli_terakhir || 0)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-neutral-900 dark:text-neutral-100">
                  {formatCurrency(item.harga_jual)}
                </td>
                <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-300">
                  {formatCurrency(item.diskon)}
                </td>
                <td className={`px-4 py-3 text-right font-bold ${isLowStock ? 'text-red-600 dark:text-red-300' : 'text-neutral-900 dark:text-neutral-100'}`}>
                  {item.stok}
                </td>
                <td className="px-4 py-3 text-right text-neutral-500 dark:text-neutral-300">
                  {item.minimum_stock}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => openSlideOver(item)}
                    className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                    aria-label={`Buka menu untuk ${item.nama_barang}`}
                  >
                    <IconDotsVertical size={18} stroke={2} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <SlideOver
        isOpen={isSlideOverOpen}
        onClose={closeSlideOver}
        title={selectedItem ? `Edit ${selectedItem.nama_barang}` : ''}
        size="md"
      >
        <AdminOnly
          fallback={
            <div className="space-y-4">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Nama Barang</p>
                <p className="text-neutral-900 dark:text-white">{editForm.nama_barang}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Barcode</p>
                <p className="text-neutral-900 dark:text-white font-mono">{editForm.kode_barcode}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Kategori</p>
                <p className="text-neutral-900 dark:text-white">{editForm.id_kategori}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Harga Beli Terakhir</p>
                <p className="text-neutral-900 dark:text-white">{formatCurrency(editForm.harga_beli_terakhir)}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Harga Jual</p>
                <p className="text-neutral-900 dark:text-white">{formatCurrency(editForm.harga_jual)}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Diskon</p>
                <p className="text-neutral-900 dark:text-white">{formatCurrency(editForm.diskon)}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Minimum Stock</p>
                <p className="text-neutral-900 dark:text-white">{editForm.minimum_stock}</p>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <TextInput
              label="Nama Barang"
              value={editForm.nama_barang}
              onChange={(e) => setEditForm(prev => ({ ...prev, nama_barang: e.target.value }))}
              required
            />
            <TextInput
              label="Barcode"
              value={editForm.kode_barcode}
              onChange={(e) => setEditForm(prev => ({ ...prev, kode_barcode: e.target.value }))}
            />
            <SelectInput
              label="Kategori"
              value={editForm.id_kategori}
              onChange={(value) => setEditForm(prev => ({ ...prev, id_kategori: value }))}
              options={kategoriList.map(k => ({ value: k, label: k }))}
              placeholder="Pilih kategori"
            />
            <TextInput
              label="Harga Beli Terakhir"
              type="number"
              value={editForm.harga_beli_terakhir}
              onChange={(e) => setEditForm(prev => ({ ...prev, harga_beli_terakhir: parseInt(e.target.value) || 0 }))}
            />
            <TextInput
              label="Harga Jual"
              type="number"
              value={editForm.harga_jual}
              onChange={(e) => setEditForm(prev => ({ ...prev, harga_jual: parseInt(e.target.value) || 0 }))}
            />
            <TextInput
              label="Diskon"
              type="number"
              value={editForm.diskon}
              onChange={(e) => setEditForm(prev => ({ ...prev, diskon: parseInt(e.target.value) || 0 }))}
            />
            <TextInput
              label="Minimum Stock"
              type="number"
              value={editForm.minimum_stock}
              onChange={(e) => setEditForm(prev => ({ ...prev, minimum_stock: parseInt(e.target.value) || 0 }))}
            />
          </div>
        </AdminOnly>
        <AdminOnly>
          <div className="flex gap-3 mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <Button
              variant="primary"
              onClick={() => setSaveConfirm(true)}
              className="flex-1"
            >
              Simpan Perubahan
            </Button>
            <Button
              variant="danger"
              onClick={() => setDeleteConfirm(true)}
            >
              Hapus Barang
            </Button>
          </div>
        </AdminOnly>
      </SlideOver>

      <ConfirmDialog
        isOpen={saveConfirm}
        title="Simpan Perubahan"
        message={`Yakin ingin menyimpan perubahan pada ${editForm.nama_barang}?`}
        confirmLabel="Ya, Simpan"
        cancelLabel="Batal"
        onConfirm={handleSave}
        onCancel={() => setSaveConfirm(false)}
      />

      <ConfirmDialog
        isOpen={deleteConfirm}
        title="Hapus Barang"
        message={`Apakah Anda yakin ingin menghapus "${editForm.nama_barang}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(false)}
        danger
      />
    </div>
  );
}