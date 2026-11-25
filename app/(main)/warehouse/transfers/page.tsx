'use client';

import React, { useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { IconArrowDown } from '@tabler/icons-react';
import { AmbientLayout, PageLoadingSpinner, Spinner } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useWarehouseTransfers } from './_hooks/useWarehouseTransfers';
import { renderTransferStatusBadge } from './_components/TransferStatusBadge';
import { TransferHeaderSection } from './_components/TransferHeaderSection';
import { TransferListSection } from './_components/TransferListSection';
import { TransferFilterPanel } from './_components/TransferFilterPanel';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });
const SuratJalanCameraScannerModal = dynamic(
  () => import('@/components/warehouse/SuratJalanCameraScannerModal'),
  { ssr: false },
);
const TransferDetailModal = dynamic(
  () => import('@/components/warehouse/TransferDetailModal'),
  { ssr: false },
);

export default function WarehouseTransfersPage() {
  return (
    <Suspense
      fallback={<PageLoadingSpinner fullPage={false} message="Memuat transfer stok..." />}
    >
      <WarehouseTransfersContent />
    </Suspense>
  );
}

function WarehouseTransfersContent() {
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const limit = isMobile ? 20 : 50;
  const searchInputRef = useRef<HTMLInputElement>(null);

  const state = useWarehouseTransfers({ limit, searchInputRef });

  const pageContent = (
    <AmbientLayout>
      <div className="flex flex-col gap-4 sm:gap-6">
        <TransferHeaderSection
          onNewTransfer={() => state.router.push('/warehouse/transfers/new')}
          searchInputRef={searchInputRef}
          search={state.search}
          onSearchChange={state.setSearch}
          onOpenScanner={() => state.setIsCameraScannerOpen(true)}
          isRestrictedBranchUser={state.isRestrictedBranchUser}
          userAssignedWarehouse={state.userAssignedWarehouse}
          warehouses={state.warehouses}
          selectedGudangId={state.selectedGudangId}
          onSelectGudang={(val) => {
            state.setSelectedGudangId(val);
            state.setPage(1);
          }}
          effectiveGudangId={state.effectiveGudangId}
          selectedWarehouseObj={state.selectedWarehouseObj}
          activeTab={state.activeTab}
          onTabChange={(tab) => {
            state.setActiveTab(tab);
            state.setPage(1);
          }}
          startDate={state.startDate}
          endDate={state.endDate}
          onClearDates={() => {
            state.setStartDate('');
            state.setEndDate('');
            state.setDateFilterPreset('all');
          }}
          activeFilterCount={state.activeFilterCount}
          onOpenFilter={() => state.setIsFilterOpen(true)}
          onResetFilters={state.handleResetFilters}
        />

        <TransferListSection
          transfers={state.transfers}
          transfersLoading={state.transfersLoading}
          canCancelTransfer={state.canCancelTransfer}
          activeFilterCount={state.activeFilterCount}
          search={state.search}
          page={state.page}
          totalPages={state.totalPages}
          totalCount={state.totalCount}
          limit={limit}
          onPageChange={state.setPage}
          onOpenDetail={state.handleOpenDetail}
          onCancelTransfer={state.setCancelTransferId}
          onResetFilters={state.handleResetFilters}
          onNewTransfer={() => state.router.push('/warehouse/transfers/new')}
        />

        <TransferFilterPanel
          isOpen={state.isFilterOpen}
          onClose={() => state.setIsFilterOpen(false)}
          activeTab={state.activeTab}
          onTabChange={state.setActiveTab}
          isRestrictedBranchUser={state.isRestrictedBranchUser}
          userAssignedWarehouse={state.userAssignedWarehouse}
          warehouses={state.warehouses}
          selectedGudangId={state.selectedGudangId}
          onSelectGudang={state.setSelectedGudangId}
          dateFilterPreset={state.dateFilterPreset}
          onApplyDatePreset={state.applyDatePreset}
          startDate={state.startDate}
          endDate={state.endDate}
          onStartDateChange={(val) => {
            state.setStartDate(val);
            state.setDateFilterPreset('custom');
          }}
          onEndDateChange={(val) => {
            state.setEndDate(val);
            state.setDateFilterPreset('custom');
          }}
          onResetFilters={state.handleResetFilters}
          onApply={() => {
            state.setPage(1);
            state.setIsFilterOpen(false);
          }}
        />

        <TransferDetailModal
          isOpen={!!state.selectedTransfer}
          onClose={() => state.setSelectedTransfer(null)}
          selectedTransfer={state.selectedTransfer}
          destinationWarning={state.destinationWarning}
          receiveItems={state.receiveItems}
          setReceiveItems={state.setReceiveItems}
          onTerimaSemuaSempurna={state.handleTerimaSemuaSempurna}
          onConfirmTerima={state.handleConfirmTerima}
          onKirim={(id) => state.kirimMutation.mutate(id)}
          isKirimLoading={state.kirimMutation.isPending}
          isTerimaLoading={state.terimaMutation.isPending}
          userGudangId={state.userGudangId}
          renderStatusBadge={renderTransferStatusBadge}
        />

        {state.cancelTransferId && (
          <ConfirmDialog
            isOpen={!!state.cancelTransferId}
            onCancel={() => state.setCancelTransferId(null)}
            onConfirm={() => {
              if (state.cancelTransferId) {
                state.cancelMutation.mutate(state.cancelTransferId);
              }
            }}
            title="Batalkan Draft Transfer"
            message="Apakah Anda yakin ingin membatalkan dokumen transfer ini? Data draft akan dihapus dari antrean."
            confirmLabel="Ya, Batalkan"
            cancelLabel="Kembali"
            danger={true}
            isLoading={state.cancelMutation.isPending}
          />
        )}

        <SuratJalanCameraScannerModal
          isOpen={state.isCameraScannerOpen}
          onClose={() => state.setIsCameraScannerOpen(false)}
          onScanSuccess={state.handleBarcodeScanned}
        />
      </div>
    </AmbientLayout>
  );

  return (
    <ErrorBoundary>
      <PullToRefresh
        onRefresh={state.handleManualRefresh}
        pullingContent={
          <div className="flex items-center justify-center py-4 text-neutral-400">
            <IconArrowDown className="h-5 w-5 animate-bounce" />
          </div>
        }
        refreshingContent={
          <div className="flex items-center justify-center py-4">
            <Spinner size="sm" />
          </div>
        }
      >
        {pageContent}
      </PullToRefresh>
    </ErrorBoundary>
  );
}
