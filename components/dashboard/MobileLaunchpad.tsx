'use client';

import { 
  IconShoppingCart, 
  IconPackage, 
  IconTruck, 
  IconClipboardCheck, 
  IconArrowBack, 
  IconTags, 
  IconChartBar, 
  IconPrinter,
  IconHistory,
  IconBell,
  IconRefresh
} from '@tabler/icons-react';
import Link from 'next/link';
import Image from 'next/image';
import { DashboardStats, LowStockItem, RecentTransaction } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { useState } from 'react';
import { TransactionModal } from './TransactionModal';
import { formatTimeWIB, formatDateWIB } from '@/lib/utils';

interface MobileLaunchpadProps {
  stats?: DashboardStats | null;
  kasBalance: number;
  lowStock?: LowStockItem[];
  recentTransactions?: RecentTransaction[];
  isAdminUser: boolean;
  isLoading: boolean;
  onRefresh: () => void;
}

export function MobileLaunchpad({
  stats,
  kasBalance,
  lowStock,
  recentTransactions,
  isAdminUser,
  isLoading,
  onRefresh
}: MobileLaunchpadProps) {
  const { profile, user } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [selectedTxType, setSelectedTxType] = useState<'penjualan' | 'pembelian' | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const adminMenus = [
    { href: '/purchasing', title: 'Pembelian', icon: IconShoppingCart, color: 'text-brand-600', bg: 'bg-brand-50 dark:bg-brand-900/50' },
    { href: '/inventory', title: 'Stok', icon: IconPackage, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/50' },
    { href: '/purchasing/supplier', title: 'Supplier', icon: IconTruck, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/50' },
    { href: '/inventory/stock-opname', title: 'Opname', icon: IconClipboardCheck, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/50' },
    { href: '/transactions/return', title: 'Retur', icon: IconArrowBack, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/50' },
    { href: '/inventory/kategori', title: 'Kategori', icon: IconTags, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/50' },
    { href: '/analytics', title: 'Laporan', icon: IconChartBar, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/50' },
    { href: '/bulk-print', title: 'Cetak', icon: IconPrinter, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-900/50' },
  ];

  const staffMenus = [
    { href: '/inventory', title: 'Stok', icon: IconPackage, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/50' },
    { href: '/inventory/stock-opname', title: 'Opname', icon: IconClipboardCheck, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/50' },
    { href: '/transactions/return', title: 'Retur', icon: IconArrowBack, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/50' },
    { href: '/bulk-print', title: 'Cetak Lbl', icon: IconPrinter, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-900/50' },
    { href: '/transactions/history', title: 'Riwayat', icon: IconHistory, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/50' },
    { href: '/inventory/kategori', title: 'Kategori', icon: IconTags, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/50' },
  ];

  const menus = isAdminUser ? adminMenus : staffMenus;

  const todayStr = formatDateWIB(new Date(), { weekday: 'long', day: 'numeric', month: 'short' });

  const filteredTransactions = recentTransactions?.filter(trx => isAdminUser ? true : trx.type === 'penjualan') || [];

  return (
    <div className="flex flex-col pb-6">
      {/* Header Lightweight */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white leading-tight">
            Halo, {profile?.nama?.split(' ')[0] || 'User'} 👋
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {todayStr}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full active:scale-95 transition-transform"
          >
            <IconRefresh className={`w-5 h-5 text-neutral-600 dark:text-neutral-300 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <Link href="/profile">
            {profile?.avatar_url ? (
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-brand-100 dark:border-brand-900 relative">
                <Image src={profile.avatar_url} alt="Avatar" fill sizes="36px" className="object-cover" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-sm">
                {profile?.nama?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* Info Bar (Split) */}
      <div className="flex gap-2 mb-5">
        {isAdminUser && (
          <Link href="/analytics" className="flex-1 bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl p-3 shadow-sm active:scale-95 transition-transform flex flex-col justify-center">
            <p className="text-brand-100 text-[10px] uppercase font-bold tracking-wider mb-1">Penjualan Hari Ini</p>
            <p className="text-white font-extrabold text-lg">
              {isLoading ? '...' : `Rp ${(stats?.todaySales || 0).toLocaleString('id-ID')}`}
            </p>
          </Link>
        )}
        <Link href="/finance/cash-flow" className={`${isAdminUser ? 'w-1/3' : 'flex-1'} bg-white dark:bg-neutral-800 rounded-xl p-3 shadow-sm border border-neutral-100 dark:border-neutral-700 active:scale-95 transition-transform flex flex-col justify-center`}>
          <p className="text-neutral-500 dark:text-neutral-400 text-[10px] uppercase font-bold tracking-wider mb-1">Saldo Kas</p>
          <p className="text-neutral-900 dark:text-white font-bold text-sm">
            {isLoading ? '...' : `Rp ${kasBalance.toLocaleString('id-ID')}`}
          </p>
        </Link>
      </div>

      {/* Grid Launchpad */}
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-700 p-4 mb-5">
        <div className="grid grid-cols-4 gap-y-4 gap-x-2">
          {menus.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="flex flex-col items-center gap-1.5 select-none active:scale-90 transition-transform group"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.bg} group-hover:brightness-95 transition-all`}>
                  <Icon className={`w-6 h-6 ${item.color}`} stroke={2} />
                </div>
                <span className="text-[10px] font-semibold text-neutral-700 dark:text-neutral-300 text-center leading-tight">
                  {item.title}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Low Stock Alert (Flash Sale style carousel) */}
      {!isLoading && lowStock && lowStock.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between px-1 mb-2">
            <h2 className="text-sm font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wide flex items-center gap-1">
              <IconBell className="w-4 h-4" /> Stok Tipis!
            </h2>
            <Link href="/inventory?filter=low-stock" className="text-xs font-semibold text-neutral-500 hover:text-neutral-900">
              Lihat Semua &gt;
            </Link>
          </div>
          <div className="flex overflow-x-auto gap-3 pb-2 -mx-1 px-1 snap-x scrollbar-hide">
            {lowStock.map((item) => (
              <Link 
                key={item.id} 
                href={`/inventory?search=${encodeURIComponent(item.nama_barang)}`}
                className="flex-none w-32 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl p-2 snap-center active:scale-95 transition-transform"
              >
                <div className="w-10 h-10 flex-shrink-0 bg-rose-100 dark:bg-rose-900/30 rounded-lg flex items-center justify-center mb-2">
                  <IconPackage className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-neutral-900 dark:text-white truncate mb-0.5">{item.nama_barang}</p>
                  <p className="text-[10px] font-bold text-red-600 dark:text-red-400">Sisa {item.stok}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {!isLoading && filteredTransactions.length > 0 && (
        <div>
          <div className="flex items-center justify-between px-1 mb-2">
            <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Aktivitas Terakhir</h2>
            <Link href="/transactions/history" className="text-xs font-semibold text-brand-600">
              Riwayat &gt;
            </Link>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-100 dark:border-neutral-700 divide-y divide-neutral-100 dark:divide-neutral-700">
            {filteredTransactions.slice(0, 3).map((trx) => (
              <button 
                key={trx.id} 
                onClick={() => {
                  setSelectedTxId(trx.id);
                  setSelectedTxType(trx.type as 'penjualan' | 'pembelian');
                }}
                className="w-full text-left p-3 flex items-center justify-between active:bg-neutral-50 dark:active:bg-neutral-700/50 transition-colors"
              >
                <div>
                  <p className="text-xs font-semibold text-neutral-900 dark:text-white uppercase">{trx.id.split('-')[0]}</p>
                  <p className="text-[10px] text-neutral-500">{formatTimeWIB(trx.created_at, { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-bold ${trx.type === 'pembelian' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {trx.type === 'pembelian' ? '-' : '+'} Rp {(trx.total || 0).toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] text-neutral-500">{trx.type === 'pembelian' ? 'Pembelian' : 'Penjualan'}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <TransactionModal 
        isOpen={!!selectedTxId} 
        onClose={() => {
          setSelectedTxId(null);
          setSelectedTxType(null);
        }} 
        transactionId={selectedTxId} 
        transactionType={selectedTxType}
        isBottomSheet={true}
      />
    </div>
  );
}
