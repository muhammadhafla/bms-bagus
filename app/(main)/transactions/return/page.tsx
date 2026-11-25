'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { IconCheck, IconX } from '@tabler/icons-react';
import { AlasanRetur } from '@/lib/api/return';
import { Supplier } from '@/lib/api/supplier';
import { useReturnCart } from './_hooks/useReturnCart';
import { useReturnSubmit } from './_hooks/useReturnSubmit';
import { ReturnHeaderControls } from './_components/ReturnHeaderControls';
import { ReturnCartSection } from './_components/ReturnCartSection';
import { ReturnModals } from './_components/ReturnModals';

export default function NewReturnPage() {
  const router = useRouter();

  const cart = useReturnCart();
  const {
    suppliers,
    warehouses,
    selectedGudangId,
    selectedSupplier,
    setSelectedSupplier,
    aggregatedItems,
    loadingItems,
    metodeKompensasi,
    setMetodeKompensasi,
    note,
    setNote,
    error,
    setError,
    success,
    setSuccess,
    expandedRows,
    setExpandedRows,
    supplierModalOpen,
    setSupplierModalOpen,
    supplierOptions,
    pendingScanItem,
    setPendingScanItem,
    showResetConfirm,
    setShowResetConfirm,
    searchRef,
    loadSupplierItems,
    handleGudangChange,
    handleSelectSupplier,
    handleItemSelectedFromSearch,
    handleQtyChange,
    handleAlasanChange,
    handleRemoveItem,
    handleConfirmReset,
    clearAfterSubmit,
    activeCartItems,
    totalReturnAmount,
    totalReturnQty,
  } = cart;

  const submitState = useReturnSubmit({
    selectedSupplier,
    selectedGudangId,
    activeCartItems,
    metodeKompensasi,
    note,
    totalReturnAmount,
    totalReturnQty,
    setError,
    clearAfterSubmit,
  });

  const handleToggleExpand = useCallback(
    (inventoryId: string) => {
      setExpandedRows((prev) => ({
        ...prev,
        [inventoryId]: !prev[inventoryId],
      }));
    },
    [setExpandedRows],
  );

  const handlePickScannedSupplier = useCallback(
    async (
      matchedSup: Supplier,
      draft: Record<string, { qty: number; alasan: AlasanRetur }>,
    ) => {
      setSupplierModalOpen(false);
      setSelectedSupplier(matchedSup);
      await loadSupplierItems(matchedSup.id, selectedGudangId, draft);
      setSuccess(`Supplier diset ke ${matchedSup.nama} dan barang ditambahkan.`);
      setPendingScanItem(null);
      searchRef.current?.clearInput();
    },
    [
      loadSupplierItems,
      searchRef,
      selectedGudangId,
      setPendingScanItem,
      setSelectedSupplier,
      setSuccess,
      setSupplierModalOpen,
    ],
  );

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col px-3 py-4 sm:px-6 lg:py-6">
      <ReturnHeaderControls
        onBack={() => router.back()}
        selectedSupplier={selectedSupplier}
        onOpenResetConfirm={() => setShowResetConfirm(true)}
        warehouses={warehouses}
        selectedGudangId={selectedGudangId}
        onGudangChange={handleGudangChange}
        error={error}
        onDismissError={() => setError(null)}
        searchRef={searchRef}
        onItemSelected={handleItemSelectedFromSearch}
        aggregatedItems={aggregatedItems}
        suppliers={suppliers}
        onSelectSupplier={handleSelectSupplier}
      />

      {success && (
        <div
          role="status"
          className="animate-fade-in-up mb-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm font-medium text-emerald-800 shadow-xs dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <div className="flex items-center gap-2.5">
            <IconCheck size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{success}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccess(null)}
            aria-label="Tutup pesan sukses"
            className="rounded-lg p-1 text-emerald-600 transition hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
          >
            <IconX size={16} />
          </button>
        </div>
      )}

      <ReturnCartSection
        loadingItems={loadingItems}
        selectedSupplier={selectedSupplier}
        activeCartItems={activeCartItems}
        totalReturnQty={totalReturnQty}
        totalReturnAmount={totalReturnAmount}
        expandedRows={expandedRows}
        onToggleExpand={handleToggleExpand}
        onAlasanChange={handleAlasanChange}
        onQtyChange={handleQtyChange}
        onRemoveItem={handleRemoveItem}
        metodeKompensasi={metodeKompensasi}
        onMetodeKompensasiChange={setMetodeKompensasi}
        note={note}
        onNoteChange={setNote}
        submitting={submitState.submitting}
        onOpenResetConfirm={() => setShowResetConfirm(true)}
        onPrepareSubmit={submitState.handlePrepareSubmit}
      />

      <ReturnModals
        supplierModalOpen={supplierModalOpen}
        pendingScanItem={pendingScanItem}
        supplierOptions={supplierOptions}
        suppliers={suppliers}
        selectedGudangId={selectedGudangId}
        onCloseSupplierModal={() => {
          setSupplierModalOpen(false);
          setPendingScanItem(null);
        }}
        onPickScannedSupplier={handlePickScannedSupplier}
        showResetConfirm={showResetConfirm}
        onCloseResetConfirm={() => setShowResetConfirm(false)}
        onConfirmReset={handleConfirmReset}
        showPreview={submitState.showPreview}
        previewData={submitState.previewData}
        error={error}
        submitting={submitState.submitting}
        onClosePreview={() => submitState.setShowPreview(false)}
        onConfirmSubmit={submitState.handleConfirmSubmit}
        successModalData={submitState.successModalData}
        pdfError={submitState.pdfError}
        exportingPdf={submitState.exportingPdf}
        onExportPdf={submitState.handleExportPdf}
        onCloseSuccess={() => submitState.setSuccessModalData(null)}
        onNavigateHistory={() => router.push('/transactions/history')}
      />
    </div>
  );
}
