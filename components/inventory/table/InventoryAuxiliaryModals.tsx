'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { IconAlertTriangle, IconGitMerge } from '@tabler/icons-react';
import { InventoryItem, InventoryDeletionCheck } from '@/types/inventory';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import Button from '@/components/ui/Button';

const PurchaseHistoryModal = dynamic(
  () => import('../PurchaseHistoryModal').then((mod) => mod.PurchaseHistoryModal),
  { ssr: false },
);
const MergeInventoryModal = dynamic(
  () => import('../MergeInventoryModal').then((mod) => mod.MergeInventoryModal),
  { ssr: false },
);
const BulkDeleteConfirmModal = dynamic(
  () => import('../BulkDeleteConfirmModal').then((mod) => mod.BulkDeleteConfirmModal),
  { ssr: false },
);
const InventoryPrintModal = dynamic(() => import('../InventoryPrintModal'), {
  ssr: false,
});

interface InventoryAuxiliaryModalsProps {
  selectedItem: InventoryItem | null;
  editNamaBarang: string;
  isSlideOverOpen: boolean;
  deletionBlockedInfo: InventoryDeletionCheck | null;
  onCloseDeletionBlocked: () => void;
  onRedirectMergeFromBlocked: () => void;
  mergeModalOpen: boolean;
  onCloseMerge: () => void;
  mergeSourceItems: InventoryItem[];
  onMergeSuccess: () => void;
  bulkDeleteModalOpen: boolean;
  onCloseBulkDelete: () => void;
  selectedItemsForBulkDelete: InventoryItem[];
  onBulkDeleteSuccess: () => void;
  onRedirectToMerge: (itemsToMerge: InventoryItem[]) => void;
  deleteConfirm: boolean;
  onCloseDeleteConfirm: () => void;
  onConfirmDelete: () => void;
  discontinueConfirm: boolean;
  onCloseDiscontinueConfirm: () => void;
  onConfirmDiscontinue: () => void;
  printModalOpen: boolean;
  onClosePrintModal: () => void;
  historyModalOpen: boolean;
  onCloseHistoryModal: () => void;
}

export function InventoryAuxiliaryModals({
  selectedItem,
  editNamaBarang,
  isSlideOverOpen,
  deletionBlockedInfo,
  onCloseDeletionBlocked,
  onRedirectMergeFromBlocked,
  mergeModalOpen,
  onCloseMerge,
  mergeSourceItems,
  onMergeSuccess,
  bulkDeleteModalOpen,
  onCloseBulkDelete,
  selectedItemsForBulkDelete,
  onBulkDeleteSuccess,
  onRedirectToMerge,
  deleteConfirm,
  onCloseDeleteConfirm,
  onConfirmDelete,
  discontinueConfirm,
  onCloseDiscontinueConfirm,
  onConfirmDiscontinue,
  printModalOpen,
  onClosePrintModal,
  historyModalOpen,
  onCloseHistoryModal,
}: InventoryAuxiliaryModalsProps) {
  return (
    <>
      <Modal
        isOpen={!!deletionBlockedInfo}
        onClose={onCloseDeletionBlocked}
        title="Barang Memiliki Riwayat Transaksi"
        size="md"
        isBottomSheetOnMobile
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            <IconAlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold text-amber-950 dark:text-amber-100">
                Barang Tidak Dapat Dihapus Langsung
              </p>
              <p className="mt-1">
                Barang <strong>&quot;{deletionBlockedInfo?.nama_barang}&quot;</strong> telah
                tercatat dalam <strong>{deletionBlockedInfo?.total_transactions} transaksi</strong>{' '}
                (pembelian/penjualan). Menghapus barang ini secara permanen akan merusak laporan
                keuangan dan faktur nota supplier.
              </p>
            </div>
          </div>

          <div className="space-y-1.5 rounded-xl border border-neutral-200/80 bg-neutral-50 p-3 text-xs dark:border-neutral-800 dark:bg-neutral-900/60">
            <p className="mb-1 font-bold text-neutral-700 dark:text-neutral-300">
              Rincian Transaksi Terkait:
            </p>
            {deletionBlockedInfo?.breakdown.pembelian ? (
              <p>• Pembelian Supplier: {deletionBlockedInfo.breakdown.pembelian} nota</p>
            ) : null}
            {deletionBlockedInfo?.breakdown.penjualan ? (
              <p>• Penjualan Kasir: {deletionBlockedInfo.breakdown.penjualan} nota</p>
            ) : null}
            {deletionBlockedInfo?.breakdown.retur ? (
              <p>• Retur Penjualan: {deletionBlockedInfo.breakdown.retur} transaksi</p>
            ) : null}
            {deletionBlockedInfo?.breakdown.opname ? (
              <p>• Stock Opname: {deletionBlockedInfo.breakdown.opname} kali</p>
            ) : null}
            {deletionBlockedInfo?.breakdown.adjustment ? (
              <p>• Penyesuaian Stok: {deletionBlockedInfo.breakdown.adjustment} kali</p>
            ) : null}
            {deletionBlockedInfo?.breakdown.transfer ? (
              <p>• Transfer Gudang: {deletionBlockedInfo.breakdown.transfer} kali</p>
            ) : null}
            {deletionBlockedInfo?.breakdown.pengeluaran_gudang ? (
              <p>
                • Pengeluaran Gudang: {deletionBlockedInfo.breakdown.pengeluaran_gudang} kali
              </p>
            ) : null}
          </div>

          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            💡 <strong>Apakah barang ini duplikat?</strong> Anda dapat menggabungkan stok dan
            riwayat transaksi barang ini ke barang utama menggunakan fitur{' '}
            <strong>Gabung Barang (Merge)</strong>, lalu barang duplikat ini akan otomatis
            terhapus bersih.
          </p>

          <div className="flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <Button
              variant="secondary"
              onClick={onCloseDeletionBlocked}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={onRedirectMergeFromBlocked}
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
        onClose={onCloseMerge}
        sourceItems={mergeSourceItems}
        onSuccess={onMergeSuccess}
        nested={isSlideOverOpen || bulkDeleteModalOpen || !!deletionBlockedInfo}
      />

      <BulkDeleteConfirmModal
        isOpen={bulkDeleteModalOpen}
        onClose={onCloseBulkDelete}
        selectedItems={selectedItemsForBulkDelete}
        onSuccess={onBulkDeleteSuccess}
        onRedirectToMerge={onRedirectToMerge}
      />

      <ConfirmDialog
        isOpen={deleteConfirm}
        title="Hapus Barang"
        message={`Apakah Anda yakin ingin menghapus "${editNamaBarang}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        onConfirm={onConfirmDelete}
        onCancel={onCloseDeleteConfirm}
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
        onConfirm={onConfirmDiscontinue}
        onCancel={onCloseDiscontinueConfirm}
        danger={!selectedItem?.is_discontinued}
      />

      <InventoryPrintModal
        isOpen={printModalOpen}
        onClose={onClosePrintModal}
        item={selectedItem}
        nested={isSlideOverOpen}
      />

      <PurchaseHistoryModal
        isOpen={historyModalOpen}
        onClose={onCloseHistoryModal}
        inventoryId={selectedItem?.id || null}
        itemName={selectedItem?.nama_barang}
        nested={isSlideOverOpen}
      />
    </>
  );
}
