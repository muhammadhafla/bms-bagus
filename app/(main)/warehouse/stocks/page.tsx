'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { IconArrowDown } from '@tabler/icons-react';
import { AmbientLayout, PageLoadingSpinner, Spinner } from '@/components/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useWarehouseStocks } from './_hooks/useWarehouseStocks';
import { StockHeaderSection } from './_components/StockHeaderSection';
import { StockDataSection } from './_components/StockDataSection';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), {
  ssr: false,
});
const EditStockBinModal = dynamic(
  () => import('@/components/warehouse/EditStockBinModal'),
  { ssr: false },
);

export default function WarehouseStocksPage() {
  return (
    <Suspense
      fallback={
        <PageLoadingSpinner fullPage={false} message="Memuat stok gudang..." />
      }
    >
      <WarehouseStocksContent />
    </Suspense>
  );
}

function WarehouseStocksContent() {
  const state = useWarehouseStocks();

  return (
    <ErrorBoundary>
      <PullToRefresh
        onRefresh={async () => {
          await state.refetch();
        }}
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
        <AmbientLayout>
          <StockHeaderSection
            searchInputRef={state.searchInputRef}
            gudangList={state.gudangList}
            activeGudangId={state.activeGudangId}
            onSelectGudang={(gudangId) => {
              state.setSelectedGudangId(gudangId);
              state.setPage(1);
            }}
            search={state.search}
            debouncedSearch={state.debouncedSearch}
            onSearchChange={state.setSearch}
            stockStatus={state.stockStatus}
            onStockStatusChange={state.setStockStatus}
            categoryId={state.categoryId}
            onCategoryChange={state.setCategoryId}
            rakStatus={state.rakStatus}
            onRakStatusChange={state.setRakStatus}
            sortBy={state.sortBy}
            sortDir={state.sortDir}
            onSortChange={(newSortBy, newSortDir) => {
              state.setSortBy(newSortBy);
              state.setSortDir(newSortDir);
            }}
            kategoriList={state.kategoriList}
            activeFilterCount={state.activeFilterCount}
            hasActiveFilters={state.hasActiveFilters}
            totalCount={state.totalCount}
            isFilterOpen={state.isFilterOpen}
            onOpenFilter={() => state.setIsFilterOpen(true)}
            onCloseFilter={() => state.setIsFilterOpen(false)}
            onResetAll={state.resetAllFilters}
            onTransferNew={() => state.router.push('/warehouse/transfers/new')}
          />

          <StockDataSection
            stocksLoading={state.stocksLoading}
            error={state.error}
            items={state.items}
            activeGudang={state.activeGudang}
            activeGudangId={state.activeGudangId}
            hasActiveFilters={state.hasActiveFilters}
            page={state.page}
            totalPages={state.totalPages}
            totalCount={state.totalCount}
            limit={state.limit}
            onPageChange={state.setPage}
            onRefetch={() => state.refetch()}
            onResetAllFilters={state.resetAllFilters}
            onOpenEdit={state.handleOpenEdit}
            onNavigateTransfer={(barcode) =>
              state.router.push(
                `/warehouse/transfers/new?itemBarcode=${encodeURIComponent(barcode)}&asal=${state.activeGudangId}`,
              )
            }
            onNavigateCatalog={(query) =>
              state.router.push(`/inventory?search=${encodeURIComponent(query)}`)
            }
          />

          <EditStockBinModal
            isOpen={!!state.editingItem}
            onClose={() => state.setEditingItem(null)}
            item={state.editingItem}
            activeGudangId={state.activeGudangId}
            activeGudangKode={state.activeGudang?.kode_gudang}
            canEditThresholds={state.canEditThresholds}
            onSuccess={state.invalidateStocks}
          />
        </AmbientLayout>
      </PullToRefresh>
    </ErrorBoundary>
  );
}
