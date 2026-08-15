'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconTags,
  IconSearch,
  IconPlus,
  IconRefresh,
  IconDotsVertical,
  IconCalendar,
  IconX,
} from '@tabler/icons-react';
import { AdminOnly } from '@/components/role';
import { toast } from 'sonner';
import { AmbientLayout, Button, Badge, Modal, FilterButton, SelectInput } from '@/components/ui';
import { ResponsivePanel } from '@/components/ui/ResponsivePanel';
import TextInput from '@/components/ui/TextInput';
import { promoApi, Promo } from '@/lib/api';
import { formatDateWIB, formatDateTimeWIB } from '@/lib/utils';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Fuse from 'fuse.js';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });

export default function PromoListPage() {
  const router = useRouter();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    const closeMenu = () => setOpenActionId(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  const fetchPromos = useCallback(async () => {
    setLoading(true);
    const result = await promoApi.getAll();
    if (result.error) {
      toast.error('Gagal memuat data promo');
    } else {
      setPromos(result.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  const getPromoStatus = (promo: Promo) => {
    if (promo.status === 'nonaktif') return { label: 'Nonaktif', color: 'neutral' };

    const now = new Date();
    const start = new Date(promo.tanggal_mulai);
    const end = new Date(promo.tanggal_selesai);

    if (now < start) return { label: 'Terjadwal', color: 'warning' };
    if (now > end) return { label: 'Berakhir', color: 'error' };
    return { label: 'Aktif', color: 'success' };
  };

  const filteredPromos = useMemo(() => {
    let result = promos;

    if (statusFilter !== 'all') {
      result = result.filter((promo) => {
        const status = getPromoStatus(promo).label.toLowerCase();
        return status === statusFilter.toLowerCase();
      });
    }

    if (!searchQuery.trim()) return result;
    const fuse = new Fuse(result, { keys: ['nama'], threshold: 0.3 });
    return fuse.search(searchQuery).map((res) => res.item);
  }, [promos, searchQuery, statusFilter]);

  return (
    <AdminOnly>
      <AmbientLayout>
        <PullToRefresh onRefresh={fetchPromos}>
          <div className="flex h-full flex-col lg:min-h-[calc(100vh-2rem)]">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-brand-50 dark:bg-brand-900/30 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl lg:h-12 lg:w-12">
                  <IconTags className="text-brand-600 dark:text-brand-400 h-5 w-5 lg:h-6 lg:w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
                    Manajemen Promo
                  </h1>
                  <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    Kelola kampanye diskon massal dan jadwal berlakunya
                  </p>
                </div>
              </div>

              <div className="flex w-full items-center gap-2 lg:w-auto">
                <div className="relative flex-1 lg:w-64">
                  <TextInput
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari promo..."
                    icon={<IconSearch size={18} />}
                    className="w-full bg-white dark:bg-neutral-900"
                  />
                </div>
                <FilterButton
                  onClick={() => setIsFilterOpen(true)}
                  activeCount={statusFilter !== 'all' ? 1 : 0}
                  className="shrink-0"
                />
                <Link href="/inventory/promo/new" className="shrink-0">
                  <Button variant="primary" leftIcon={<IconPlus size={18} />}>
                    <span className="hidden sm:inline">Buat Promo</span>
                  </Button>
                </Link>
              </div>
            </div>

            {statusFilter !== 'all' && (
              <div
                className="no-scrollbar animate-fade-in-up flex w-full items-center gap-2 overflow-x-auto pb-4 whitespace-nowrap"
                style={{ animationDelay: '100ms' }}
              >
                <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  {statusFilter === 'aktif'
                    ? 'Aktif'
                    : statusFilter === 'terjadwal'
                      ? 'Terjadwal'
                      : statusFilter === 'berakhir'
                        ? 'Berakhir'
                        : 'Nonaktif'}
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-200"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="min-h-[300px] flex-1 overflow-auto">
                <table className="hidden w-full border-collapse text-left lg:table">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950/50">
                      <th className="px-5 py-4 text-xs font-bold tracking-wider whitespace-nowrap text-neutral-500 uppercase dark:text-neutral-400">
                        Nama Promo
                      </th>
                      <th className="px-5 py-4 text-xs font-bold tracking-wider whitespace-nowrap text-neutral-500 uppercase dark:text-neutral-400">
                        Status
                      </th>
                      <th className="px-5 py-4 text-xs font-bold tracking-wider whitespace-nowrap text-neutral-500 uppercase dark:text-neutral-400">
                        Jadwal Mulai
                      </th>
                      <th className="px-5 py-4 text-xs font-bold tracking-wider whitespace-nowrap text-neutral-500 uppercase dark:text-neutral-400">
                        Jadwal Selesai
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                    {loading ? (
                      [...Array(3)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-5 py-4">
                            <div className="h-4 w-48 rounded bg-neutral-200 dark:bg-neutral-800"></div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="h-6 w-24 rounded-full bg-neutral-200 dark:bg-neutral-800"></div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-800"></div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-800"></div>
                          </td>
                        </tr>
                      ))
                    ) : filteredPromos.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-12 text-center text-neutral-500 dark:text-neutral-400"
                        >
                          <div className="flex flex-col items-center justify-center gap-3">
                            <IconTags
                              className="h-12 w-12 text-neutral-300 dark:text-neutral-600"
                              stroke={1.5}
                            />
                            <p>Tidak ada promo yang ditemukan.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredPromos.map((promo) => {
                        const status = getPromoStatus(promo);
                        return (
                          <tr
                            key={promo.id}
                            onClick={() => router.push(`/inventory/promo/${promo.id}`)}
                            className="group cursor-pointer transition-colors hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50"
                          >
                            <td className="px-5 py-4">
                              <div className="font-bold text-neutral-900 dark:text-neutral-100">
                                {promo.nama}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <Badge variant={status.color as any}>{status.label}</Badge>
                            </td>
                            <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                              <div className="flex items-center gap-2">
                                <IconCalendar size={16} className="text-neutral-400" />
                                {formatDateTimeWIB(promo.tanggal_mulai, {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                              <div className="flex items-center gap-2">
                                <IconCalendar size={16} className="text-neutral-400" />
                                {formatDateTimeWIB(promo.tanggal_selesai, {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Mobile Cards Layout */}
                <div className="block min-h-full space-y-3 bg-neutral-50/50 p-4 lg:hidden dark:bg-neutral-950/50">
                  {loading ? (
                    [...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="animate-pulse rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
                      >
                        <div className="mb-4 h-4 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800"></div>
                        <div className="mb-2 h-3 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800"></div>
                        <div className="mb-4 h-3 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800"></div>
                        <div className="h-10 w-full rounded-xl bg-neutral-200 dark:bg-neutral-800"></div>
                      </div>
                    ))
                  ) : filteredPromos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12 text-neutral-500 dark:text-neutral-400">
                      <IconTags
                        className="h-12 w-12 text-neutral-300 dark:text-neutral-600"
                        stroke={1.5}
                      />
                      <p>Tidak ada promo yang ditemukan.</p>
                    </div>
                  ) : (
                    filteredPromos.map((promo) => {
                      const status = getPromoStatus(promo);
                      return (
                        <div
                          key={`${promo.id}-mobile`}
                          onClick={() => router.push(`/inventory/promo/${promo.id}`)}
                          className="hover:border-brand-300 dark:hover:border-brand-700 relative flex cursor-pointer flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm transition-colors dark:border-neutral-800 dark:bg-neutral-900"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-base leading-tight font-bold text-neutral-900 dark:text-white">
                              {promo.nama}
                            </div>
                            <Badge variant={status.color as any}>{status.label}</Badge>
                          </div>

                          <div className="space-y-1.5 rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950">
                            <div className="flex items-center gap-2 text-xs text-neutral-600 sm:text-sm dark:text-neutral-400">
                              <IconCalendar size={16} className="shrink-0 text-neutral-400" />
                              <span className="truncate">
                                Mulai:{' '}
                                {formatDateTimeWIB(promo.tanggal_mulai, {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-neutral-600 sm:text-sm dark:text-neutral-400">
                              <IconCalendar size={16} className="shrink-0 text-neutral-400" />
                              <span className="truncate">
                                Akhir:{' '}
                                {formatDateTimeWIB(promo.tanggal_selesai, {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </PullToRefresh>
      </AmbientLayout>

      <ResponsivePanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter Promo"
      >
        <div className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Status Promo:
            </label>
            <SelectInput
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as string)}
              options={[
                { value: 'all', label: 'Semua Status' },
                { value: 'aktif', label: 'Aktif' },
                { value: 'terjadwal', label: 'Terjadwal' },
                { value: 'berakhir', label: 'Berakhir' },
                { value: 'nonaktif', label: 'Nonaktif' },
              ]}
              className="w-full"
            />
          </div>

          <div className="mt-6 flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <Button
              variant="secondary"
              className="w-1/2"
              onClick={() => {
                setStatusFilter('all');
              }}
            >
              Reset Filter
            </Button>
            <Button variant="primary" className="w-1/2" onClick={() => setIsFilterOpen(false)}>
              Terapkan
            </Button>
          </div>
        </div>
      </ResponsivePanel>
    </AdminOnly>
  );
}
