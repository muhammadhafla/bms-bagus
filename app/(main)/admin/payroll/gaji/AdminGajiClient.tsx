'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { mutasiApi, gajiApi } from '@/lib/api/payroll';
import { Card, Button, TextInput, ModernPagination, ConfirmDialog } from '@/components/ui';
import { IconReport, IconWallet, IconSearch, IconArrowRight } from '@tabler/icons-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { toast } from 'sonner';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });

export default function AdminGajiDashboard() {
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 20;

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { data: balancesData, isLoading, refetch } = useQuery({
    queryKey: ['admin_payroll_balances', { page, search }],
    queryFn: () => mutasiApi.getAllBalances({ page, limit, search }),
  });

  const prosesGajiMutation = useMutation({
    mutationFn: async (periode: string) => {
      const res = await gajiApi.prosesKalkulasi(periode);
      if (res.error) throw new Error(res.error.message);
      return res;
    },
    onSuccess: () => {
      toast.success('Gaji dan EWA untuk bulan ini berhasil diproses!');
      setIsConfirmOpen(false);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal memproses gaji');
    }
  });

  const list = balancesData?.data || [];
  const totalItems = balancesData?.total || 0;
  const totalPages = Math.ceil(totalItems / limit) || 1;

  const totalCompanyDebt = list.reduce((sum, item) => sum + (item.total_saldo > 0 ? item.total_saldo : 0), 0);
  const totalEmployeeDebt = list.reduce((sum, item) => sum + (item.total_saldo < 0 ? Math.abs(item.total_saldo) : 0), 0);

  return (
    <PullToRefresh onRefresh={async () => { await refetch(); }}>
      <div className="flex flex-col gap-3 px-3 pt-1 pb-20 w-full md:px-6 md:pt-4 md:pb-20 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">Dashboard Keuangan</h1>
            <p className="text-sm text-neutral-500 mt-1">Pantau saldo hak gaji dan kasbon seluruh karyawan.</p>
          </div>
          <Button 
            variant="primary" 
            className="w-full sm:w-auto shadow-sm shadow-brand-500/20"
            leftIcon={<IconReport size={18} />}
            onClick={() => setIsConfirmOpen(true)}
            disabled={prosesGajiMutation.isPending}
          >
            {prosesGajiMutation.isPending ? 'Memproses...' : 'Tutup Buku Gaji'}
          </Button>
        </div>

        {/* Widgets */}
        <div className="grid grid-cols-2 gap-3 mt-1 mb-2">
          <Card className="p-3 md:p-4 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-sm rounded-2xl overflow-hidden relative">
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-5">
              <IconWallet className="w-24 h-24" />
            </div>
            <div className="relative flex flex-col gap-2 md:gap-3">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 p-1.5 md:p-2 rounded-lg">
                  <IconWallet className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <p className="text-[10px] md:text-xs font-bold text-neutral-500 uppercase tracking-wider">Total Dompet</p>
              </div>
              <h3 className="text-lg md:text-2xl font-black text-neutral-900 dark:text-white leading-tight">
                Rp {totalCompanyDebt.toLocaleString('id-ID')}
              </h3>
            </div>
          </Card>
          
          <Card className="p-3 md:p-4 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-sm rounded-2xl overflow-hidden relative">
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-5">
              <IconWallet className="w-24 h-24" />
            </div>
            <div className="relative flex flex-col gap-2 md:gap-3">
              <div className="flex items-center gap-2">
                <div className="bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 p-1.5 md:p-2 rounded-lg">
                  <IconWallet className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <p className="text-[10px] md:text-xs font-bold text-neutral-500 uppercase tracking-wider">Total Kasbon</p>
              </div>
              <h3 className="text-lg md:text-2xl font-black text-neutral-900 dark:text-white leading-tight">
                Rp {totalEmployeeDebt.toLocaleString('id-ID')}
              </h3>
            </div>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mt-2 mb-4">
          <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Cari nama karyawan..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-12 pl-11 pr-4 text-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all outline-none placeholder:text-neutral-400"
          />
        </div>

        {/* Employee Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-[76px] bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-2xl" />)}
          </div>
        ) : !list || list.length === 0 ? (
          <div className="text-center py-16 text-neutral-500 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800">
            <IconReport className="h-12 w-12 mx-auto mb-3 text-neutral-300 dark:text-neutral-700" />
            <p className="text-sm font-medium">Tidak ada data karyawan ditemukan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {list.map((item: any) => {
              const isDebt = item.total_saldo < 0;
              const isCredit = item.total_saldo > 0;
              
              return (
              <div 
                key={item.id}
                onClick={() => router.push(`/admin/payroll/gaji/${item.id}`)}
                className="group cursor-pointer bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl p-3 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-lg hover:shadow-brand-500/5 transition-all duration-200 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative h-11 w-11 rounded-full overflow-hidden bg-brand-50 dark:bg-brand-900/30 border border-brand-100/50 dark:border-brand-800/50 flex shrink-0 items-center justify-center font-bold text-brand-600 dark:text-brand-400 text-sm">
                    {item.avatar_url ? (
                      <Image src={item.avatar_url} alt={item.nama} fill className="object-cover" />
                    ) : (
                      item.nama.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {item.nama}
                    </h3>
                    <p className="text-[11px] text-neutral-500 truncate mt-0.5">{item.jabatan || 'Staff'}</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end shrink-0 pl-2 border-l border-neutral-50 dark:border-neutral-800/50">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-0.5">
                    {isDebt ? 'Kasbon' : 'Dompet'}
                  </p>
                  <p className={`font-black text-sm ${
                    isDebt ? 'text-rose-600 dark:text-rose-400' : 
                    isCredit ? 'text-emerald-600 dark:text-emerald-400' : 
                    'text-neutral-400 dark:text-neutral-500'
                  }`}>
                    {isDebt ? '-' : ''}Rp {Math.abs(item.total_saldo).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            )})}
          </div>
        )}

        {totalPages > 1 && (
          <ModernPagination page={page} totalPages={totalPages} total={totalItems} limit={limit} onPageChange={setPage} />
        )}

      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Tutup Buku Gaji?"
        message="Apakah Anda yakin ingin memproses gaji dan tutup buku untuk bulan ini? Tindakan ini akan menghitung Gaji Bulanan dan memasukkannya ke saldo EWA."
        confirmLabel="Ya, Proses Gaji"
        cancelLabel="Batal"
        onConfirm={() => {
          const periode = new Date().toISOString().substring(0, 7);
          prosesGajiMutation.mutate(periode);
        }}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </PullToRefresh>
  );
}
