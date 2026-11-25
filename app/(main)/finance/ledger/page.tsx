'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  IconBook,
  IconRefresh,
  IconDownload,
  IconChevronDown,
  IconPrinter,
  IconCoins,
  IconArrowDownLeft,
  IconArrowUpRight,
} from '@tabler/icons-react';
import { AmbientLayout, Button } from '@/components/ui';
import { useLedgerData } from './_hooks/useLedgerData';
import { LedgerSummaryCards } from './_components/LedgerSummaryCards';
import { LedgerFilterPanel } from './_components/LedgerFilterPanel';
import { LedgerTableSection } from './_components/LedgerTableSection';
import { LedgerModals } from './_components/LedgerModals';

export default function LedgerPage() {
  const {
    isFilterOpen,
    setIsFilterOpen,
    dateRange,
    setDateRange,
    startDateStr,
    endDateStr,
    selectedTipe,
    setSelectedTipe,
    selectedSumber,
    setSelectedSumber,
    selectedGudangId,
    setSelectedGudangId,
    searchTerm,
    setSearchTerm,
    page,
    setPage,
    limit,
    tempSumber,
    setTempSumber,
    tempGudangId,
    setTempGudangId,
    isModalOpen,
    setIsModalOpen,
    modalTipe,
    setModalTipe,
    modalSumber,
    setModalSumber,
    nominal,
    setNominal,
    keterangan,
    setKeterangan,
    modalTanggal,
    setModalTanggal,
    modalGudangId,
    setModalGudangId,
    isPrintModalOpen,
    setIsPrintModalOpen,
    isExportingCsv,
    gudangList,
    isLoading,
    hasLedgerError,
    isRefetching,
    refetchLedger,
    paginatedList,
    printItems,
    totalItems,
    totalPages,
    baselineOpeningBalance,
    totalPemasukan,
    totalPengeluaran,
    saldoAkhir,
    adjustSaldoMutation,
    handleSetSaldo,
    handleResetFilters,
    hasActiveFilters,
    handleExportCSV,
    handlePrint,
    refreshData,
  } = useLedgerData();

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setIsExportMenuOpen(false);
      }
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node)
      ) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <AmbientLayout>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
            <IconBook className="h-6 w-6" stroke={2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Buku Besar (Ledger)
            </h1>
            <p className="mt-0.5 hidden text-xs text-neutral-500 md:block dark:text-neutral-400">
              Pantau seluruh arus mutasi kas masuk dan keluar toko secara real-time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="secondary"
            onClick={refreshData}
            className="flex w-[42px] items-center justify-center !px-0"
            title="Muat Ulang"
            aria-label="Muat ulang buku besar"
          >
            <IconRefresh
              size={18}
              className={isRefetching ? 'animate-spin' : ''}
            />
          </Button>

          <div className="relative" ref={exportMenuRef}>
            <Button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="flex items-center gap-2"
              variant="secondary"
              aria-expanded={isExportMenuOpen}
            >
              <IconDownload size={18} />
              <span className="hidden sm:inline">Ekspor</span>
              <IconChevronDown
                size={16}
                className={`transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`}
              />
            </Button>
            {isExportMenuOpen && (
              <div className="animate-fade-in-up absolute right-0 z-50 mt-1.5 w-44 rounded-2xl border border-neutral-200 bg-white py-1.5 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
                <button
                  type="button"
                  disabled={isExportingCsv}
                  onClick={() => {
                    handleExportCSV();
                    setIsExportMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-brand-600 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-brand-400"
                >
                  <IconDownload size={16} />
                  {isExportingCsv ? 'Mengunduh...' : 'Ekspor CSV (.csv)'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPrintModalOpen(true);
                    setIsExportMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-brand-600 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-brand-400"
                >
                  <IconPrinter size={16} />
                  Cetak / PDF Rekening
                </button>
              </div>
            )}
          </div>

          <div className="relative" ref={moreMenuRef}>
            <Button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="flex items-center gap-2 bg-brand-600 text-white hover:bg-brand-700"
              variant="primary"
              aria-expanded={isMoreMenuOpen}
            >
              <IconCoins size={18} />
              <span className="hidden sm:inline">Penyesuaian Kas</span>
            </Button>
            {isMoreMenuOpen && (
              <div className="animate-fade-in-up absolute right-0 z-50 mt-1.5 w-52 rounded-2xl border border-neutral-200 bg-white py-1.5 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
                <button
                  type="button"
                  onClick={() => {
                    setModalTipe('PEMASUKAN');
                    setModalSumber('MODAL');
                    setKeterangan('Setor Modal / Tambahan Kas');
                    setIsModalOpen(true);
                    setIsMoreMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-emerald-600 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-emerald-400"
                >
                  <IconArrowDownLeft size={16} className="text-emerald-500" />
                  Tambah Saldo (Setor Modal)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalTipe('PENGELUARAN');
                    setModalSumber('MODAL');
                    setKeterangan('Penarikan Modal (Prive) / Selisih Kurang');
                    setIsModalOpen(true);
                    setIsMoreMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-rose-600 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-rose-400"
                >
                  <IconArrowUpRight size={16} className="text-rose-500" />
                  Kurang Saldo (Tarik Modal/Prive)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <LedgerSummaryCards
        startDateStr={startDateStr}
        endDateStr={endDateStr}
        saldoAkhir={saldoAkhir}
        baselineOpeningBalance={baselineOpeningBalance}
        totalPemasukan={totalPemasukan}
        totalPengeluaran={totalPengeluaran}
        selectedTipe={selectedTipe}
        onSelectTipe={(tipe) => {
          setSelectedTipe(tipe);
          setPage(1);
        }}
      />

      <LedgerFilterPanel
        searchTerm={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setPage(1);
        }}
        dateRange={dateRange}
        onDateRangeChange={(start, end) => {
          setDateRange({ startDate: start, endDate: end });
          setPage(1);
        }}
        selectedTipe={selectedTipe}
        onClearTipe={() => {
          setSelectedTipe('');
          setPage(1);
        }}
        selectedSumber={selectedSumber}
        onClearSumber={() => {
          setSelectedSumber('');
          setPage(1);
        }}
        selectedGudangId={selectedGudangId}
        onClearGudang={() => {
          setSelectedGudangId('');
          setTempGudangId('');
          setPage(1);
        }}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={handleResetFilters}
        isFilterOpen={isFilterOpen}
        onOpenFilter={() => {
          setTempSumber(selectedSumber);
          setTempGudangId(selectedGudangId);
          setIsFilterOpen(true);
        }}
        onCloseFilter={() => setIsFilterOpen(false)}
        tempGudangId={tempGudangId}
        onTempGudangChange={setTempGudangId}
        tempSumber={tempSumber}
        onTempSumberChange={setTempSumber}
        gudangList={gudangList}
        onResetDrawer={() => {
          setTempSumber('');
          setSelectedSumber('');
          setTempGudangId('');
          setSelectedGudangId('');
          setIsFilterOpen(false);
          setPage(1);
        }}
        onApplyDrawer={() => {
          setSelectedSumber(tempSumber);
          setSelectedGudangId(tempGudangId);
          setIsFilterOpen(false);
          setPage(1);
        }}
      />

      <LedgerTableSection
        hasLedgerError={hasLedgerError}
        onRetry={refetchLedger}
        isLoading={isLoading}
        paginatedList={paginatedList}
        startDateStr={startDateStr}
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        limit={limit}
        baselineOpeningBalance={baselineOpeningBalance}
        onPageChange={setPage}
      />

      <LedgerModals
        isModalOpen={isModalOpen}
        onCloseModal={() => setIsModalOpen(false)}
        modalTipe={modalTipe}
        onChangeModalTipe={setModalTipe}
        modalSumber={modalSumber}
        onChangeModalSumber={setModalSumber}
        modalGudangId={modalGudangId}
        onChangeModalGudangId={setModalGudangId}
        modalTanggal={modalTanggal}
        onChangeModalTanggal={setModalTanggal}
        nominal={nominal}
        onChangeNominal={setNominal}
        keterangan={keterangan}
        onChangeKeterangan={setKeterangan}
        gudangList={gudangList}
        isSubmittingSaldo={adjustSaldoMutation.isPending}
        onSubmitSaldo={handleSetSaldo}
        isPrintModalOpen={isPrintModalOpen}
        onClosePrintModal={() => setIsPrintModalOpen(false)}
        startDateStr={startDateStr}
        endDateStr={endDateStr}
        baselineOpeningBalance={baselineOpeningBalance}
        totalPemasukan={totalPemasukan}
        totalPengeluaran={totalPengeluaran}
        saldoAkhir={saldoAkhir}
        printItems={printItems}
        onPrint={handlePrint}
      />
    </AmbientLayout>
  );
}
