'use client';

import React from 'react';
import Link from 'next/link';
import {
  IconDeviceFloppy,
  IconTrash,
  IconPrinter,
  IconBan,
  IconCheck,
  IconHistory,
  IconBuildingWarehouse,
  IconGitMerge,
  IconBolt,
} from '@tabler/icons-react';
import { InventoryItem } from '@/types/inventory';
import { InventoryStock } from '@/types/warehouse';
import { formatCurrency } from '@/lib/utils';
import { AdminOnly, RoleGuard } from '@/components/role';
import { Modal } from '@/components/ui/Modal';
import TextInput from '@/components/ui/TextInput';
import SelectInput from '@/components/ui/SelectInput';
import Button from '@/components/ui/Button';
import { PriceInput, Spinner } from '@/components/ui';
import { InventoryEditForm } from './useInventoryTableState';

interface InventorySlideOverModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: InventoryItem | null;
  editForm: InventoryEditForm;
  setEditForm: React.Dispatch<React.SetStateAction<InventoryEditForm>>;
  kategoriList: string[];
  canEdit: boolean;
  canViewHPP: boolean;
  isAdminUser: boolean;
  warehouseStocks: InventoryStock[];
  loadingWarehouseStocks: boolean;
  isCheckingDelete: boolean;
  onSave: () => void;
  onPromptDelete: () => void;
  onOpenHistory: () => void;
  onOpenPrint: () => void;
  onOpenMergeSingle: () => void;
  onOpenDiscontinue: () => void;
}

export function InventorySlideOverModal({
  isOpen,
  onClose,
  selectedItem,
  editForm,
  setEditForm,
  kategoriList,
  canEdit,
  canViewHPP,
  isAdminUser,
  warehouseStocks,
  loadingWarehouseStocks,
  isCheckingDelete,
  onSave,
  onPromptDelete,
  onOpenHistory,
  onOpenPrint,
  onOpenMergeSingle,
  onOpenDiscontinue,
}: InventorySlideOverModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedItem ? `Edit ${selectedItem.nama_barang}` : ''}
      size="3xl"
      isBottomSheetOnMobile
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            Tekan{' '}
            <kbd className="rounded bg-neutral-200 px-1 py-0.5 font-mono text-[10px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              Esc
            </kbd>{' '}
            untuk menutup
          </span>
          <div className="flex items-center gap-2.5">
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            {canEdit && (
              <Button
                variant="primary"
                onClick={onSave}
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
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Nama Barang
                  </p>
                  <p className="text-base font-semibold text-neutral-900 dark:text-white">
                    {editForm.nama_barang}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Barcode
                    </p>
                    <p className="font-mono text-sm text-neutral-900 dark:text-white">
                      {editForm.kode_barcode || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Kategori
                    </p>
                    <p className="text-sm text-neutral-900 dark:text-white">
                      {editForm.id_kategori || '-'}
                    </p>
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
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Harga Jual
                    </p>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                      {formatCurrency(editForm.harga_jual)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Diskon
                    </p>
                    <p className="text-sm text-neutral-900 dark:text-white">
                      {formatCurrency(editForm.diskon)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Minimum Stock
                    </p>
                    <p className="text-sm text-neutral-900 dark:text-white">
                      {editForm.minimum_stock}
                    </p>
                  </div>
                </div>
              </div>
            }
          >
            <div className="space-y-2 sm:space-y-3.5">
              {selectedItem?.is_discontinued && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                  <IconBan size={16} className="shrink-0" />
                  <span>
                    Barang ini telah di-discontinue (tidak aktif di transaksi baru)
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3.5">
                <div className="sm:col-span-2">
                  <TextInput
                    label="Nama Barang"
                    value={editForm.nama_barang}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, nama_barang: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <TextInput
                    label="Barcode"
                    value={editForm.kode_barcode}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        kode_barcode: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <SelectInput
                    label="Kategori"
                    value={editForm.id_kategori}
                    onChange={(value) =>
                      setEditForm((prev) => ({ ...prev, id_kategori: value }))
                    }
                    options={[...kategoriList]
                      .sort()
                      .map((k) => ({ value: k, label: k }))}
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
                    value={
                      editForm.minimum_stock === 0 ? '' : editForm.minimum_stock
                    }
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditForm((prev) => ({
                        ...prev,
                        minimum_stock:
                          val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0),
                      }));
                    }}
                  />
                </div>
              </div>
            </div>
          </RoleGuard>
        </div>

        <div className="mt-2.5 space-y-2.5 lg:col-span-5 lg:mt-0 lg:space-y-4">
          {selectedItem && (
            <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-2.5 sm:p-3 lg:p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
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
                <div className="animate-pulse py-2 text-center text-xs text-neutral-400">
                  Memuat rincian stok gudang...
                </div>
              ) : warehouseStocks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-200 bg-white/60 p-3 text-center text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-400">
                  Belum ada alokasi stok di modul gudang. Total stok saat ini:{' '}
                  <strong className="text-neutral-800 dark:text-neutral-200">
                    {selectedItem.stok} pcs
                  </strong>
                  .
                </div>
              ) : (
                <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
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
                          <span>
                            Rak:{' '}
                            <strong className="font-medium text-neutral-700 dark:text-neutral-300">
                              {ws.rak_lokasi || '-'}
                            </strong>
                          </span>
                          {ws.min_stok !== null && ws.min_stok !== undefined && (
                            <span>• Min: {ws.min_stok}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-neutral-900 dark:text-white">
                          {ws.stok}
                        </span>
                        <span className="ml-1 text-[11px] text-neutral-500">
                          pcs
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <AdminOnly>
            <div className="hidden rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-4 lg:block dark:border-neutral-800 dark:bg-neutral-900/60">
              <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                <IconBolt className="h-4 w-4 text-amber-500" />
                Aksi &amp; Utilitas Barang
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onOpenHistory}
                  className="w-full justify-start text-xs font-medium"
                  leftIcon={
                    <IconHistory
                      size={16}
                      className="text-brand-600 dark:text-brand-400"
                    />
                  }
                >
                  Riwayat Harga
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onOpenPrint}
                  className="w-full justify-start text-xs font-medium"
                  leftIcon={
                    <IconPrinter
                      size={16}
                      className="text-blue-600 dark:text-blue-400"
                    />
                  }
                >
                  Cetak Label
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onOpenMergeSingle}
                  className="w-full justify-start text-xs font-medium"
                  leftIcon={
                    <IconGitMerge
                      size={16}
                      className="dark:purple-400 text-purple-600"
                    />
                  }
                >
                  Gabung (Merge)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onOpenDiscontinue}
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
              <div className="mt-2.5 border-t border-neutral-200/80 pt-2.5 dark:border-neutral-800">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={onPromptDelete}
                  disabled={isCheckingDelete}
                  className="w-full text-xs font-medium"
                  leftIcon={
                    isCheckingDelete ? <Spinner size="sm" /> : <IconTrash size={16} />
                  }
                >
                  {isCheckingDelete ? 'Memeriksa Kelayakan...' : 'Hapus Barang'}
                </Button>
              </div>
            </div>
          </AdminOnly>
        </div>
      </div>

      {canEdit && (
        <div className="mt-3 flex flex-col gap-2 border-t border-neutral-200 pb-2 pt-3 lg:hidden dark:border-neutral-800">
          <Button
            variant="primary"
            size="sm"
            onClick={onSave}
            className="min-h-[40px] w-full text-xs font-semibold shadow-xs sm:text-sm"
            leftIcon={<IconDeviceFloppy size={18} />}
          >
            Simpan Perubahan
          </Button>

          <AdminOnly>
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenPrint}
                className="min-h-[36px] w-full justify-center text-xs font-medium"
                leftIcon={
                  <IconPrinter
                    size={15}
                    className="text-blue-600 dark:text-blue-400"
                  />
                }
              >
                Cetak Label
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenHistory}
                className="min-h-[36px] w-full justify-center text-xs font-medium"
                leftIcon={
                  <IconHistory
                    size={15}
                    className="text-brand-600 dark:text-brand-400"
                  />
                }
              >
                Riwayat Harga
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenMergeSingle}
                className="min-h-[36px] w-full justify-center text-xs font-medium"
                leftIcon={
                  <IconGitMerge
                    size={15}
                    className="dark:purple-400 text-purple-600"
                  />
                }
              >
                Gabung (Merge)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenDiscontinue}
                className="min-h-[36px] w-full justify-center text-xs font-medium"
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
                onClick={onPromptDelete}
                disabled={isCheckingDelete}
                className="min-h-[36px] w-full text-xs font-medium"
                leftIcon={
                  isCheckingDelete ? <Spinner size="sm" /> : <IconTrash size={15} />
                }
              >
                {isCheckingDelete ? 'Memeriksa Kelayakan...' : 'Hapus Barang'}
              </Button>
            </div>
          </AdminOnly>

          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="min-h-[36px] w-full justify-center text-xs font-medium"
          >
            Batal
          </Button>
        </div>
      )}
    </Modal>
  );
}
