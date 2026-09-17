'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  IconPackage,
  IconDotsVertical,
  IconDeviceFloppy,
  IconTrash,
  IconPrinter,
  IconChevronRight,
  IconChevronLeft,
  IconBan,
  IconCheck,
  IconHistory,
  IconBuildingWarehouse,
  IconGitMerge,
  IconAlertTriangle,
  IconBolt,
} from '@tabler/icons-react';
import { InventoryItem, InventoryDeletionCheck } from '@/types/inventory';
import { InventoryStock } from '@/types/warehouse';
import { supabase } from '@/lib/supabase';
import { fetchApi } from '@/lib/fetchApi';
import { formatCurrency } from '@/lib/utils';
import { inventoryApi, kategoriApi } from '@/lib/api';
import { warehouseStockApi } from '@/lib/api/warehouse';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AdminOnly, RoleGuard } from '@/components/role';
import { useAuthStore, useIsAdmin } from '@/lib/auth';
import { Modal } from '@/components/ui/Modal';
import TextInput from '@/components/ui/TextInput';
import SelectInput from '@/components/ui/SelectInput';
import Button from '@/components/ui/Button';
import { ModernPagination, PriceInput, Spinner } from '@/components/ui';
import { useHotkeys } from 'react-hotkeys-hook';
import { PurchaseHistoryModal } from './PurchaseHistoryModal';
import { MergeInventoryModal } from './MergeInventoryModal';
import { BulkDeleteConfirmModal } from './BulkDeleteConfirmModal';

interface PaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  limit?: number;
  onPageChange: (page: number) => void;
}

interface InventoryTableProps {
  items: InventoryItem[];
  onUpdate: (id: string, data: Partial<InventoryItem>) => void;
  onDelete?: (id: string) => Promise<boolean | void> | void;
  onRefresh?: () => void;
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

export const InventoryTable = React.memo(function InventoryTable({
  items,
  onUpdate,
  onDelete,
  onRefresh,
  pagination,
  kategoriList,
}: InventoryTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkSnoozing, setIsBulkSnoozing] = useState(false);
  const [showBulkSnoozeOpts, setShowBulkSnoozeOpts] = useState(false);
  const bulkSnoozeRef = useRef<HTMLDivElement>(null);
  
  // Close bulk snooze popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bulkSnoozeRef.current && !bulkSnoozeRef.current.contains(event.target as Node)) {
        setShowBulkSnoozeOpts(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBulkSnooze = async (days: number) => {
    if (selectedIds.size === 0) return;
    setIsBulkSnoozing(true);
    try {
      const idsArray = Array.from(selectedIds);
      await inventoryApi.snoozeLowStockBulk(idsArray, days);
      toast.success(`${idsArray.length} barang berhasil di-snooze`);
      setSelectedIds(new Set());
      // A full refresh of data would normally happen via a callback, 
      // but since we are modifying locally, we can just trigger a reload or leave it to user to refresh
      window.location.reload(); 
    } catch (err) {
      toast.error('Gagal melakukan snooze massal');
    } finally {
      setIsBulkSnoozing(false);
      setShowBulkSnoozeOpts(false);
    }
  };

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(item => item.id)));
    }
  }, [items, selectedIds]);

  const toggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeSourceItems, setMergeSourceItems] = useState<InventoryItem[]>([]);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [isCheckingDelete, setIsCheckingDelete] = useState(false);
  const [deletionBlockedInfo, setDeletionBlockedInfo] = useState<InventoryDeletionCheck | null>(null);
  const [discontinueConfirm, setDiscontinueConfirm] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [printForm, setPrintForm] = useState({ template_id: '', qty: 1 });
  const [isPrinting, setIsPrinting] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [warehouseStocks, setWarehouseStocks] = useState<InventoryStock[]>([]);
  const [loadingWarehouseStocks, setLoadingWarehouseStocks] = useState(false);
  const isAdminUser = useIsAdmin();
  const hasRole = useAuthStore((state) => state.hasRole);
  const canViewHPP = isAdminUser || hasRole('finance');
  const canEdit = isAdminUser || hasRole('kepala_cabang');

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
    setLoadingWarehouseStocks(true);
    warehouseStockApi.getStockByItem(item.id).then((res) => {
      if (res.data) {
        setWarehouseStocks(res.data);
      } else {
        setWarehouseStocks([]);
      }
      setLoadingWarehouseStocks(false);
    }).catch(() => {
      setWarehouseStocks([]);
      setLoadingWarehouseStocks(false);
    });
  }, []);

  const closeSlideOver = useCallback(() => {
    setIsSlideOverOpen(false);
    setSelectedItem(null);
    setWarehouseStocks([]);
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
      toast.success('Perubahan disimpan');
    } else {
      toast.error('Gagal menyimpan perubahan');
    }
    closeSlideOver();
  }, [selectedItem, editForm, onUpdate, closeSlideOver]);

  const handleDelete = useCallback(async () => {
    if (!selectedItem || !onDelete) return;

    const res = await onDelete(selectedItem.id);
    if (res !== false) {
      setDeleteConfirm(false);
      closeSlideOver();
    }
  }, [selectedItem, onDelete, closeSlideOver]);

  const handlePromptDelete = useCallback(async () => {
    if (!selectedItem) return;
    setIsCheckingDelete(true);
    try {
      const res = await inventoryApi.checkCanDelete(selectedItem.id);
      if (res.error || !res.data) {
        toast.error(res.error?.message || 'Gagal memeriksa kelayakan hapus');
        return;
      }

      if (res.data.can_delete) {
        setDeleteConfirm(true);
      } else {
        setDeletionBlockedInfo(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat memeriksa data');
    } finally {
      setIsCheckingDelete(false);
    }
  }, [selectedItem]);

  const handleOpenBulkMerge = useCallback(() => {
    const selected = items.filter((i) => selectedIds.has(i.id));
    if (selected.length === 0) return;
    setMergeSourceItems(selected);
    setMergeModalOpen(true);
  }, [items, selectedIds]);

  const handleOpenBulkDelete = useCallback(() => {
    const selected = items.filter((i) => selectedIds.has(i.id));
    if (selected.length === 0) return;
    setBulkDeleteModalOpen(true);
  }, [items, selectedIds]);

  const handleMergeSuccess = useCallback(() => {
    setSelectedIds(new Set());
    closeSlideOver();
    if (onRefresh) onRefresh();
  }, [closeSlideOver, onRefresh]);

  const handleBulkDeleteSuccess = useCallback(() => {
    setSelectedIds(new Set());
    if (onRefresh) onRefresh();
  }, [onRefresh]);

  const handleToggleDiscontinue = useCallback(async () => {
    if (!selectedItem) return;

    const result = await inventoryApi.toggleDiscontinued(selectedItem.id);
    if (!result.error && result.data) {
      toast.success(
        `Barang berhasil ${selectedItem.is_discontinued ? 'diaktifkan' : 'dihentikan'}`,
      );
      onUpdate(selectedItem.id, result.data);
    } else {
      toast.error('Gagal mengubah status');
    }
    setDiscontinueConfirm(false);
    closeSlideOver();
  }, [selectedItem, onUpdate, closeSlideOver]);

  useHotkeys('ctrl+s, cmd+s', (e) => {
    e.preventDefault();
    handleSave();
  }, { enableOnFormTags: true, enabled: isSlideOverOpen });

  const openPrintModal = async () => {
    if (!selectedItem) return;
    setPrintModalOpen(true);
    setPrintForm({ template_id: '', qty: 1 });
    try {
      const res = await fetchApi('/api/templates');
      const data = await res.json();
      if (data.templates) {
        setTemplates(data.templates);
        if (data.templates.length > 0) {
          setPrintForm((prev) => ({ ...prev, template_id: data.templates[0].id }));
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
        barcode: selectedItem.kode_barcode,
      };
      const payload_json = Array(printForm.qty).fill(itemData);

      const res = await fetchApi('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: printForm.template_id,
          payload_json,
        }),
      });

      if (res.ok) {
        toast.success('Antrean cetak berhasil dibuat');
        setPrintModalOpen(false);
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Gagal membuat antrean cetak');
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan sistem');
    } finally {
      setIsPrinting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-neutral-400 dark:text-neutral-500">
        <IconPackage size={64} className="mb-4 opacity-50" />
        <p className="text-lg font-medium">Tidak ada data inventory</p>
        <p className="text-sm">Tambahkan barang melalui halaman Pembelian</p>
      </div>
    );
  }

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="mb-4 hidden items-center justify-between rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 shadow-sm lg:flex dark:border-brand-900/50 dark:bg-brand-900/20">
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-700 dark:text-brand-300">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs dark:bg-brand-800">
              {selectedIds.size}
            </span>
            Barang Dipilih
          </div>
          
          <div className="flex items-center gap-2.5">
            {isAdminUser && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenBulkMerge}
                  leftIcon={<IconGitMerge size={16} />}
                  className="shadow-2xs"
                >
                  Gabung Massal (Merge)
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleOpenBulkDelete}
                  leftIcon={<IconTrash size={16} />}
                  className="shadow-2xs"
                >
                  Hapus Massal
                </Button>
              </>
            )}

            <div className="relative" ref={bulkSnoozeRef}>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setShowBulkSnoozeOpts(!showBulkSnoozeOpts)}
                className="border-brand-300 text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:text-brand-300 dark:hover:bg-brand-800"
              >
                🕒 Snooze Massal
              </Button>
            
            {showBulkSnoozeOpts && (
              <div className="shadow-elevated absolute right-0 top-10 z-30 w-40 rounded-lg border border-neutral-200 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-800">
                <p className="mb-2 px-1 text-xs font-semibold text-neutral-500 dark:text-neutral-400">Pilih Durasi</p>
                <div className="flex flex-col gap-1">
                  {[
                    { label: '1 Hari', days: 1, icon: '⏱️' },
                    { label: '3 Hari', days: 3, icon: '🚚' },
                    { label: '1 Minggu', days: 7, icon: '📅' },
                    { label: '1 Bulan', days: 30, icon: '📦' },
                  ].map(opt => (
                    <button
                      key={opt.days}
                      onClick={() => handleBulkSnooze(opt.days)}
                      disabled={isBulkSnoozing}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-700"
                    >
                      <span className="text-base">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      <div className="shadow-elevated hidden overflow-auto rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl lg:block dark:border-white/10 dark:bg-neutral-900/60">
        <table className="w-full min-w-[900px]">
          <thead className="sticky top-0 z-10 border-b border-neutral-200/50 bg-white/50 backdrop-blur-md dark:border-neutral-800/50 dark:bg-neutral-950/50">
            <tr>
              <th className="w-12 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border-neutral-300 text-brand-600 focus:ring-brand-500 dark:border-neutral-600 dark:bg-neutral-800 dark:checked:bg-brand-500"
                  checked={items.length > 0 && selectedIds.size === items.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                Barcode
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                Nama Barang
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                Kategori
              </th>
              {canViewHPP && (
                <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                  Harga Beli
                </th>
              )}
              <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                Harga Jual
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                Diskon
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                <span className="inline-flex items-center gap-1 justify-end" title="Total stok akumulasi di semua gudang & cabang">
                  Total Stok
                </span>
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                Minimal Stok
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {(Array.isArray(items) ? items : []).map((item) => {
              const isLowStock = item.stok <= (item.minimum_stock || 0);

              return (
                <tr
                  key={item.id}
                  onClick={() => openSlideOver(item)}
                  className={`group cursor-pointer transition-colors ${item.is_discontinued ? 'bg-neutral-50/50 opacity-60 hover:bg-neutral-100/50 dark:bg-neutral-900/30 dark:hover:bg-neutral-800/40' : isLowStock ? 'bg-accent-rose-50/30 dark:bg-accent-rose-900/20 hover:bg-accent-rose-100/60 dark:hover:bg-accent-rose-900/50' : 'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/60'}`}
                >
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer rounded border-neutral-300 text-brand-600 focus:ring-brand-500 dark:border-neutral-600 dark:bg-neutral-800 dark:checked:bg-brand-500"
                      checked={selectedIds.has(item.id)}
                      onChange={(e) => toggleSelect(item.id, e as any)}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-neutral-900 dark:text-neutral-100">
                    {item.kode_barcode}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                    <div className="flex items-center gap-2">
                      {item.nama_barang}
                      {item.is_discontinued && (
                        <span className="inline-flex items-center rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                          Discontinue
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                      {item.id_kategori?.nama || '-'}
                    </span>
                  </td>
                  {canViewHPP && (
                    <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-300">
                      {formatCurrency(item.harga_beli_terakhir || 0)}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right font-medium text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(item.harga_jual)}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-300">
                    {formatCurrency(item.diskon)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-bold ${isLowStock ? 'text-accent-rose-600 dark:text-accent-rose-300' : 'text-neutral-900 dark:text-neutral-100'}`}
                  >
                    {item.stok}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-500 dark:text-neutral-300">
                    {item.minimum_stock}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="group-hover:text-brand-600 dark:group-hover:text-brand-400 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20 inline-flex rounded-lg p-1.5 text-neutral-400 transition-all">
                      <IconChevronRight size={18} stroke={2.5} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {pagination && pagination.totalPages > 1 && (
          <ModernPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={pagination.onPageChange}
            className="hidden rounded-none border-x-0 border-b-0 lg:flex"
          />
        )}
        {pagination && pagination.totalPages <= 1 && pagination.total !== undefined && pagination.total > 0 && (
          <div className="hidden border-t border-neutral-200/50 bg-white/50 p-3 text-center text-xs font-medium text-neutral-500 backdrop-blur-md lg:block dark:border-neutral-800/50 dark:bg-neutral-950/50 dark:text-neutral-400">
            Menampilkan seluruh {pagination.total} barang
          </div>
        )}
      </div>

      {/* Mobile Card Layout */}
      <div className="block space-y-3 lg:hidden">
        {(Array.isArray(items) ? items : []).map((item) => {
          const isLowStock = item.stok <= (item.minimum_stock || 0);
          return (
            <div
              key={item.id}
              onClick={() => openSlideOver(item)}
              className={`group flex cursor-pointer flex-col gap-2 rounded-2xl border border-neutral-200/60 p-3 shadow-sm transition-all duration-200 active:scale-[0.98] dark:border-neutral-800/60 ${item.is_discontinued ? 'bg-neutral-50/50 opacity-60 hover:bg-neutral-100/50 dark:bg-neutral-900/30 dark:hover:bg-neutral-800/40' : isLowStock ? 'bg-accent-rose-50/30 dark:bg-accent-rose-900/20 hover:bg-accent-rose-50/80 dark:hover:bg-accent-rose-900/40' : 'bg-white/70 backdrop-blur-xl hover:bg-neutral-50/90 dark:bg-neutral-900/60 dark:hover:bg-neutral-800/80'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-2">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <h3 className="line-clamp-1 text-sm leading-tight font-semibold text-neutral-900 dark:text-white">
                      {item.nama_barang}
                    </h3>
                    {item.is_discontinued && (
                      <span className="inline-flex shrink-0 items-center rounded-md bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                        Discontinue
                      </span>
                    )}
                    {isLowStock && (
                      <span className="bg-accent-rose-100 dark:bg-accent-rose-900/40 text-accent-rose-600 dark:text-accent-rose-400 inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap">
                        Low Stock
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                      {item.kode_barcode}
                    </p>
                    <span className="inline-flex items-center rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                      {item.id_kategori?.nama || '-'}
                    </span>
                  </div>
                </div>
                <div className="group-hover:text-brand-600 dark:group-hover:text-brand-400 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20 -mt-1 -mr-1 shrink-0 rounded-lg p-1 text-neutral-400 transition-all">
                  <IconChevronRight size={18} stroke={2.5} />
                </div>
              </div>

              <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-neutral-100 pt-2 text-[13px] dark:border-neutral-800/60">
                {canViewHPP && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">Beli</span>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {formatCurrency(item.harga_beli_terakhir || 0)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">Jual</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(item.harga_jual)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">Diskon</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(item.diskon)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">Total Stok</span>
                  <span
                    className={`font-bold ${isLowStock ? 'text-accent-rose-600 dark:text-accent-rose-400' : 'text-neutral-900 dark:text-neutral-100'}`}
                  >
                    {item.stok}{' '}
                    <span className="text-[10px] font-normal text-neutral-500">
                      /{item.minimum_stock}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <ModernPagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={pagination.onPageChange}
          className="sticky bottom-0 z-20 -mx-4 mt-4 rounded-none border-x-0 border-b-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] lg:hidden"
        />
      )}
      {pagination && pagination.totalPages <= 1 && pagination.total !== undefined && pagination.total > 0 && (
        <div className="py-3 text-center text-xs font-medium text-neutral-500 lg:hidden dark:text-neutral-400">
          Menampilkan seluruh {pagination.total} barang
        </div>
      )}

      <Modal
        isOpen={isSlideOverOpen}
        onClose={closeSlideOver}
        title={selectedItem ? `Edit ${selectedItem.nama_barang}` : ''}
        size="3xl"
        isBottomSheetOnMobile
        footer={
          <div className="flex w-full items-center justify-between">
            <span className="text-xs text-neutral-400 dark:text-neutral-500">
              Tekan <kbd className="rounded bg-neutral-200 px-1 py-0.5 text-[10px] font-mono text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">Esc</kbd> untuk menutup
            </span>
            <div className="flex items-center gap-2.5">
              <Button variant="secondary" onClick={closeSlideOver}>
                Batal
              </Button>
              {canEdit && (
                <Button
                  variant="primary"
                  onClick={handleSave}
                  leftIcon={<IconDeviceFloppy size={18} />}
                >
                  Simpan Perubahan
                </Button>
              )}
            </div>
          </div>
        }
        footerClassName="hidden lg:block"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-6">
          {/* Kolom Kiri: Form Data Barang */}
          <div className="lg:col-span-7">
            <RoleGuard
              roles={['admin', 'kepala_cabang']}
              fallback={
                <div className="space-y-4">
                  {selectedItem?.is_discontinued && (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                      <IconBan size={18} className="shrink-0" />
                      <span>Barang telah di-discontinue</span>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Nama Barang</p>
                    <p className="text-base font-semibold text-neutral-900 dark:text-white">{editForm.nama_barang}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Barcode</p>
                      <p className="font-mono text-sm text-neutral-900 dark:text-white">
                        {editForm.kode_barcode || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Kategori</p>
                      <p className="text-sm text-neutral-900 dark:text-white">{editForm.id_kategori || '-'}</p>
                    </div>
                    {canViewHPP && (
                      <div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          Harga Beli Terakhir
                        </p>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                          {formatCurrency(editForm.harga_beli_terakhir)}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Harga Jual</p>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">
                        {formatCurrency(editForm.harga_jual)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Diskon</p>
                      <p className="text-sm text-neutral-900 dark:text-white">
                        {formatCurrency(editForm.diskon)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Minimum Stock</p>
                      <p className="text-sm text-neutral-900 dark:text-white">{editForm.minimum_stock}</p>
                    </div>
                  </div>
                </div>
              }
            >
              <div className="space-y-2 sm:space-y-3.5">
                {selectedItem?.is_discontinued && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                    <IconBan size={16} className="shrink-0" />
                    <span>Barang ini telah di-discontinue (tidak aktif di transaksi baru)</span>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3.5">
                  <div className="sm:col-span-2">
                    <TextInput
                      label="Nama Barang"
                      value={editForm.nama_barang}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, nama_barang: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <TextInput
                      label="Barcode"
                      value={editForm.kode_barcode}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, kode_barcode: e.target.value }))}
                    />
                  </div>
                  <div>
                    <SelectInput
                      label="Kategori"
                      value={editForm.id_kategori}
                      onChange={(value) => setEditForm((prev) => ({ ...prev, id_kategori: value }))}
                      options={[...kategoriList].sort().map((k) => ({ value: k, label: k }))}
                      placeholder="Pilih kategori"
                    />
                  </div>
                  {isAdminUser && (
                    <div>
                      <PriceInput
                        label="Harga Beli Terakhir"
                        value={editForm.harga_beli_terakhir}
                        onChange={(val) =>
                          setEditForm((prev) => ({
                            ...prev,
                            harga_beli_terakhir: val,
                          }))
                        }
                      />
                    </div>
                  )}
                  <div className={isAdminUser ? '' : 'sm:col-span-2'}>
                    <PriceInput
                      label="Harga Jual"
                      value={editForm.harga_jual}
                      onChange={(val) =>
                        setEditForm((prev) => ({ ...prev, harga_jual: val }))
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <TextInput
                      label="Minimum Stock"
                      type="number"
                      min={0}
                      value={editForm.minimum_stock === 0 ? '' : editForm.minimum_stock}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditForm((prev) => ({
                          ...prev,
                          minimum_stock: val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0),
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>
            </RoleGuard>
          </div>

          {/* Kolom Kanan: Rincian Stok Gudang + Aksi Cepat Desktop */}
          <div className="mt-2.5 space-y-2.5 lg:mt-0 lg:space-y-4 lg:col-span-5">
            {/* Rincian Stok per Lokasi Gudang */}
            {selectedItem && (
              <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-2.5 sm:p-3 lg:p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-neutral-600 uppercase dark:text-neutral-300">
                    <IconBuildingWarehouse className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    Rincian Stok per Gudang
                  </span>
                  <Link
                    href={`/warehouse/stocks?search=${encodeURIComponent(selectedItem.kode_barcode || selectedItem.nama_barang)}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
                  >
                    Kelola di Gudang &rarr;
                  </Link>
                </div>

                {loadingWarehouseStocks ? (
                  <div className="py-2 text-center text-xs text-neutral-400 animate-pulse">
                    Memuat rincian stok gudang...
                  </div>
                ) : warehouseStocks.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-neutral-200 bg-white/60 p-3 text-center text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-400">
                    Belum ada alokasi stok di modul gudang. Total stok saat ini: <strong className="text-neutral-800 dark:text-neutral-200">{selectedItem.stok} pcs</strong>.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {warehouseStocks.map((ws) => (
                      <div
                        key={ws.id}
                        className="flex items-center justify-between rounded-xl border border-neutral-100 bg-white px-2.5 py-1.5 text-xs shadow-2xs dark:border-neutral-800 dark:bg-neutral-800/80"
                      >
                        <div>
                          <div className="font-semibold text-neutral-900 dark:text-white">
                            {ws.gudang?.nama || ws.gudang?.kode_gudang || 'Gudang'}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                            <span>Rak: <strong className="font-medium text-neutral-700 dark:text-neutral-300">{ws.rak_lokasi || '-'}</strong></span>
                            {ws.min_stok !== null && ws.min_stok !== undefined && (
                              <span>• Min: {ws.min_stok}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-neutral-900 dark:text-white">
                            {ws.stok}
                          </span>
                          <span className="text-[11px] text-neutral-500 ml-1">pcs</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Aksi & Utilitas Barang Cepat (Desktop Only) */}
            <AdminOnly>
              <div className="hidden lg:block rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
                <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold tracking-wider text-neutral-600 uppercase dark:text-neutral-300">
                  <IconBolt className="h-4 w-4 text-amber-500" />
                  Aksi & Utilitas Barang
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setHistoryModalOpen(true)}
                    className="w-full justify-start text-xs font-medium"
                    leftIcon={<IconHistory size={16} className="text-brand-600 dark:text-brand-400" />}
                  >
                    Riwayat Harga
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={openPrintModal}
                    className="w-full justify-start text-xs font-medium"
                    leftIcon={<IconPrinter size={16} className="text-blue-600 dark:text-blue-400" />}
                  >
                    Cetak Label
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (selectedItem) {
                        setMergeSourceItems([selectedItem]);
                        setMergeModalOpen(true);
                      }
                    }}
                    className="w-full justify-start text-xs font-medium"
                    leftIcon={<IconGitMerge size={16} className="text-purple-600 dark:purple-400" />}
                  >
                    Gabung (Merge)
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setDiscontinueConfirm(true)}
                    className="w-full justify-start text-xs font-medium"
                    leftIcon={
                      selectedItem?.is_discontinued ? (
                        <IconCheck size={16} className="text-emerald-600" />
                      ) : (
                        <IconBan size={16} className="text-amber-600" />
                      )
                    }
                  >
                    {selectedItem?.is_discontinued ? 'Aktifkan' : 'Discontinue'}
                  </Button>
                </div>
                <div className="mt-2.5 pt-2.5 border-t border-neutral-200/80 dark:border-neutral-800">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handlePromptDelete}
                    disabled={isCheckingDelete}
                    className="w-full text-xs font-medium"
                    leftIcon={isCheckingDelete ? <Spinner size="sm" /> : <IconTrash size={16} />}
                  >
                    {isCheckingDelete ? 'Memeriksa Kelayakan...' : 'Hapus Barang'}
                  </Button>
                </div>
              </div>
            </AdminOnly>
          </div>
        </div>

        {/* Mobile Action Buttons (Mobile Only) */}
        <AdminOnly>
          <div className="mt-2.5 flex flex-col gap-2 border-t border-neutral-200 pt-2.5 dark:border-neutral-800 lg:hidden">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              className="w-full min-h-[38px] text-xs sm:text-sm font-semibold"
              leftIcon={<IconDeviceFloppy size={18} />}
            >
              Simpan Perubahan
            </Button>

            <div className="grid grid-cols-2 gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={openPrintModal}
                className="w-full justify-center text-xs font-medium min-h-[36px]"
                leftIcon={<IconPrinter size={15} className="text-blue-600 dark:text-blue-400" />}
              >
                Cetak Label
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setHistoryModalOpen(true)}
                className="w-full justify-center text-xs font-medium min-h-[36px]"
                leftIcon={<IconHistory size={15} className="text-brand-600 dark:text-brand-400" />}
              >
                Riwayat Harga
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (selectedItem) {
                    setMergeSourceItems([selectedItem]);
                    setMergeModalOpen(true);
                  }
                }}
                className="w-full justify-center text-xs font-medium min-h-[36px]"
                leftIcon={<IconGitMerge size={15} className="text-purple-600 dark:purple-400" />}
              >
                Gabung (Merge)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDiscontinueConfirm(true)}
                className="w-full justify-center text-xs font-medium min-h-[36px]"
                leftIcon={
                  selectedItem?.is_discontinued ? (
                    <IconCheck size={15} className="text-emerald-600" />
                  ) : (
                    <IconBan size={15} className="text-amber-600" />
                  )
                }
              >
                {selectedItem?.is_discontinued ? 'Aktifkan' : 'Discontinue'}
              </Button>
            </div>

            <div>
              <Button
                variant="danger"
                size="sm"
                onClick={handlePromptDelete}
                disabled={isCheckingDelete}
                className="w-full text-xs font-medium min-h-[36px]"
                leftIcon={isCheckingDelete ? <Spinner size="sm" /> : <IconTrash size={15} />}
              >
                {isCheckingDelete ? 'Memeriksa Kelayakan...' : 'Hapus Barang'}
              </Button>
            </div>
          </div>
        </AdminOnly>
      </Modal>

      <Modal
        isOpen={!!deletionBlockedInfo}
        onClose={() => setDeletionBlockedInfo(null)}
        title="Barang Memiliki Riwayat Transaksi"
        size="md"
        isBottomSheetOnMobile
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            <IconAlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950 dark:text-amber-100">
                Barang Tidak Dapat Dihapus Langsung
              </p>
              <p className="mt-1">
                Barang <strong>&quot;{deletionBlockedInfo?.nama_barang}&quot;</strong> telah tercatat dalam <strong>{deletionBlockedInfo?.total_transactions} transaksi</strong> (pembelian/penjualan). Menghapus barang ini secara permanen akan merusak laporan keuangan dan faktur nota supplier.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-900/60 p-3 border border-neutral-200/80 dark:border-neutral-800 text-xs space-y-1.5">
            <p className="font-bold text-neutral-700 dark:text-neutral-300 mb-1">Rincian Transaksi Terkait:</p>
            {deletionBlockedInfo?.breakdown.pembelian ? <p>• Pembelian Supplier: {deletionBlockedInfo.breakdown.pembelian} nota</p> : null}
            {deletionBlockedInfo?.breakdown.penjualan ? <p>• Penjualan Kasir: {deletionBlockedInfo.breakdown.penjualan} nota</p> : null}
            {deletionBlockedInfo?.breakdown.retur ? <p>• Retur Penjualan: {deletionBlockedInfo.breakdown.retur} transaksi</p> : null}
            {deletionBlockedInfo?.breakdown.opname ? <p>• Stock Opname: {deletionBlockedInfo.breakdown.opname} kali</p> : null}
            {deletionBlockedInfo?.breakdown.adjustment ? <p>• Penyesuaian Stok: {deletionBlockedInfo.breakdown.adjustment} kali</p> : null}
            {deletionBlockedInfo?.breakdown.transfer ? <p>• Transfer Gudang: {deletionBlockedInfo.breakdown.transfer} kali</p> : null}
            {deletionBlockedInfo?.breakdown.pengeluaran_gudang ? <p>• Pengeluaran Gudang: {deletionBlockedInfo.breakdown.pengeluaran_gudang} kali</p> : null}
          </div>

          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            💡 <strong>Apakah barang ini duplikat?</strong> Anda dapat menggabungkan stok dan riwayat transaksi barang ini ke barang utama menggunakan fitur <strong>Gabung Barang (Merge)</strong>, lalu barang duplikat ini akan otomatis terhapus bersih.
          </p>

          <div className="flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <Button
              variant="secondary"
              onClick={() => setDeletionBlockedInfo(null)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const itemToMerge = selectedItem;
                setDeletionBlockedInfo(null);
                if (itemToMerge) {
                  setMergeSourceItems([itemToMerge]);
                  setMergeModalOpen(true);
                }
              }}
              leftIcon={<IconGitMerge size={18} />}
              className="flex-1"
            >
              Gabung ke Barang Lain
            </Button>
          </div>
        </div>
      </Modal>

      <MergeInventoryModal
        isOpen={mergeModalOpen}
        onClose={() => setMergeModalOpen(false)}
        sourceItems={mergeSourceItems}
        onSuccess={handleMergeSuccess}
      />

      <BulkDeleteConfirmModal
        isOpen={bulkDeleteModalOpen}
        onClose={() => setBulkDeleteModalOpen(false)}
        selectedItems={items.filter((i) => selectedIds.has(i.id))}
        onSuccess={handleBulkDeleteSuccess}
        onRedirectToMerge={(itemsToMerge) => {
          setMergeSourceItems(itemsToMerge);
          setMergeModalOpen(true);
        }}
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

      <ConfirmDialog
        isOpen={discontinueConfirm}
        title={selectedItem?.is_discontinued ? 'Aktifkan Barang' : 'Discontinue Barang'}
        message={
          selectedItem?.is_discontinued
            ? `Apakah Anda yakin ingin mengaktifkan kembali "${selectedItem?.nama_barang}"?`
            : `Apakah Anda yakin ingin melakukan discontinue pada "${selectedItem?.nama_barang}"? Barang ini tidak akan muncul lagi di pencarian kasir.`
        }
        confirmLabel="Ya, Lanjutkan"
        cancelLabel="Batal"
        onConfirm={handleToggleDiscontinue}
        onCancel={() => setDiscontinueConfirm(false)}
        danger={!selectedItem?.is_discontinued}
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
            onChange={(val) => setPrintForm((prev) => ({ ...prev, template_id: val }))}
            options={templates.map((t) => ({ value: t.id, label: t.name }))}
            placeholder="Pilih template"
          />

          <TextInput
            label="Jumlah (Qty)"
            type="number"
            min={1}
            value={printForm.qty === 0 ? '' : printForm.qty}
            placeholder="1"
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const val = e.target.value;
              setPrintForm((prev) => ({
                ...prev,
                qty: val === '' ? 0 : Math.max(1, parseInt(val, 10) || 1),
              }));
            }}
            onBlur={() => {
              if (!printForm.qty || printForm.qty < 1) {
                setPrintForm((prev) => ({ ...prev, qty: 1 }));
              }
            }}
            required
          />

          <div className="mt-6 flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <Button variant="secondary" onClick={() => setPrintModalOpen(false)} className="flex-1">
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

      <PurchaseHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        inventoryId={selectedItem?.id || null}
        itemName={selectedItem?.nama_barang}
      />
    </>
  );
});
