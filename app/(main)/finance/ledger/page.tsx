'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ledgerApi, LedgerTipe, LedgerSumber } from '@/lib/api/ledger';
import { 
  Button, 
  Modal, 
  TextInput, 
  TextareaInput, 
  SelectInput,
  ModernPagination, 
  AmbientLayout,
  DateRangePicker
} from '@/components/ui';
import { 
  IconBook, 
  IconDownload,
  IconArrowUpRight, 
  IconArrowDownLeft,
  IconCoins,
  IconChevronDown,
  IconDotsVertical,
  IconSearch,
  IconFilter,
  IconPrinter,
  IconX,
  IconRefresh
} from '@tabler/icons-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';

export default function LedgerPage() {
  const queryClient = useQueryClient();

  // Filters State
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string }>({
    startDate: '',
    endDate: ''
  });
  const [selectedTipe, setSelectedTipe] = useState<string>('');
  const [selectedSumber, setSelectedSumber] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [page, setPage] = useState(1);
  const limit = 50;

  const startDateStr = dateRange.startDate || undefined;
  const endDateStr = dateRange.endDate || undefined;

  // 1. Fetch Saldo Awal Periode (Kumulatif sebelum startDate)
  const { data: openingBalance = 0, isLoading: isLoadingOpening } = useQuery({
    queryKey: ['buku_besar_opening_balance', startDateStr],
    queryFn: () => ledgerApi.getOpeningBalance(startDateStr),
    enabled: !!startDateStr,
  });

  // 2. Fetch Mutasi Buku Besar
  const { data: rawLedgerData, isLoading: isLoadingLedger, isRefetching } = useQuery({
    queryKey: ['buku_besar', startDateStr, endDateStr, selectedTipe, selectedSumber, searchTerm],
    queryFn: () => ledgerApi.getBukuBesar(
      startDateStr, 
      endDateStr, 
      (selectedTipe as LedgerTipe) || undefined, 
      (selectedSumber as LedgerSumber) || undefined,
      searchTerm || undefined
    ),
  });

  const isLoading = isLoadingLedger || (!!startDateStr && isLoadingOpening);

  // 3. Hitung Saldo Berjalan & Rekapitulasi secara Akurat
  const { ledgerWithSaldo, totalPemasukan, totalPengeluaran, saldoAkhir, baselineOpeningBalance } = useMemo(() => {
    const list = rawLedgerData || [];
    // Urutkan secara kronologis (terlama ke terbaru) untuk menghitung saldo berjalan
    const chronological = [...list].reverse();
    
    // Jika tidak ada filter tanggal, saldo awal mulai dari 0
    const startBalance = startDateStr ? Number(openingBalance) || 0 : 0;
    
    const accumulated = chronological.reduce(
      (acc, item: any) => {
        const nominal = Number(item.nominal) || 0;
        let newSaldo = acc.currentSaldo;
        let newMasuk = acc.sumMasuk;
        let newKeluar = acc.sumKeluar;

        if (item.tipe_transaksi === 'PEMASUKAN') {
          newSaldo += nominal;
          newMasuk += nominal;
        } else {
          newSaldo -= nominal;
          newKeluar += nominal;
        }

        acc.items.push({
          ...item,
          saldo_berjalan: newSaldo
        });

        return {
          items: acc.items,
          currentSaldo: newSaldo,
          sumMasuk: newMasuk,
          sumKeluar: newKeluar
        };
      },
      {
        items: [] as any[],
        currentSaldo: startBalance,
        sumMasuk: 0,
        sumKeluar: 0
      }
    );

    // Balik kembali agar urutan terbaru berada di atas (DESC)
    return {
      ledgerWithSaldo: accumulated.items.reverse(),
      totalPemasukan: accumulated.sumMasuk,
      totalPengeluaran: accumulated.sumKeluar,
      saldoAkhir: accumulated.currentSaldo,
      baselineOpeningBalance: startBalance
    };
  }, [rawLedgerData, startDateStr, openingBalance]);

  const totalItems = ledgerWithSaldo.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const paginatedList = ledgerWithSaldo.slice((page - 1) * limit, page * limit);

  // Modal Penyesuaian Saldo (Dua Arah)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTipe, setModalTipe] = useState<LedgerTipe>('PEMASUKAN');
  const [modalSumber, setModalSumber] = useState<LedgerSumber>('MODAL');
  const [nominal, setNominal] = useState('');
  const [modalTanggal, setModalTanggal] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [keterangan, setKeterangan] = useState('Setor Modal Awal / Tambahan');

  // Modal Cetak / Print Preview PDF
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Dropdowns
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mutation Penyesuaian Saldo
  const adjustSaldoMutation = useMutation({
    mutationFn: () => {
      const cleanNominal = Number(nominal.replace(/\D/g, ''));
      return ledgerApi.insertPenyesuaianSaldo({
        nominal: cleanNominal,
        tipe: modalTipe,
        sumber: modalSumber,
        keterangan,
        tanggal: modalTanggal
      });
    },
    onSuccess: () => {
      toast.success(`Penyesuaian saldo (${modalTipe === 'PEMASUKAN' ? 'Pemasukan' : 'Pengeluaran'}) berhasil disimpan`);
      setIsModalOpen(false);
      setNominal('');
      setKeterangan('Setor Modal Awal / Tambahan');
      setModalTanggal(format(new Date(), 'yyyy-MM-dd'));
      queryClient.invalidateQueries({ queryKey: ['buku_besar'] });
      queryClient.invalidateQueries({ queryKey: ['buku_besar_opening_balance'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan penyesuaian saldo');
    }
  });

  const handleSetSaldo = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNominal = Number(nominal.replace(/\D/g, ''));
    if (!cleanNominal || cleanNominal <= 0) {
      return toast.error('Nominal wajib diisi dan harus lebih dari 0');
    }
    if (!keterangan.trim()) {
      return toast.error('Keterangan penyesuaian wajib diisi');
    }
    adjustSaldoMutation.mutate();
  };

  // 4. Ekspor CSV Riil
  const handleExportCSV = () => {
    if (ledgerWithSaldo.length === 0 && (!startDateStr || baselineOpeningBalance === 0)) {
      toast.error('Tidak ada data mutasi untuk diekspor');
      return;
    }

    const headers = [
      'No',
      'Tanggal',
      'Waktu',
      'Keterangan',
      'Kategori/Sumber',
      'Tipe Transaksi',
      'Debit (Masuk Rp)',
      'Kredit (Keluar Rp)',
      'Saldo Berjalan (Rp)',
      'Petugas/Admin'
    ];

    const rows: (string | number)[][] = [];

    // Jika filter tanggal aktif, masukkan baris Saldo Awal Periode
    if (startDateStr) {
      rows.push([
        '',
        format(new Date(startDateStr), 'dd/MM/yyyy'),
        '-',
        'SALDO AWAL PERIODE',
        'SALDO AWAL',
        '-',
        '-',
        '-',
        baselineOpeningBalance,
        '-'
      ]);
    }

    ledgerWithSaldo.forEach((item: any, index: number) => {
      const tgl = item.tanggal ? format(new Date(item.tanggal), 'dd/MM/yyyy') : '-';
      const jam = item.created_at ? format(new Date(item.created_at), 'HH:mm') : '-';
      const debit = item.tipe_transaksi === 'PEMASUKAN' ? item.nominal : 0;
      const kredit = item.tipe_transaksi === 'PENGELUARAN' ? item.nominal : 0;
      const adminNama = item.profiles?.nama || '-';

      rows.push([
        index + 1,
        tgl,
        jam,
        `"${(item.keterangan || '').replace(/"/g, '""')}"`,
        `"${item.sumber.replace(/_/g, ' ')}"`,
        item.tipe_transaksi,
        debit,
        kredit,
        item.saldo_berjalan,
        `"${adminNama.replace(/"/g, '""')}"`
      ]);
    });

    // Baris Total / Rekapitulasi
    rows.push([]);
    rows.push([
      '',
      '',
      '',
      'TOTAL MUTASI & SALDO AKHIR',
      '',
      '',
      totalPemasukan,
      totalPengeluaran,
      saldoAkhir,
      ''
    ]);

    const csvString = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `buku_besar_${startDateStr || 'all'}_sd_${endDateStr || 'all'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Laporan Buku Besar (CSV) berhasil diunduh');
  };

  const handlePrint = () => {
    window.print();
  };

  const hasActiveFilters = !!startDateStr || !!endDateStr || !!selectedTipe || !!selectedSumber || !!searchTerm;

  const handleResetFilters = () => {
    setDateRange({ startDate: '', endDate: '' });
    setSelectedTipe('');
    setSelectedSumber('');
    setSearchTerm('');
    setPage(1);
  };

  // Helper badge warna berdasarkan sumber
  const getSumberBadge = (sumber: string) => {
    switch (sumber) {
      case 'PENJUALAN_SHIFT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/50';
      case 'PEMBELIAN_STOK':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800/50';
      case 'BIAYA_OPERASIONAL':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/50';
      case 'KASBON':
      case 'GAJI':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800/50';
      case 'RETUR_PENJUALAN':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/50';
      case 'MODAL':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/50';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700';
    }
  };

  return (
    <AmbientLayout>
      {/* Header Utama */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
            <IconBook className="h-6 w-6" stroke={2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Buku Besar (Ledger)</h1>
            <p className="hidden md:block text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Pantau seluruh arus mutasi kas masuk dan keluar toko secara real-time.
            </p>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Refresh button */}
          <Button 
            variant="secondary" 
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['buku_besar'] });
              queryClient.invalidateQueries({ queryKey: ['buku_besar_opening_balance'] });
              toast.success('Data diperbarui');
            }}
            className="w-[42px] !px-0 flex items-center justify-center"
            title="Muat Ulang"
          >
            <IconRefresh size={18} className={isRefetching ? 'animate-spin' : ''} />
          </Button>

          {/* Export Menu */}
          <div className="relative" ref={exportMenuRef}>
            <Button 
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} 
              className="flex items-center gap-2" 
              variant="secondary"
            >
              <IconDownload size={18} />
              <span className="hidden sm:inline">Ekspor</span>
              <IconChevronDown size={16} className={`transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
            </Button>
            {isExportMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-44 z-50 rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900 py-1.5 animate-fade-in-up">
                <button 
                  onClick={() => { handleExportCSV(); setIsExportMenuOpen(false); }} 
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs text-left text-neutral-700 hover:bg-neutral-50 hover:text-brand-600 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-brand-400 transition-colors font-medium"
                >
                  <IconDownload size={16} />
                  Ekspor CSV (.csv)
                </button>
                <button 
                  onClick={() => { setIsPrintModalOpen(true); setIsExportMenuOpen(false); }} 
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs text-left text-neutral-700 hover:bg-neutral-50 hover:text-brand-600 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-brand-400 transition-colors font-medium"
                >
                  <IconPrinter size={16} />
                  Cetak / PDF Rekening
                </button>
              </div>
            )}
          </div>

          {/* More Actions (Penyesuaian Saldo) */}
          <div className="relative" ref={moreMenuRef}>
            <Button 
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)} 
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white" 
              variant="primary"
            >
              <IconCoins size={18} />
              <span className="hidden sm:inline">Penyesuaian Kas</span>
            </Button>
            {isMoreMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-52 z-50 rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900 py-1.5 animate-fade-in-up">
                <button 
                  onClick={() => { 
                    setModalTipe('PEMASUKAN');
                    setModalSumber('MODAL');
                    setKeterangan('Setor Modal / Tambahan Kas');
                    setIsModalOpen(true); 
                    setIsMoreMenuOpen(false); 
                  }} 
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs text-left text-neutral-700 hover:bg-neutral-50 hover:text-emerald-600 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-emerald-400 transition-colors font-medium"
                >
                  <IconArrowDownLeft size={16} className="text-emerald-500" />
                  Tambah Saldo (Setor Modal)
                </button>
                <button 
                  onClick={() => { 
                    setModalTipe('PENGELUARAN');
                    setModalSumber('MODAL');
                    setKeterangan('Penarikan Modal (Prive) / Selisih Kurang');
                    setIsModalOpen(true); 
                    setIsMoreMenuOpen(false); 
                  }} 
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs text-left text-neutral-700 hover:bg-neutral-50 hover:text-rose-600 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-rose-400 transition-colors font-medium"
                >
                  <IconArrowUpRight size={16} className="text-rose-500" />
                  Kurang Saldo (Tarik Modal/Prive)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Unified Card */}
      <div className="mb-5 relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 p-6 text-white shadow-xl shadow-brand-500/10 z-0 print:hidden">
        <div className="absolute -right-6 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-black/20 blur-2xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-brand-200 text-xs font-bold uppercase tracking-wider">
                  {startDateStr ? `Saldo Akhir Periode (${format(new Date(startDateStr), 'd MMM', { locale: localeId })} - ${endDateStr ? format(new Date(endDateStr), 'd MMM yyyy', { locale: localeId }) : 'Sekarang'})` : 'Saldo Kas Berjalan Toko'}
                </span>
              </div>
              <p className="text-3xl sm:text-4xl font-black tracking-tight">
                Rp {saldoAkhir.toLocaleString('id-ID')}
              </p>
            </div>

            {startDateStr && (
              <div className="rounded-2xl bg-white/10 backdrop-blur-md px-4 py-2.5 border border-white/15 self-start sm:self-auto">
                <p className="text-[11px] font-medium text-brand-200 uppercase tracking-wider">Saldo Awal Periode</p>
                <p className="text-lg font-bold">Rp {baselineOpeningBalance.toLocaleString('id-ID')}</p>
              </div>
            )}
          </div>

          <div className="h-px w-full bg-white/20 mb-4" />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/20 backdrop-blur-md border border-emerald-400/30">
                <IconArrowDownLeft size={20} className="text-emerald-300" stroke={2.5} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-brand-200 uppercase tracking-wider">Total Masuk (Debit)</p>
                <p className="text-base sm:text-lg font-extrabold text-emerald-200">
                  + Rp {totalPemasukan.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 justify-end text-right">
              <div>
                <p className="text-[11px] font-bold text-brand-200 uppercase tracking-wider">Total Keluar (Kredit)</p>
                <p className="text-base sm:text-lg font-extrabold text-rose-200">
                  - Rp {totalPengeluaran.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-400/20 backdrop-blur-md border border-rose-400/30">
                <IconArrowUpRight size={20} className="text-rose-300" stroke={2.5} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
          {/* Rentang Tanggal */}
          <div className="w-full">
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5 block">
              Rentang Tanggal
            </label>
            <DateRangePicker 
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onChange={(start, end) => {
                setDateRange({ startDate: start, endDate: end });
                setPage(1);
              }}
            />
          </div>

          {/* Filter Tipe Transaksi */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5 block">
              Tipe Transaksi
            </label>
            <SelectInput
              value={selectedTipe}
              onChange={(val) => {
                setSelectedTipe(val);
                setPage(1);
              }}
              options={[
                { label: 'Semua Tipe', value: '' },
                { label: 'Pemasukan (Masuk)', value: 'PEMASUKAN' },
                { label: 'Pengeluaran (Keluar)', value: 'PENGELUARAN' },
              ]}
            />
          </div>

          {/* Filter Sumber Transaksi */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5 block">
              Kategori / Sumber
            </label>
            <SelectInput
              value={selectedSumber}
              onChange={(val) => {
                setSelectedSumber(val);
                setPage(1);
              }}
              options={[
                { label: 'Semua Sumber', value: '' },
                { label: 'Penjualan Shift Kasir', value: 'PENJUALAN_SHIFT' },
                { label: 'Pembelian Stok (Kulakan)', value: 'PEMBELIAN_STOK' },
                { label: 'Biaya Operasional', value: 'BIAYA_OPERASIONAL' },
                { label: 'Pencairan Kasbon', value: 'KASBON' },
                { label: 'Pembayaran Gaji / EWA', value: 'GAJI' },
                { label: 'Retur Penjualan', value: 'RETUR_PENJUALAN' },
                { label: 'Modal / Penyesuaian Kas', value: 'MODAL' },
                { label: 'Lain-lain', value: 'LAIN_LAIN' },
              ]}
            />
          </div>

          {/* Pencarian Keterangan */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5 block">
              Cari Keterangan
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari transaksi..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pl-9 pr-3 text-xs text-neutral-800 placeholder-neutral-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 dark:focus:bg-neutral-900"
              />
              <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  <IconX size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Summary & Reset */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <IconFilter size={14} className="text-brand-500" />
              <span>Filter aktif diterapkan ({totalItems} mutasi ditemukan)</span>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline flex items-center gap-1"
            >
              <IconX size={13} />
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-300">
            <thead className="bg-neutral-50 text-xs font-semibold uppercase text-neutral-500 dark:bg-neutral-800/50 dark:text-neutral-400">
              <tr>
                <th className="px-5 py-3.5">Waktu</th>
                <th className="px-5 py-3.5">Keterangan / Transaksi</th>
                <th className="px-5 py-3.5">Sumber</th>
                <th className="px-5 py-3.5 text-right">Debit (Masuk)</th>
                <th className="px-5 py-3.5 text-right">Kredit (Keluar)</th>
                <th className="px-5 py-3.5 text-right">Saldo Berjalan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                    <div className="inline-flex items-center gap-2 font-medium">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                      Memuat data buku besar...
                    </div>
                  </td>
                </tr>
              ) : paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                    Belum ada data mutasi yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                <>
                  {paginatedList.map((item: any) => (
                    <tr key={item.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-neutral-900 dark:text-white">
                          {format(new Date(item.tanggal), 'd MMM yyyy', { locale: localeId })}
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          {item.created_at ? format(new Date(item.created_at), 'HH:mm') : '-'}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-neutral-900 dark:text-white leading-snug">
                          {item.keterangan}
                        </p>
                        {item.profiles?.nama && (
                          <span className="text-[11px] text-neutral-400">
                            Dicatat oleh: {item.profiles.nama}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${getSumberBadge(item.sumber)}`}>
                          {item.sumber.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {item.tipe_transaksi === 'PEMASUKAN' ? `+ Rp ${Number(item.nominal).toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {item.tipe_transaksi === 'PENGELUARAN' ? `- Rp ${Number(item.nominal).toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                        Rp {Number(item.saldo_berjalan).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}

                  {/* Baris Saldo Awal Periode di akhir halaman terakhir / baseline */}
                  {startDateStr && page === totalPages && (
                    <tr className="bg-neutral-50/80 dark:bg-neutral-850 border-t-2 border-neutral-200 dark:border-neutral-700">
                      <td className="px-5 py-3 whitespace-nowrap font-bold text-neutral-600 dark:text-neutral-300">
                        {format(new Date(startDateStr), 'd MMM yyyy', { locale: localeId })}
                      </td>
                      <td colSpan={2} className="px-5 py-3">
                        <span className="font-bold text-neutral-700 dark:text-neutral-200">
                          Saldo Awal Periode (Sebelum {format(new Date(startDateStr), 'd MMMM yyyy', { locale: localeId })})
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-neutral-400">-</td>
                      <td className="px-5 py-3 text-right font-semibold text-neutral-400">-</td>
                      <td className="px-5 py-3 text-right font-black text-brand-700 dark:text-brand-300 whitespace-nowrap">
                        Rp {baselineOpeningBalance.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List View */}
      <div className="md:hidden flex flex-col gap-2.5 mt-3 print:hidden">
        {isLoading ? (
          <div className="py-8 px-4 text-center text-sm text-neutral-500">
            <div className="inline-flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              Memuat data mutasi...
            </div>
          </div>
        ) : paginatedList.length === 0 ? (
          <div className="py-8 px-4 text-center text-sm text-neutral-500 border border-dashed rounded-2xl">
            Belum ada mutasi sesuai filter.
          </div>
        ) : (
          <>
            {paginatedList.map((item: any) => (
              <div key={item.id} className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                  item.tipe_transaksi === 'PEMASUKAN' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                }`}>
                  {item.tipe_transaksi === 'PEMASUKAN' ? <IconArrowDownLeft size={20} stroke={2.5} /> : <IconArrowUpRight size={20} stroke={2.5} />}
                </div>

                <div className="flex-1 min-w-0 pr-1">
                  <p className="font-bold text-neutral-900 dark:text-white text-xs line-clamp-2">
                    {item.keterangan}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.2 text-[9px] font-bold border ${getSumberBadge(item.sumber)}`}>
                      {item.sumber.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      • {format(new Date(item.tanggal), 'd MMM yyyy', { locale: localeId })}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className={`font-black text-xs ${item.tipe_transaksi === 'PEMASUKAN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {item.tipe_transaksi === 'PEMASUKAN' ? '+' : '-'} {Number(item.nominal).toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] font-bold text-neutral-400 mt-0.5">
                    Sl: {Number(item.saldo_berjalan).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            ))}

            {startDateStr && page === totalPages && (
              <div className="bg-neutral-50 dark:bg-neutral-800/60 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl p-3 text-center">
                <p className="text-[11px] font-bold text-neutral-500 uppercase">
                  Saldo Awal Periode (Sebelum {format(new Date(startDateStr), 'd MMM yyyy', { locale: localeId })})
                </p>
                <p className="text-base font-black text-brand-600 dark:text-brand-400 mt-0.5">
                  Rp {baselineOpeningBalance.toLocaleString('id-ID')}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 print:hidden">
          <ModernPagination
            page={page}
            totalPages={totalPages}
            total={totalItems}
            limit={limit}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Modal Penyesuaian Saldo (Dua Arah) */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={`Penyesuaian Saldo Kas (${modalTipe === 'PEMASUKAN' ? 'Pemasukan' : 'Pengeluaran'})`} 
        isBottomSheetOnMobile
      >
        <form onSubmit={handleSetSaldo} className="flex flex-col gap-4 mt-3">
          {/* Tipe Penyesuaian Switch */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setModalTipe('PEMASUKAN');
                if (keterangan.includes('Penarikan')) setKeterangan('Setor Modal / Tambahan Kas');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                modalTipe === 'PEMASUKAN'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              <IconArrowDownLeft size={16} />
              Tambah Saldo (Masuk)
            </button>
            <button
              type="button"
              onClick={() => {
                setModalTipe('PENGELUARAN');
                if (keterangan.includes('Setor')) setKeterangan('Penarikan Modal (Prive) / Koreksi');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                modalTipe === 'PENGELUARAN'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              <IconArrowUpRight size={16} />
              Kurang Saldo (Keluar)
            </button>
          </div>

          <div className={`rounded-xl p-3 text-xs border ${
            modalTipe === 'PEMASUKAN' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/50'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/50'
          }`}>
            {modalTipe === 'PEMASUKAN' 
              ? 'Transaksi ini akan menambah saldo kas toko dan tercatat sebagai Debit (Pemasukan).'
              : 'Transaksi ini akan mengurangi saldo kas toko dan tercatat sebagai Kredit (Pengeluaran).'}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SelectInput
              label="Kategori Sumber"
              value={modalSumber}
              onChange={(val) => setModalSumber(val as LedgerSumber)}
              options={[
                { label: 'Modal / Pemilik', value: 'MODAL' },
                { label: 'Lain-lain', value: 'LAIN_LAIN' },
              ]}
            />
            <TextInput
              label="Tanggal Transaksi"
              type="date"
              value={modalTanggal}
              onChange={(e) => setModalTanggal(e.target.value)}
              required
            />
          </div>

          <TextInput
            label="Nominal (Rp)"
            value={nominal}
            onChange={(e) => {
              const num = e.target.value.replace(/\D/g, '');
              setNominal(num ? Number(num).toLocaleString('id-ID') : '');
            }}
            placeholder="0"
            required
            className="text-lg font-bold"
          />

          <TextareaInput
            label="Keterangan / Alasan Penyesuaian"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Contoh: Setoran modal awal kasir, penarikan prive pemilik, selisih fisik opname..."
            required
            rows={2}
          />

          <div className="mt-2 flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">
              Batal
            </Button>
            <Button 
              variant="primary" 
              type="submit" 
              disabled={adjustSaldoMutation.isPending}
              className={modalTipe === 'PEMASUKAN' ? '!bg-emerald-600 hover:!bg-emerald-700' : '!bg-rose-600 hover:!bg-rose-700'}
            >
              {adjustSaldoMutation.isPending ? 'Menyimpan...' : 'Simpan Penyesuaian'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Cetak / Print Preview PDF */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Laporan Rekening Koran Buku Besar"
        size="xl"
      >
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <p className="text-xs text-neutral-500">
                Periode: <span className="font-bold text-neutral-900 dark:text-white">
                  {startDateStr ? `${format(new Date(startDateStr), 'd MMM yyyy', { locale: localeId })} s/d ${endDateStr ? format(new Date(endDateStr), 'd MMM yyyy', { locale: localeId }) : 'Sekarang'}` : 'Semua Periode Transaksi'}
                </span>
              </p>
              <p className="text-[11px] text-neutral-400">Dicetak pada: {format(new Date(), 'd MMMM yyyy HH:mm', { locale: localeId })}</p>
            </div>
            <Button variant="primary" onClick={handlePrint} className="flex items-center gap-2">
              <IconPrinter size={16} />
              Cetak Dokumen / Simpan PDF
            </Button>
          </div>

          {/* Printable Report Box */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 max-h-[60vh] overflow-y-auto bg-neutral-50/50 dark:bg-neutral-950">
            {/* Header Cetak */}
            <div className="text-center pb-4 mb-4 border-b border-neutral-300 dark:border-neutral-700">
              <h2 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">LAPORAN REKENING KORAN BUKU BESAR</h2>
              <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Toko Inventory & POS BMS</p>
            </div>

            {/* Summary Box */}
            <div className="grid grid-cols-4 gap-2 mb-4 text-center">
              <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] font-bold text-neutral-400 uppercase">Saldo Awal</p>
                <p className="text-xs font-black text-neutral-900 dark:text-white mt-0.5">Rp {baselineOpeningBalance.toLocaleString('id-ID')}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] font-bold text-emerald-500 uppercase">Total Debit</p>
                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">+ Rp {totalPemasukan.toLocaleString('id-ID')}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] font-bold text-rose-500 uppercase">Total Kredit</p>
                <p className="text-xs font-black text-rose-600 dark:text-rose-400 mt-0.5">- Rp {totalPengeluaran.toLocaleString('id-ID')}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-brand-500 text-white">
                <p className="text-[10px] font-bold text-brand-100 uppercase">Saldo Akhir</p>
                <p className="text-xs font-black mt-0.5">Rp {saldoAkhir.toLocaleString('id-ID')}</p>
              </div>
            </div>

            {/* Table */}
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 font-bold uppercase text-[10px] text-neutral-600 dark:text-neutral-400">
                <tr>
                  <th className="py-2 px-2">Tanggal</th>
                  <th className="py-2 px-2">Keterangan</th>
                  <th className="py-2 px-2">Sumber</th>
                  <th className="py-2 px-2 text-right">Debit (Rp)</th>
                  <th className="py-2 px-2 text-right">Kredit (Rp)</th>
                  <th className="py-2 px-2 text-right">Saldo (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {ledgerWithSaldo.map((item: any) => (
                  <tr key={item.id}>
                    <td className="py-2 px-2 whitespace-nowrap">{format(new Date(item.tanggal), 'dd/MM/yyyy')}</td>
                    <td className="py-2 px-2">{item.keterangan}</td>
                    <td className="py-2 px-2 whitespace-nowrap text-[10px]">{item.sumber.replace(/_/g, ' ')}</td>
                    <td className="py-2 px-2 text-right text-emerald-600 font-medium">
                      {item.tipe_transaksi === 'PEMASUKAN' ? Number(item.nominal).toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="py-2 px-2 text-right text-rose-600 font-medium">
                      {item.tipe_transaksi === 'PENGELUARAN' ? Number(item.nominal).toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="py-2 px-2 text-right font-bold">
                      {Number(item.saldo_berjalan).toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsPrintModalOpen(false)}>
              Tutup
            </Button>
          </div>
        </div>
      </Modal>
    </AmbientLayout>
  );
}
