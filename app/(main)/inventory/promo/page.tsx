'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { IconTags, IconSearch, IconPlus, IconRefresh, IconDotsVertical, IconCalendar, IconX } from '@tabler/icons-react';
import { AdminOnly } from '@/components/role';
import { toast } from "sonner";
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
      result = result.filter(promo => {
        const status = getPromoStatus(promo).label.toLowerCase();
        return status === statusFilter.toLowerCase();
      });
    }

    if (!searchQuery.trim()) return result;
    const fuse = new Fuse(result, { keys: ['nama'], threshold: 0.3 });
    return fuse.search(searchQuery).map(res => res.item);
  }, [promos, searchQuery, statusFilter]);

  return (
    <AdminOnly>
      <AmbientLayout>
        <PullToRefresh onRefresh={fetchPromos}>
          <div className="flex flex-col h-full lg:min-h-[calc(100vh-2rem)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                  <IconTags className="w-5 h-5 lg:w-6 lg:h-6 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                    Manajemen Promo
                  </h1>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                    Kelola kampanye diskon massal dan jadwal berlakunya
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full lg:w-auto">
                <div className="flex-1 lg:w-64 relative">
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
              <div className="flex overflow-x-auto whitespace-nowrap gap-2 items-center pb-4 w-full no-scrollbar animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {statusFilter === 'aktif' ? 'Aktif' : 
                   statusFilter === 'terjadwal' ? 'Terjadwal' : 
                   statusFilter === 'berakhir' ? 'Berakhir' : 'Nonaktif'}
                  <button onClick={() => setStatusFilter('all')} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">
                    <IconX size={14} />
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm flex flex-col">
              <div className="flex-1 overflow-auto min-h-[300px]">
                <table className="w-full text-left border-collapse hidden lg:table">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-950/50 border-b border-neutral-200 dark:border-neutral-800">
                      <th className="py-4 px-5 text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">Nama Promo</th>
                      <th className="py-4 px-5 text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                      <th className="py-4 px-5 text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">Jadwal Mulai</th>
                      <th className="py-4 px-5 text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">Jadwal Selesai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                    {loading ? (
                      [...Array(3)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="py-4 px-5"><div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-48"></div></td>
                          <td className="py-4 px-5"><div className="h-6 bg-neutral-200 dark:bg-neutral-800 rounded-full w-24"></div></td>
                          <td className="py-4 px-5"><div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-32"></div></td>
                          <td className="py-4 px-5"><div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-32"></div></td>
                        </tr>
                      ))
                    ) : filteredPromos.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-neutral-500 dark:text-neutral-400">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <IconTags className="w-12 h-12 text-neutral-300 dark:text-neutral-600" stroke={1.5} />
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
                            className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors group cursor-pointer"
                          >
                            <td className="py-4 px-5">
                              <div className="font-bold text-neutral-900 dark:text-neutral-100">{promo.nama}</div>
                            </td>
                            <td className="py-4 px-5">
                              <Badge variant={status.color as any}>{status.label}</Badge>
                            </td>
                            <td className="py-4 px-5 text-sm text-neutral-600 dark:text-neutral-400">
                              <div className="flex items-center gap-2">
                                <IconCalendar size={16} className="text-neutral-400" />
                                {formatDateTimeWIB(promo.tanggal_mulai, { dateStyle: 'medium', timeStyle: 'short' })}
                              </div>
                            </td>
                            <td className="py-4 px-5 text-sm text-neutral-600 dark:text-neutral-400">
                              <div className="flex items-center gap-2">
                                <IconCalendar size={16} className="text-neutral-400" />
                                {formatDateTimeWIB(promo.tanggal_selesai, { dateStyle: 'medium', timeStyle: 'short' })}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Mobile Cards Layout */}
                <div className="block lg:hidden p-4 space-y-3 bg-neutral-50/50 dark:bg-neutral-950/50 min-h-full">
                  {loading ? (
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse bg-white dark:bg-neutral-900 rounded-2xl p-3 border border-neutral-200 dark:border-neutral-800">
                        <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2 mb-4"></div>
                        <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4 mb-4"></div>
                        <div className="h-10 bg-neutral-200 dark:bg-neutral-800 rounded-xl w-full"></div>
                      </div>
                    ))
                  ) : filteredPromos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-neutral-500 dark:text-neutral-400">
                      <IconTags className="w-12 h-12 text-neutral-300 dark:text-neutral-600" stroke={1.5} />
                      <p>Tidak ada promo yang ditemukan.</p>
                    </div>
                  ) : (
                    filteredPromos.map((promo) => {
                      const status = getPromoStatus(promo);
                      return (
                        <div 
                          key={`${promo.id}-mobile`} 
                          onClick={() => router.push(`/inventory/promo/${promo.id}`)}
                          className="bg-white dark:bg-neutral-900 rounded-2xl p-3 border border-neutral-200 dark:border-neutral-800 shadow-sm relative flex flex-col gap-3 cursor-pointer hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="font-bold text-neutral-900 dark:text-white text-base leading-tight">
                              {promo.nama}
                            </div>
                            <Badge variant={status.color as any}>{status.label}</Badge>
                          </div>
                          
                          <div className="space-y-1.5 bg-neutral-50 dark:bg-neutral-950 rounded-xl p-3 border border-neutral-100 dark:border-neutral-800">
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                              <IconCalendar size={16} className="text-neutral-400 shrink-0" />
                              <span className="truncate">Mulai: {formatDateTimeWIB(promo.tanggal_mulai, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                              <IconCalendar size={16} className="text-neutral-400 shrink-0" />
                              <span className="truncate">Akhir: {formatDateTimeWIB(promo.tanggal_selesai, { dateStyle: 'medium', timeStyle: 'short' })}</span>
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

      <ResponsivePanel isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} title="Filter Promo">
        <div className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Status Promo:</label>
            <SelectInput
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as string)}
              options={[
                { value: 'all', label: 'Semua Status' },
                { value: 'aktif', label: 'Aktif' },
                { value: 'terjadwal', label: 'Terjadwal' },
                { value: 'berakhir', label: 'Berakhir' },
                { value: 'nonaktif', label: 'Nonaktif' }
              ]}
              className="w-full"
            />
          </div>

          <div className="pt-4 mt-6 border-t border-neutral-200 dark:border-neutral-800 flex gap-3">
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
