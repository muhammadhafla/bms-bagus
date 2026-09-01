'use client';

import React, { useState, useMemo } from 'react';
import {
  IconShieldLock,
  IconSearch,
  IconCheck,
  IconX,
  IconFilter,
  IconRefresh,
  IconUserCheck,
} from '@tabler/icons-react';
import { Card, CardHeader, CardTitle, CardContent, Badge, EmptyState } from '@/components/ui';
import { CAPABILITIES_DATA } from '../data/capabilities-data';
import { RoleCapability } from '../types';

interface CapabilityMatrixViewProps {
  userRoles: string[];
  initialSearch?: string;
}

type RoleFilterType = 'all' | 'my_role' | 'admin' | 'kepala_gudang' | 'staff_gudang' | 'kasir' | 'finance';

export function CapabilityMatrixView({ userRoles, initialSearch = '' }: CapabilityMatrixViewProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedModule, setSelectedModule] = useState('Semua');
  const [roleFilter, setRoleFilter] = useState<RoleFilterType>('all');

  const modules = useMemo(() => {
    const list = Array.from(new Set(CAPABILITIES_DATA.map((c) => c.module)));
    return ['Semua', ...list];
  }, []);

  const filteredCapabilities = useMemo(() => {
    return CAPABILITIES_DATA.filter((item) => {
      // 1. Module filter
      const matchModule = selectedModule === 'Semua' || item.module === selectedModule;

      // 2. Search query filter
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.feature.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.module.toLowerCase().includes(q);

      // 3. Role filter
      let matchRole = true;
      if (roleFilter === 'my_role') {
        // Must be allowed for at least one of the user's active roles
        matchRole = userRoles.some((r) => {
          const val = (item as any)[r];
          return val === true || typeof val === 'string';
        });
      } else if (roleFilter !== 'all') {
        const val = (item as any)[roleFilter];
        matchRole = val === true || typeof val === 'string';
      }

      return matchModule && matchSearch && matchRole;
    });
  }, [searchQuery, selectedModule, roleFilter, userRoles]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedModule('Semua');
    setRoleFilter('all');
  };

  return (
    <div className="space-y-6">
      {/* Header Description */}
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              <IconShieldLock size={13} />
              <span>Matriks Lengkap Hak Akses Fitur</span>
            </div>
            <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white mt-1">
              Pemetaan Wewenang & Batasan Fitur BMS
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Tabel perbandingan menyeluruh hak akses seluruh modul terhadap 5 role pengguna sistem.
            </p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs bg-neutral-50 dark:bg-neutral-800/60 p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 shrink-0">
            <span className="flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-300">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <IconCheck size={11} stroke={3} />
              </span>
              <span>Diizinkan</span>
            </span>
            <span className="flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-300">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-neutral-200 text-neutral-400 dark:bg-neutral-700 dark:text-neutral-500">
                <IconX size={10} stroke={2.5} />
              </span>
              <span>Tidak Diizinkan</span>
            </span>
            <span className="flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-300">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span>Akses Khusus / Bersyarat</span>
            </span>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
          {/* Row 1: Role Filter & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Role Filter Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
                <IconFilter size={13} />
                <span>Filter Role:</span>
              </span>

              <button
                type="button"
                onClick={() => setRoleFilter('all')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                  roleFilter === 'all'
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
              >
                Semua Role
              </button>

              <button
                type="button"
                onClick={() => setRoleFilter('my_role')}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                  roleFilter === 'my_role'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-950/60 dark:text-brand-300 dark:hover:bg-brand-900/60'
                }`}
              >
                <IconUserCheck size={13} />
                <span>Role Aktif Saya</span>
              </button>

              {(['admin', 'kepala_gudang', 'staff_gudang', 'kasir', 'finance'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                    roleFilter === r
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400'
                  }`}
                >
                  {r.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <IconSearch size={14} className="pointer-events-none absolute inset-y-0 left-2.5 my-auto text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari fitur (mis: HPP, opname, waste)..."
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50/70 py-1.5 pr-3 pl-8 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-white"
              />
            </div>
          </div>

          {/* Row 2: Module Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider shrink-0 mr-1">
              Modul:
            </span>
            {modules.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedModule(m)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedModule === m
                    ? 'bg-brand-600 text-white shadow-xs font-semibold'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" aria-label="Matriks Hak Akses Modul">
            <thead className="bg-neutral-50 text-neutral-700 border-b border-neutral-200 dark:bg-neutral-900/90 dark:text-neutral-200 dark:border-neutral-800">
              <tr>
                <th scope="col" className="px-4 py-3.5 text-left font-bold min-w-[260px]">
                  Fitur & Penjelasan
                </th>
                <th
                  scope="col"
                  className={`px-3 py-3.5 text-center font-bold min-w-[100px] ${
                    userRoles.includes('admin')
                      ? 'bg-brand-50/80 text-brand-900 dark:bg-brand-950/60 dark:text-brand-200'
                      : ''
                  }`}
                >
                  Admin
                </th>
                <th
                  scope="col"
                  className={`px-3 py-3.5 text-center font-bold min-w-[110px] ${
                    userRoles.includes('kepala_gudang')
                      ? 'bg-brand-50/80 text-brand-900 dark:bg-brand-950/60 dark:text-brand-200'
                      : ''
                  }`}
                >
                  Kepala Gudang
                </th>
                <th
                  scope="col"
                  className={`px-3 py-3.5 text-center font-bold min-w-[110px] ${
                    userRoles.includes('staff_gudang')
                      ? 'bg-brand-50/80 text-brand-900 dark:bg-brand-950/60 dark:text-brand-200'
                      : ''
                  }`}
                >
                  Staf Gudang
                </th>
                <th
                  scope="col"
                  className={`px-3 py-3.5 text-center font-bold min-w-[90px] ${
                    userRoles.includes('kasir')
                      ? 'bg-brand-50/80 text-brand-900 dark:bg-brand-950/60 dark:text-brand-200'
                      : ''
                  }`}
                >
                  Kasir
                </th>
                <th
                  scope="col"
                  className={`px-3 py-3.5 text-center font-bold min-w-[100px] ${
                    userRoles.includes('finance')
                      ? 'bg-brand-50/80 text-brand-900 dark:bg-brand-950/60 dark:text-brand-200'
                      : ''
                  }`}
                >
                  Finance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredCapabilities.length > 0 ? (
                filteredCapabilities.map((row) => (
                  <tr key={row.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                    {/* Feature Details */}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <span className="inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                          {row.module}
                        </span>
                        <p className="font-bold text-neutral-900 dark:text-white">
                          {row.feature}
                        </p>
                        <p className="text-[11px] text-neutral-500 leading-snug dark:text-neutral-400">
                          {row.description}
                        </p>
                      </div>
                    </td>

                    {/* Admin Status */}
                    <td
                      className={`px-3 py-3 text-center ${
                        userRoles.includes('admin')
                          ? 'bg-brand-50/30 dark:bg-brand-950/20'
                          : ''
                      }`}
                    >
                      <RenderCapabilityStatus val={row.admin} />
                    </td>

                    {/* Kepala Gudang Status */}
                    <td
                      className={`px-3 py-3 text-center ${
                        userRoles.includes('kepala_gudang')
                          ? 'bg-brand-50/30 dark:bg-brand-950/20'
                          : ''
                      }`}
                    >
                      <RenderCapabilityStatus val={row.kepala_gudang} />
                    </td>

                    {/* Staf Gudang Status */}
                    <td
                      className={`px-3 py-3 text-center ${
                        userRoles.includes('staff_gudang')
                          ? 'bg-brand-50/30 dark:bg-brand-950/20'
                          : ''
                      }`}
                    >
                      <RenderCapabilityStatus val={row.staff_gudang} />
                    </td>

                    {/* Kasir Status */}
                    <td
                      className={`px-3 py-3 text-center ${
                        userRoles.includes('kasir')
                          ? 'bg-brand-50/30 dark:bg-brand-950/20'
                          : ''
                      }`}
                    >
                      <RenderCapabilityStatus val={row.kasir} />
                    </td>

                    {/* Finance Status */}
                    <td
                      className={`px-3 py-3 text-center ${
                        userRoles.includes('finance')
                          ? 'bg-brand-50/30 dark:bg-brand-950/20'
                          : ''
                      }`}
                    >
                      <RenderCapabilityStatus val={row.finance} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12">
                    <div className="text-center space-y-3">
                      <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                        Tidak ada fitur yang cocok dengan filter atau kata kunci &ldquo;{searchQuery}&rdquo;
                      </p>
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                      >
                        <IconRefresh size={14} />
                        <span>Reset Semua Filter</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function RenderCapabilityStatus({ val }: { val: boolean | string }) {
  if (val === true) {
    return (
      <span
        title="Diizinkan"
        className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      >
        <IconCheck size={14} stroke={3} />
      </span>
    );
  }
  if (val === false) {
    return (
      <span
        title="Tidak Diizinkan"
        className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600"
      >
        <IconX size={13} stroke={2.5} />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
      {val}
    </span>
  );
}
