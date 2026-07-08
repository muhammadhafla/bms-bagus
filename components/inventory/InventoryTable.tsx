'use client';

import { useState, useCallback, useEffect } from 'react';
import { IconPackage, IconDotsVertical, IconDeviceFloppy, IconTrash, IconPrinter } from '@tabler/icons-react';
import { InventoryItem } from '@/types/inventory';
import { formatCurrency } from '@/lib/utils';
import { inventoryApi, kategoriApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AdminOnly } from '@/components/role';
import { Modal } from '@/components/ui/Modal';
import TextInput from '@/components/ui/TextInput';
import SelectInput from '@/components/ui/SelectInput';
import Button from '@/components/ui/Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface InventoryTableProps {
  items: InventoryItem[];
  onUpdate: (id: string, data: Partial<InventoryItem>) => void;
  onDelete?: (id: string) => void;
  pagination?: PaginationProps;
  kategoriList: string[];
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

export function InventoryTable({ items, onUpdate, onDelete, pagination, kategoriList }: InventoryTableProps) {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
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
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [printForm, setPrintForm] = useState({ template_id: '', qty: 1 });
  const [isPrinting, setIsPrinting] = useState(false);
  const { showToast } = useToast();

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
    if (!result.error && result.data) {
      const updatedItem = {
        ...result.data,
        id_kategori: result.data.id_kategori || result.data.kategori,
      };
      onUpdate(selectedItem.id, updatedItem);
      showToast('Perubahan disimpan', 'success');
    } else {
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

  const openPrintModal = async () => {
    if (!selectedItem) return;
    setPrintModalOpen(true);
    setPrintForm({ template_id: '', qty: 1 });
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (data.templates) {
        setTemplates(data.templates);
        if (data.templates.length > 0) {
          setPrintForm(prev => ({ ...prev, template_id: data.templates[0].id }));
        }
      }
    } catch (err) {
      console.error('Error fetching templates', err);
    }
  };

  const handlePrintSubmit = async () => {
    if (!selectedItem || !printForm.template_id) return;
    setIsPrinting(true);
    try {
      // Harga akhir setelah diskon
      const finalPrice = (selectedItem.harga_jual || 0) - (selectedItem.diskon || 0);
      
      const itemData = {
        name: selectedItem.nama_barang,
        price: formatCurrency(finalPrice),
        barcode: selectedItem.kode_barcode
      };
      const payload_json = Array(printForm.qty).fill(itemData);

      const res = await fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: printForm.template_id,
          payload_json
        })
      });

      if (res.ok) {
        showToast('Antrean cetak berhasil dibuat', 'success');
        setPrintModalOpen(false);
      } else {
        const errorData = await res.json();
        showToast(errorData.error || 'Gagal membuat antrean cetak', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan sistem', 'error');
    } finally {
      setIsPrinting(false);
    }
  };

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
    <>
      <div className="hidden lg:block overflow-auto rounded-3xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl shadow-elevated">
        <table className="w-full min-w-[900px]">
          <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md sticky top-0 z-10 border-b border-neutral-200/50 dark:border-neutral-800/50">
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
                  className={isLowStock ? 'bg-red-50/30 dark:bg-red-900/20 hover:bg-red-50/50 dark:hover:bg-red-900/40 transition-colors' : 'hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors'}
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

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-t border-neutral-200/50 dark:border-neutral-800/50">
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Halaman <span className="font-bold text-neutral-900 dark:text-white">{pagination.page}</span> dari <span className="font-bold text-neutral-900 dark:text-white">{pagination.totalPages}</span>
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="min-w-[100px]"
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="min-w-[100px]"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Card Layout */}
      <div className="block lg:hidden space-y-3">
        {items.map((item) => {
          const isLowStock = item.stok <= (item.minimum_stock || 0);
          return (
            <div 
              key={item.id} 
              className={`p-3 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm flex flex-col gap-2 ${isLowStock ? 'bg-red-50/30 dark:bg-red-900/20' : 'bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl'}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-2">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <h3 className="font-semibold text-neutral-900 dark:text-white text-sm leading-tight line-clamp-1">{item.nama_barang}</h3>
                    {isLowStock && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 whitespace-nowrap shrink-0">
                        Low Stock
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400">{item.kode_barcode}</p>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                      {item.id_kategori?.nama || '-'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => openSlideOver(item)}
                  className="p-1 -mr-1 -mt-1 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition-colors shrink-0"
                >
                  <IconDotsVertical size={18} stroke={2} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px] mt-1 pt-2 border-t border-neutral-100 dark:border-neutral-800/60">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 dark:text-neutral-400 text-xs">Beli</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">{formatCurrency(item.harga_beli_terakhir || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 dark:text-neutral-400 text-xs">Jual</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">{formatCurrency(item.harga_jual)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 dark:text-neutral-400 text-xs">Diskon</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">{formatCurrency(item.diskon)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 dark:text-neutral-400 text-xs">Stok</span>
                  <span className={`font-bold ${isLowStock ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                    {item.stok} <span className="text-[10px] font-normal text-neutral-500">/{item.minimum_stock}</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="block lg:hidden sticky bottom-0 z-20 mt-4 -mx-4 px-4 py-4 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border-t border-neutral-200/50 dark:border-neutral-800/50 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Hal <span className="font-bold text-neutral-900 dark:text-white">{pagination.page}</span> / <span className="font-bold text-neutral-900 dark:text-white">{pagination.totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Prev
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal
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
              options={[...kategoriList].sort().map(k => ({ value: k, label: k }))}
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
          <div className="flex flex-col gap-3 mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={() => setSaveConfirm(true)}
                className="flex-1"
                leftIcon={<IconDeviceFloppy size={18} />}
              >
                <span className="hidden sm:inline">Simpan Perubahan</span>
              </Button>
              <Button
                variant="danger"
                onClick={() => setDeleteConfirm(true)}
                leftIcon={<IconTrash size={18} />}
              >
                <span className="hidden sm:inline">Hapus Barang</span>
              </Button>
            </div>
            <Button
              variant="secondary"
              onClick={openPrintModal}
              className="w-full"
              leftIcon={<IconPrinter size={18} />}
            >
              Cetak Label
            </Button>
          </div>
        </AdminOnly>
      </Modal>

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

      <Modal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Cetak Label"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Cetak label untuk <strong>{selectedItem?.nama_barang}</strong>
          </p>
          
          <SelectInput
            label="Template Label"
            value={printForm.template_id}
            onChange={(val) => setPrintForm(prev => ({...prev, template_id: val}))}
            options={templates.map(t => ({ value: t.id, label: t.name }))}
            placeholder="Pilih template"
          />
          
          <TextInput
            label="Jumlah (Qty)"
            type="number"
            value={printForm.qty}
            onChange={(e) => setPrintForm(prev => ({...prev, qty: parseInt(e.target.value) || 1}))}
            required
          />
          
          <div className="flex gap-3 mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <Button
              variant="secondary"
              onClick={() => setPrintModalOpen(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handlePrintSubmit}
              disabled={isPrinting || !printForm.template_id}
              className="flex-1"
              leftIcon={<IconPrinter size={18} />}
            >
              {isPrinting ? 'Memproses...' : 'Cetak'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}