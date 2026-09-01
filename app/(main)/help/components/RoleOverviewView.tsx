'use client';

import React from 'react';
import {
  IconKey,
  IconCheck,
  IconX,
  IconShieldLock,
  IconSparkles,
  IconInfoCircle,
} from '@tabler/icons-react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { ROLES_INFO } from '../data/roles-data';

interface RoleOverviewViewProps {
  userRoles: string[];
}

export function RoleOverviewView({ userRoles }: RoleOverviewViewProps) {
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="rounded-2xl border border-brand-200/60 bg-gradient-to-r from-brand-50/70 via-indigo-50/40 to-purple-50/40 p-5 dark:border-brand-900/40 dark:from-brand-950/30 dark:via-indigo-950/20 dark:to-purple-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-100/80 px-2.5 py-0.5 text-xs font-bold text-brand-800 dark:bg-brand-950 dark:text-brand-300">
              <IconKey size={13} />
              <span>Struktur Peran Pengguna (Multi-Role)</span>
            </div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              5 Klasifikasi Peran & Hak Akses Multi-Role
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-2xl">
              Sistem BMS menggunakan arsitektur <strong>Multi-Role</strong>. Satu akun pengguna dapat memiliki lebih dari satu peran sekaligus (contoh: Kasir + Staf Gudang) dengan hak akses yang saling mengakumulasi wewenang tertinggi.
            </p>
          </div>
        </div>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ROLES_INFO.map((role) => {
          const isUserRole = userRoles.includes(role.id);

          return (
            <Card
              key={role.id}
              className={`flex flex-col transition-all duration-200 hover:shadow-md ${
                isUserRole
                  ? 'ring-2 ring-brand-500 shadow-brand-500/10 dark:ring-brand-400'
                  : 'hover:border-neutral-300 dark:hover:border-neutral-700'
              }`}
            >
              <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-neutral-900 dark:text-white">
                      {role.title}
                    </CardTitle>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400">
                      ID: {role.id}
                    </span>
                  </div>
                  {isUserRole && (
                    <Badge variant="info" size="sm">
                      Role Anda
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-4 pt-4 text-xs">
                {/* Summary */}
                <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  {role.summary}
                </p>

                {/* Key Responsibilities */}
                <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800 space-y-2">
                  <strong className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 block">
                    Wewenang & Tanggung Jawab Utama:
                  </strong>
                  <ul className="space-y-1.5 text-neutral-600 dark:text-neutral-400">
                    {role.responsibilities.map((resp, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <IconCheck size={13} className="shrink-0 text-emerald-600 mt-0.5" />
                        <span className="leading-snug">{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Restrictions (if any) */}
                {role.restricted.length > 0 && (
                  <div className="rounded-xl bg-rose-50/50 p-3 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 space-y-1.5">
                    <strong className="text-[11px] font-bold text-rose-800 dark:text-rose-300 block">
                      Batasan Akses:
                    </strong>
                    <ul className="space-y-1 text-rose-700/80 dark:text-rose-400">
                      {role.restricted.map((rest, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <IconX size={13} className="shrink-0 text-rose-500 mt-0.5" />
                          <span className="leading-snug">{rest}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Key Modules Badges */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                    Akses Modul Utama:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {role.keyModules.map((m) => (
                      <span
                        key={m}
                        className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
