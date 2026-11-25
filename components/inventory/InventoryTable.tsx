'use client';

import React from 'react';
import { IconPackage } from '@tabler/icons-react';
import { InventoryItem } from '@/types/inventory';
import {
  useInventoryTableState,
  InventoryPaginationProps,
} from './table/useInventoryTableState';
import { InventoryBulkActionBar } from './table/InventoryBulkActionBar';
import { InventoryDesktopTable } from './table/InventoryDesktopTable';
import { InventoryMobileCards } from './table/InventoryMobileCards';
import { InventorySlideOverModal } from './table/InventorySlideOverModal';
import { InventoryAuxiliaryModals } from './table/InventoryAuxiliaryModals';

interface InventoryTableProps {
  items: InventoryItem[];
  onUpdate: (id: string, data: Partial<InventoryItem>) => void;
  onDelete?: (id: string) => Promise<boolean | void> | void;
  onRefresh?: () => void;
  pagination?: InventoryPaginationProps;
  kategoriList: string[];
}

export const InventoryTable = React.memo(function InventoryTable({
  items,
  onUpdate,
  onDelete,
  onRefresh,
  pagination,
  kategoriList,
}: InventoryTableProps) {
  const state = useInventoryTableState({
    items,
    onUpdate,
    onDelete,
    onRefresh,
  });

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
      <InventoryBulkActionBar
        selectedCount={state.selectedIds.size}
        isAdminUser={state.isAdminUser}
        isBulkSnoozing={state.isBulkSnoozing}
        showBulkSnoozeOpts={state.showBulkSnoozeOpts}
        onToggleBulkSnoozeOpts={() =>
          state.setShowBulkSnoozeOpts((prev) => !prev)
        }
        bulkSnoozeRef={state.bulkSnoozeRef}
        onOpenBulkMerge={state.handleOpenBulkMerge}
        onOpenBulkDelete={state.handleOpenBulkDelete}
        onBulkSnooze={state.handleBulkSnooze}
      />

      <InventoryDesktopTable
        items={items}
        selectedIds={state.selectedIds}
        canViewHPP={state.canViewHPP}
        pagination={pagination}
        onToggleSelectAll={state.toggleSelectAll}
        onToggleSelect={state.toggleSelect}
        onOpenSlideOver={state.openSlideOver}
      />

      <InventoryMobileCards
        items={items}
        canViewHPP={state.canViewHPP}
        pagination={pagination}
        onOpenSlideOver={state.openSlideOver}
      />

      <InventorySlideOverModal
        isOpen={state.isSlideOverOpen}
        onClose={state.closeSlideOver}
        selectedItem={state.selectedItem}
        editForm={state.editForm}
        setEditForm={state.setEditForm}
        kategoriList={kategoriList}
        canEdit={state.canEdit}
        canViewHPP={state.canViewHPP}
        isAdminUser={state.isAdminUser}
        warehouseStocks={state.warehouseStocks}
        loadingWarehouseStocks={state.loadingWarehouseStocks}
        isCheckingDelete={state.isCheckingDelete}
        onSave={state.handleSave}
        onPromptDelete={state.handlePromptDelete}
        onOpenHistory={() => state.setHistoryModalOpen(true)}
        onOpenPrint={() => state.setPrintModalOpen(true)}
        onOpenMergeSingle={() => {
          if (state.selectedItem) {
            state.setMergeSourceItems([state.selectedItem]);
            state.setMergeModalOpen(true);
          }
        }}
        onOpenDiscontinue={() => state.setDiscontinueConfirm(true)}
      />

      <InventoryAuxiliaryModals
        selectedItem={state.selectedItem}
        editNamaBarang={state.editForm.nama_barang}
        isSlideOverOpen={state.isSlideOverOpen}
        deletionBlockedInfo={state.deletionBlockedInfo}
        onCloseDeletionBlocked={() => state.setDeletionBlockedInfo(null)}
        onRedirectMergeFromBlocked={() => {
          const itemToMerge = state.selectedItem;
          state.setDeletionBlockedInfo(null);
          if (itemToMerge) {
            state.setMergeSourceItems([itemToMerge]);
            state.setMergeModalOpen(true);
          }
        }}
        mergeModalOpen={state.mergeModalOpen}
        onCloseMerge={() => state.setMergeModalOpen(false)}
        mergeSourceItems={state.mergeSourceItems}
        onMergeSuccess={state.handleMergeSuccess}
        bulkDeleteModalOpen={state.bulkDeleteModalOpen}
        onCloseBulkDelete={() => state.setBulkDeleteModalOpen(false)}
        selectedItemsForBulkDelete={items.filter((i) =>
          state.selectedIds.has(i.id),
        )}
        onBulkDeleteSuccess={state.handleBulkDeleteSuccess}
        onRedirectToMerge={(itemsToMerge) => {
          state.setMergeSourceItems(itemsToMerge);
          state.setMergeModalOpen(true);
        }}
        deleteConfirm={state.deleteConfirm}
        onCloseDeleteConfirm={() => state.setDeleteConfirm(false)}
        onConfirmDelete={state.handleDelete}
        discontinueConfirm={state.discontinueConfirm}
        onCloseDiscontinueConfirm={() => state.setDiscontinueConfirm(false)}
        onConfirmDiscontinue={state.handleToggleDiscontinue}
        printModalOpen={state.printModalOpen}
        onClosePrintModal={() => state.setPrintModalOpen(false)}
        historyModalOpen={state.historyModalOpen}
        onCloseHistoryModal={() => state.setHistoryModalOpen(false)}
      />
    </>
  );
});
