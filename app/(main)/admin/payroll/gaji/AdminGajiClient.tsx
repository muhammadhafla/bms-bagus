'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { mutasiApi } from '@/lib/api/payroll';
import { Card, Button, TextInput, ModernPagination } from '@/components/ui';
import { IconReport, IconWallet, IconSearch, IconArrowRight } from '@tabler/icons-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });

export default function AdminGajiDashboard() {
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 20;

  const { data: balancesData, isLoading, refetch } = useQuery({
    queryKey: ['admin_payroll_balances', { page, search }],
    queryFn: () => mutasiApi.getAllBalances({ page, limit, search }),
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-white">Dashboard Keuangan</h1>
            <p className="hidden md:block text-sm text-neutral-500 mt-1">Pantau saldo hak gaji dan kasbon seluruh karyawan.</p>
          </div>
        </div>

        {/* Widgets */}
        <Card className="mt-1 p-3 md:p-4 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 border-none">
          <div className="flex items-start md:items-center divide-x divide-neutral-200 dark:divide-neutral-700">
            {/* Dompet */}
            <div className="flex-1 flex items-center gap-2 md:gap-3 pr-2 md:pr-4 min-w-0">
              <div className="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 p-1.5 md:p-2.5 rounded-lg md:rounded-xl shrink-0">
                <IconWallet className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] md:text-xs font-bold text-neutral-500 uppercase tracking-wider mb-0.5 truncate">Dompet</p>
                <h3 className="text-sm md:text-xl font-black text-neutral-900 dark:text-white leading-tight">
                  Rp {totalCompanyDebt.toLocaleString('id-ID')}
                </h3>
              </div>
            </div>
            
            {/* Kasbon */}
            <div className="flex-1 flex items-center gap-2 md:gap-3 pl-3 md:pl-4 min-w-0">
              <div className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 p-1.5 md:p-2.5 rounded-lg md:rounded-xl shrink-0">
                <IconWallet className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] md:text-xs font-bold text-neutral-500 uppercase tracking-wider mb-0.5 truncate">Kasbon</p>
                <h3 className="text-sm md:text-xl font-black text-neutral-900 dark:text-white leading-tight">
                  Rp {totalEmployeeDebt.toLocaleString('id-ID')}
                </h3>
              </div>
            </div>
          </div>
        </Card>

        {/* Search */}
        <div className="relative">
          <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Cari karyawan..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-10 pl-10 pr-4 text-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </div>

        {/* Employee Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-xl" />)}
          </div>
        ) : !list || list.length === 0 ? (
          <div className="text-center py-10 text-neutral-500">
            <IconReport className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Tidak ada data karyawan ditemukan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {list.map((item: any) => (
              <div 
                key={item.id}
                onClick={() => router.push(`/admin/payroll/gaji/${item.id}`)}
                className="group cursor-pointer bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 md:p-4 hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-md transition-all flex flex-col"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative h-10 w-10 rounded-full overflow-hidden bg-brand-100 dark:bg-brand-900 flex shrink-0 items-center justify-center font-bold text-brand-600 text-sm">
                    {item.avatar_url ? (
                      <Image src={item.avatar_url} alt={item.nama} fill className="object-cover" />
                    ) : (
                      item.nama.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm md:text-base text-neutral-900 dark:text-white truncate">{item.nama}</h3>
                    <p className="text-[11px] md:text-xs text-neutral-500 truncate">{item.jabatan || 'Staff'}</p>
                  </div>
                  <IconArrowRight className="h-4 w-4 text-neutral-300 group-hover:text-brand-500 transition-colors" />
                </div>
                
                <div className="mt-auto pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-end justify-between">
                  <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-neutral-400">
                    {item.total_saldo < 0 ? 'Sisa Kasbon' : 'Saldo Dompet'}
                  </p>
                  <p className={`font-black text-sm md:text-base ${
                    item.total_saldo < 0 ? 'text-rose-600 dark:text-rose-400' : 
                    item.total_saldo > 0 ? 'text-emerald-600 dark:text-emerald-400' : 
                    'text-neutral-900 dark:text-white'
                  }`}>
                    {item.total_saldo < 0 ? '-' : ''}Rp {Math.abs(item.total_saldo).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <ModernPagination page={page} totalPages={totalPages} total={totalItems} limit={limit} onPageChange={setPage} />
        )}

      </div>
    </PullToRefresh>
  );
}
