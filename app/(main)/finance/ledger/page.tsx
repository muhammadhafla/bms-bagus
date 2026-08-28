'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ledgerApi } from '@/lib/api/ledger';
import { useAuthStore } from '@/lib/auth';
import { 
  Button, 
  Modal, 
  TextInput, 
  TextareaInput, 
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
  IconDotsVertical
} from '@tabler/icons-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';

export default function LedgerPage() {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === 'admin' || (profile?.role as string) === 'owner';

  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string }>({
    startDate: '',
    endDate: ''
  });
  
  const [page, setPage] = useState(1);
  const limit = 50;

  const startDateStr = dateRange.startDate || undefined;
  const endDateStr = dateRange.endDate || undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['buku_besar', startDateStr, endDateStr],
    queryFn: () => ledgerApi.getBukuBesar(startDateStr, endDateStr),
    enabled: isAdmin
  });

  // Hitung Saldo Berjalan & Rekap
  const { ledgerWithSaldo, totalPemasukan, totalPengeluaran, saldoAkhir } = useMemo(() => {
    const reversed = [...(data || [])].reverse();
    
    const result = reversed.reduce((acc, item) => {
      let newSaldo = acc.saldoAkhir;
      let newPem = acc.totalPemasukan;
      let newPeng = acc.totalPengeluaran;

      if (item.tipe_transaksi === 'PEMASUKAN') {
        newSaldo += item.nominal;
        newPem += item.nominal;
      } else {
        newSaldo -= item.nominal;
        newPeng += item.nominal;
      }

      acc.mapped.push({ ...item, saldo_berjalan: newSaldo });
      acc.saldoAkhir = newSaldo;
      acc.totalPemasukan = newPem;
      acc.totalPengeluaran = newPeng;
      return acc;
    }, { mapped: [] as any[], saldoAkhir: 0, totalPemasukan: 0, totalPengeluaran: 0 });

    return {
      ledgerWithSaldo: result.mapped.reverse(),
      totalPemasukan: result.totalPemasukan,
      totalPengeluaran: result.totalPengeluaran,
      saldoAkhir: result.saldoAkhir
    };
  }, [data]);

  const totalItems = ledgerWithSaldo.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const paginatedList = ledgerWithSaldo.slice((page - 1) * limit, page * limit);

  // Modal Saldo Awal / Penyesuaian
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nominal, setNominal] = useState('');
  const [keterangan, setKeterangan] = useState('Penyesuaian Saldo');

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

  const insertSaldoMutation = useMutation({
    mutationFn: () => ledgerApi.insertSaldoAwalBukuBesar(Number(nominal.replace(/\D/g, '')), keterangan),
    onSuccess: () => {
      toast.success('Penyesuaian saldo berhasil disimpan');
      setIsModalOpen(false);
      setNominal('');
      queryClient.invalidateQueries({ queryKey: ['buku_besar'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal set saldo awal');
    }
  });

  const handleSetSaldo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nominal) return toast.error('Nominal wajib diisi');
    insertSaldoMutation.mutate();
  };

  const handleExport = (format: 'pdf' | 'csv') => {
    // Basic export stub
    toast.info(`Ekspor ke ${format.toUpperCase()} akan segera tersedia.`);
  };

  if (!isAdmin) {
    return <div className="p-8 text-center text-red-500 font-bold">Akses Ditolak. Halaman ini hanya untuk Admin/Owner.</div>;
  }

  return (
    <AmbientLayout>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <IconBook className="h-8 w-8 text-brand-500" stroke={1.5} />
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Buku Besar (Ledger)</h1>
            <p className="hidden md:block text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Pantau seluruh mutasi arus kas toko (Rekening Koran).
            </p>
          </div>
        </div>
        {/* Actions & Filters */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 z-10 w-full sm:w-auto mt-2 sm:mt-0">
          <div className="flex-1 min-w-0 sm:flex-none">
            <DateRangePicker 
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onChange={(start, end) => {
                setDateRange({ startDate: start, endDate: end });
                setPage(1);
              }}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative" ref={exportMenuRef}>
              <Button onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} className="w-[44px] sm:w-auto !px-0 sm:!px-4 flex justify-center items-center gap-2" variant="secondary">
                <IconDownload size={18} />
                <span className="hidden sm:inline">Ekspor</span>
                <IconChevronDown size={16} className={`hidden sm:block transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
              </Button>
              {isExportMenuOpen && (
                <div className="absolute right-0 mt-1 w-32 z-50 rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900 py-1 animate-fade-in-up">
                  <button 
                    onClick={() => { handleExport('pdf'); setIsExportMenuOpen(false); }} 
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-left text-neutral-700 hover:bg-neutral-100 hover:text-brand-600 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-brand-400 transition-colors focus:bg-neutral-100 focus:outline-none dark:focus:bg-neutral-800 font-medium"
                  >
                    Ekspor PDF
                  </button>
                  <button 
                    onClick={() => { handleExport('csv'); setIsExportMenuOpen(false); }} 
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-left text-neutral-700 hover:bg-neutral-100 hover:text-brand-600 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-brand-400 transition-colors focus:bg-neutral-100 focus:outline-none dark:focus:bg-neutral-800 font-medium"
                  >
                    Ekspor CSV
                  </button>
                </div>
              )}
            </div>
            <div className="relative" ref={moreMenuRef}>
              <Button onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)} className="w-[44px] !px-0 flex justify-center items-center" variant="secondary">
                <IconDotsVertical size={18} />
              </Button>
              {isMoreMenuOpen && (
                <div className="absolute right-0 mt-1 w-48 z-50 rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900 py-1 animate-fade-in-up">
                  <button 
                    onClick={() => { setIsModalOpen(true); setIsMoreMenuOpen(false); }} 
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-left text-neutral-700 hover:bg-neutral-100 hover:text-brand-600 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-brand-400 transition-colors focus:bg-neutral-100 focus:outline-none dark:focus:bg-neutral-800 font-medium"
                  >
                    <IconCoins size={16} />
                    Penyesuaian Saldo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Unified Card */}
      <div className="mb-5 relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-5 text-white shadow-md z-0">
        {/* Dekorasi Background */}
        <div className="absolute -right-4 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
        <div className="absolute -left-6 -bottom-6 h-24 w-24 rounded-full bg-black/10 blur-xl"></div>
        
        <div className="relative z-10">
          <div className="mb-4">
            <p className="text-brand-100 text-xs font-semibold uppercase tracking-wider mb-1">Saldo Akhir</p>
            <p className="text-3xl font-black tracking-tight">Rp {saldoAkhir.toLocaleString('id-ID')}</p>
          </div>

          <div className="h-px w-full bg-white/20 mb-4" />

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1 text-brand-100">
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400/20">
                  <IconArrowDownLeft size={12} className="text-emerald-300" stroke={3} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider">Total Masuk</p>
              </div>
              <p className="text-sm font-bold">Rp {totalPemasukan.toLocaleString('id-ID')}</p>
            </div>
            
            <div className="h-8 w-px bg-white/20" />

            <div className="flex-1 text-right">
              <div className="flex items-center justify-end gap-1.5 mb-1 text-brand-100">
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-400/20">
                  <IconArrowUpRight size={12} className="text-rose-300" stroke={3} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider">Total Keluar</p>
              </div>
              <p className="text-sm font-bold">Rp {totalPengeluaran.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-300">
            <thead className="bg-neutral-50 text-xs font-semibold uppercase text-neutral-500 dark:bg-neutral-800/50 dark:text-neutral-400">
              <tr>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Keterangan / Sumber</th>
                <th className="px-6 py-4 text-right">Debit (Masuk)</th>
                <th className="px-6 py-4 text-right">Kredit (Keluar)</th>
                <th className="px-6 py-4 text-right">Saldo Berjalan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center">Memuat data...</td></tr>
              ) : paginatedList.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-neutral-500">Belum ada data mutasi buku besar.</td></tr>
              ) : (
                paginatedList.map((item: any) => (
                  <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        {format(new Date(item.tanggal), 'd MMM yyyy', { locale: localeId })}
                        <p className="text-[10px] text-neutral-400 mt-0.5">{format(new Date(item.created_at), 'HH:mm')}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{item.keterangan}</p>
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 mt-1">
                        {item.sumber.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {item.tipe_transaksi === 'PEMASUKAN' ? `Rp ${item.nominal.toLocaleString('id-ID')}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-rose-600 dark:text-rose-400">
                      {item.tipe_transaksi === 'PENGELUARAN' ? `Rp ${item.nominal.toLocaleString('id-ID')}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-neutral-900 dark:text-white">
                      Rp {item.saldo_berjalan.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden flex flex-col gap-2.5 mt-3">
        {isLoading ? (
          <div className="py-6 px-4 text-center text-sm text-neutral-500">Memuat data...</div>
        ) : paginatedList.length === 0 ? (
          <div className="py-6 px-4 text-center text-sm text-neutral-500 border border-dashed rounded-xl">Belum ada mutasi.</div>
        ) : (
          paginatedList.map((item: any) => (
            <div key={item.id} className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl p-3.5 flex items-center gap-2.5 shadow-sm">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                item.tipe_transaksi === 'PEMASUKAN' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
              }`}>
                {item.tipe_transaksi === 'PEMASUKAN' ? <IconArrowDownLeft size={20} /> : <IconArrowUpRight size={20} />}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className="font-bold text-neutral-900 dark:text-white text-sm line-clamp-2">
                  {item.keterangan}
                </p>
                <p className="text-[10px] text-neutral-500 mt-1">
                  {format(new Date(item.tanggal), 'd MMM yyyy', { locale: localeId })} • {item.sumber.replace(/_/g, ' ')}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`font-black text-sm ${item.tipe_transaksi === 'PEMASUKAN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {item.tipe_transaksi === 'PEMASUKAN' ? '+' : '-'} {item.nominal.toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] font-bold text-neutral-400 mt-1">
                  Sl: {item.saldo_berjalan.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6">
          <ModernPagination
            page={page}
            totalPages={totalPages}
            total={totalItems}
            limit={limit}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Modal Saldo Awal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Penyesuaian Saldo" isBottomSheetOnMobile>
        <form onSubmit={handleSetSaldo} className="flex flex-col gap-4 mt-4">
          <div className="rounded-xl p-3 text-sm border bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50">
            Penyesuaian saldo ini akan tercatat sebagai pemasukan dari sumber <b>MODAL</b> di buku besar.
          </div>
          <TextInput
            label="Nominal Saldo (Rp)"
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
            label="Keterangan"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            required
            rows={2}
          />
          <div className="mt-2 flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">Batal</Button>
            <Button variant="primary" type="submit" disabled={insertSaldoMutation.isPending}>
              {insertSaldoMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>
    </AmbientLayout>
  );
}
