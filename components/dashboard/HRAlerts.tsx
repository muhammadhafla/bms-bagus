'use client';

import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui';
import { IconClock, IconWallet, IconChevronRight } from '@tabler/icons-react';
import Link from 'next/link';
import { kasbonApi, kehadiranApi } from '@/lib/api/payroll';

export function HRAlerts({ variant = 'default' }: { variant?: 'default' | 'mobile' }) {
  const { data: kasbonList, isLoading: kasbonLoading } = useQuery({
    queryKey: ['admin_payroll_kasbon', 'pending'],
    queryFn: () => kasbonApi.getAll({ status: 'pending' }).then(res => res.data),
    refetchInterval: 60000,
  });

  const { data: lemburList, isLoading: lemburLoading } = useQuery({
    queryKey: ['admin_payroll_lembur', 'pending'],
    queryFn: () => kehadiranApi.getPendingLembur().then(res => res.data),
    refetchInterval: 60000,
  });

  const kasbonCount = kasbonList?.length || 0;
  const lemburCount = lemburList?.length || 0;
  const isLoading = kasbonLoading || lemburLoading;

  if (variant === 'mobile') {
    if (kasbonCount === 0 && lemburCount === 0 && !isLoading) return null;
    
    return (
      <div className="flex flex-col">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-widest text-neutral-400 uppercase">HR & Payroll Alerts</h2>
        </div>
        <div className="flex flex-col border-y border-neutral-200/60 dark:border-neutral-800">
          {isLoading ? (
            <div className="animate-pulse flex flex-col gap-3 py-3">
              <div className="h-10 w-full rounded-xl bg-neutral-100 dark:bg-neutral-800/50"></div>
              <div className="h-10 w-full rounded-xl bg-neutral-100 dark:bg-neutral-800/50"></div>
            </div>
          ) : (
            <>
              {kasbonCount > 0 && (
                <Link
                  href="/admin/payroll/kasbon"
                  className="flex items-center justify-between py-2.5 border-b border-neutral-100/80 last:border-0 dark:border-neutral-800/50 active:bg-neutral-50 dark:active:bg-neutral-800/50 transition-colors"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 flex-shrink-0">
                      <IconWallet className="h-4 w-4" />
                    </div>
                    <p className="truncate text-sm font-bold text-neutral-900 dark:text-white">
                      Pengajuan Kasbon
                    </p>
                  </div>
                  <div className="ml-3 flex-shrink-0 text-right flex items-center gap-2">
                    <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                      {kasbonCount}
                    </span>
                  </div>
                </Link>
              )}
              
              {lemburCount > 0 && (
                <Link
                  href="/admin/payroll/kehadiran"
                  className="flex items-center justify-between py-2.5 border-b border-neutral-100/80 last:border-0 dark:border-neutral-800/50 active:bg-neutral-50 dark:active:bg-neutral-800/50 transition-colors"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex-shrink-0">
                      <IconClock className="h-4 w-4" />
                    </div>
                    <p className="truncate text-sm font-bold text-neutral-900 dark:text-white">
                      Tinjauan Lembur
                    </p>
                  </div>
                  <div className="ml-3 flex-shrink-0 text-right flex items-center gap-2">
                    <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                      {lemburCount}
                    </span>
                  </div>
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="flex h-full flex-col p-5 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/20 dark:to-neutral-900 border-indigo-100 dark:border-indigo-900/30">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">HR & Payroll Alerts</h3>
      </div>

      <div className="flex-1 space-y-3">
        {isLoading ? (
          <div className="animate-pulse flex flex-col gap-3">
            <div className="h-16 w-full rounded-xl bg-white/50 dark:bg-neutral-800/50"></div>
            <div className="h-16 w-full rounded-xl bg-white/50 dark:bg-neutral-800/50"></div>
          </div>
        ) : (
          <>
            <Link 
              href="/admin/payroll/kasbon"
              className="group flex items-center justify-between rounded-xl bg-white/70 dark:bg-neutral-900/60 p-3 hover:bg-white dark:hover:bg-neutral-800 transition-colors border border-transparent hover:border-amber-200 dark:hover:border-amber-900/50"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${kasbonCount > 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800'}`}>
                  <IconWallet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">Pengajuan Kasbon</p>
                  <p className="text-xs text-neutral-500">Butuh persetujuan Anda</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-black ${kasbonCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-400'}`}>
                  {kasbonCount}
                </span>
                <IconChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-amber-500 transition-colors" />
              </div>
            </Link>

            <Link 
              href="/admin/payroll/kehadiran" 
              className="group flex items-center justify-between rounded-xl bg-white/70 dark:bg-neutral-900/60 p-3 hover:bg-white dark:hover:bg-neutral-800 transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-900/50"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${lemburCount > 0 ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800'}`}>
                  <IconClock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">Tinjauan Lembur</p>
                  <p className="text-xs text-neutral-500">Kelebihan waktu {'>'} 30m</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-black ${lemburCount > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-400'}`}>
                  {lemburCount}
                </span>
                <IconChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-blue-500 transition-colors" />
              </div>
            </Link>
          </>
        )}
      </div>
    </Card>
  );
}
