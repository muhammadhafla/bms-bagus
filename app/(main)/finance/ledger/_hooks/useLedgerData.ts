'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ledgerApi, LedgerTipe, LedgerSumber } from '@/lib/api/ledger';
import { gudangApi } from '@/lib/api/warehouse';
import { getLocalDateString } from '@/lib/utils';
import { queryKeys } from '@/lib/queryKeys';

export function useLedgerData() {
  const queryClient = useQueryClient();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [selectedTipe, setSelectedTipe] = useState<LedgerTipe | ''>('');
  const [selectedSumber, setSelectedSumber] = useState<LedgerSumber | ''>('');
  const [selectedGudangId, setSelectedGudangId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  const [tempSumber, setTempSumber] = useState<LedgerSumber | ''>('');
  const [tempGudangId, setTempGudangId] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTipe, setModalTipe] = useState<LedgerTipe>('PEMASUKAN');
  const [modalSumber, setModalSumber] = useState<LedgerSumber>('MODAL');
  const [nominal, setNominal] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [modalTanggal, setModalTanggal] = useState(() => getLocalDateString());
  const [modalGudangId, setModalGudangId] = useState<string>('');

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  const { data: gudangRes } = useQuery({
    queryKey: ['gudang-list'],
    queryFn: () => gudangApi.getAll(),
    staleTime: 300000,
  });

  const gudangList = useMemo(() => gudangRes?.data || [], [gudangRes?.data]);
  const defaultGudangId = useMemo(
    () =>
      gudangList.find((g) => g.is_default)?.id || gudangList[0]?.id || '',
    [gudangList],
  );
  const resolvedModalGudangId = modalGudangId || defaultGudangId;

  const startDateStr = dateRange.startDate || '';
  const endDateStr = dateRange.endDate || '';

  const {
    data: ledgerRes,
    isLoading,
    isError: hasLedgerError,
    isRefetching,
    refetch: refetchLedger,
  } = useQuery({
    queryKey: [
      'buku_besar',
      'paginated',
      startDateStr,
      endDateStr,
      selectedTipe,
      selectedSumber,
      selectedGudangId,
      searchTerm,
      page,
      limit,
    ],
    queryFn: () =>
      ledgerApi.getBukuBesarPaginated({
        startDate: startDateStr || undefined,
        endDate: endDateStr || undefined,
        tipe: selectedTipe || undefined,
        sumber: selectedSumber || undefined,
        search: searchTerm || undefined,
        gudangId: selectedGudangId || undefined,
        page,
        limit,
      }),
    staleTime: 30000,
  });

  const { data: printLedgerRes } = useQuery({
    queryKey: [
      'buku_besar',
      'print_preview',
      startDateStr,
      endDateStr,
      selectedTipe,
      selectedSumber,
      selectedGudangId,
      searchTerm,
    ],
    queryFn: () =>
      ledgerApi.getBukuBesarPaginated({
        startDate: startDateStr || undefined,
        endDate: endDateStr || undefined,
        tipe: selectedTipe || undefined,
        sumber: selectedSumber || undefined,
        search: searchTerm || undefined,
        gudangId: selectedGudangId || undefined,
        page: 1,
        limit: 500,
      }),
    enabled: isPrintModalOpen,
    staleTime: 30000,
  });

  const paginatedList = useMemo(
    () => ledgerRes?.items || [],
    [ledgerRes?.items],
  );
  const totalItems = ledgerRes?.total_count || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  const baselineOpeningBalance = ledgerRes?.opening_balance ?? 0;
  const totalPemasukan = ledgerRes?.total_pemasukan ?? 0;
  const totalPengeluaran = ledgerRes?.total_pengeluaran ?? 0;
  const saldoAkhir = ledgerRes?.closing_balance ?? 0;

  const printItems = useMemo(
    () => printLedgerRes?.items || paginatedList,
    [printLedgerRes?.items, paginatedList],
  );

  const adjustSaldoMutation = useMutation({
    mutationFn: async () => {
      const numNominal = Number(nominal.replace(/\D/g, ''));
      if (!numNominal || numNominal <= 0) {
        throw new Error('Nominal harus lebih dari 0');
      }
      if (!keterangan.trim()) {
        throw new Error('Keterangan tidak boleh kosong');
      }
      if (!resolvedModalGudangId) {
        throw new Error('Lokasi Toko/Gudang harus dipilih');
      }

      return ledgerApi.insertPenyesuaianSaldo({
        tipe: modalTipe,
        sumber: modalSumber,
        nominal: numNominal,
        keterangan: keterangan.trim(),
        tanggal: modalTanggal,
        gudang_id: resolvedModalGudangId,
      });
    },
    onSuccess: () => {
      toast.success(
        modalTipe === 'PEMASUKAN'
          ? 'Penambahan saldo kas berhasil dicatat!'
          : 'Pengurangan saldo kas berhasil dicatat!',
      );
      setIsModalOpen(false);
      setNominal('');
      setKeterangan('');
      setModalTanggal(getLocalDateString());
      queryClient.invalidateQueries({ queryKey: queryKeys.ledger.all });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mencatat penyesuaian saldo');
    },
  });

  const handleSetSaldo = (e: React.FormEvent) => {
    e.preventDefault();
    adjustSaldoMutation.mutate();
  };

  const handleResetFilters = useCallback(() => {
    setDateRange({ startDate: '', endDate: '' });
    setSelectedTipe('');
    setSelectedSumber('');
    setTempSumber('');
    setSelectedGudangId('');
    setTempGudangId('');
    setSearchTerm('');
    setPage(1);
  }, []);

  const hasActiveFilters = Boolean(
    dateRange.startDate ||
      dateRange.endDate ||
      selectedTipe ||
      selectedSumber ||
      selectedGudangId ||
      searchTerm,
  );

  const handleExportCSV = useCallback(async () => {
    setIsExportingCsv(true);
    try {
      const params = new URLSearchParams();
      if (startDateStr) params.set('startDate', startDateStr);
      if (endDateStr) params.set('endDate', endDateStr);
      if (selectedTipe) params.set('tipe', selectedTipe);
      if (selectedSumber) params.set('sumber', selectedSumber);
      if (searchTerm) params.set('search', searchTerm);
      if (selectedGudangId) params.set('gudangId', selectedGudangId);

      const response = await fetch(
        `/api/export/finance/ledger/csv?${params.toString()}`,
      );
      if (!response.ok) {
        const msg = await response.text().catch(() => '');
        throw new Error(msg || 'Gagal mengekspor CSV Buku Besar');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Buku_Besar_${startDateStr || 'Semua'}_sd_${endDateStr || getLocalDateString()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('File CSV Buku Besar berhasil diunduh');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengunduh CSV Buku Besar');
    } finally {
      setIsExportingCsv(false);
    }
  }, [
    startDateStr,
    endDateStr,
    selectedTipe,
    selectedSumber,
    searchTerm,
    selectedGudangId,
  ]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.ledger.all });
    toast.success('Data diperbarui');
  }, [queryClient]);

  return {
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
    modalGudangId: resolvedModalGudangId,
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
  };
}
