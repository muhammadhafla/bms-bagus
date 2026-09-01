'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  IconTruckDelivery,
  IconArrowUpRight,
  IconSparkles,
  IconInfoCircle,
  IconCheck,
  IconUser,
  IconLayersLinked,
} from '@tabler/icons-react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { SOP_DATA } from '../data/sop-data';
import { SopGuide } from '../types';

interface WorkflowGuidesViewProps {
  selectedGuideId?: string;
}

export function WorkflowGuidesView({ selectedGuideId }: WorkflowGuidesViewProps) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'gudang' | 'kasir' | 'finance' | 'pengaturan'>('all');

  const filteredSops = SOP_DATA.filter((sop) => {
    if (selectedGuideId) {
      return sop.id === selectedGuideId;
    }
    if (activeCategory === 'all') return true;
    return sop.category === activeCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-brand-200/60 bg-gradient-to-r from-brand-50/70 via-indigo-50/40 to-blue-50/40 p-5 dark:border-brand-900/40 dark:from-brand-950/30 dark:via-indigo-950/20 dark:to-blue-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-100/80 px-2.5 py-0.5 text-xs font-bold text-brand-800 dark:bg-brand-950 dark:text-brand-300">
              <IconTruckDelivery size={13} />
              <span>Standard Operating Procedures (SOP)</span>
            </div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              Alur Kerja Operasional & Panduan Modul
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-2xl">
              Panduan langkah demi langkah proses bisnis multi-cabang, approval supervisor, mutasi logistik, dan transaksi kasir.
            </p>
          </div>
        </div>

        {/* Category Pills (Only if not single selectedGuideId) */}
        {!selectedGuideId && (
          <div className="mt-4 pt-3 border-t border-brand-100 dark:border-brand-900/30 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 mr-1 uppercase tracking-wider">
              Kategori:
            </span>
            {[
              { id: 'all', label: 'Semua SOP' },
              { id: 'gudang', label: 'Gudang & Logistik' },
              { id: 'kasir', label: 'Kasir & POS' },
              { id: 'finance', label: 'Keuangan & Payroll' },
              { id: 'pengaturan', label: 'Pengaturan & Binding' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id as any)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-white/80 text-neutral-700 hover:bg-white dark:bg-neutral-800/80 dark:text-neutral-300 dark:hover:bg-neutral-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SOP List */}
      <div className="space-y-6">
        {filteredSops.map((sop, idx) => (
          <Card key={sop.id} className="overflow-hidden border border-neutral-200/80 dark:border-neutral-800">
            <CardHeader className="bg-neutral-50/70 border-b border-neutral-100 p-5 dark:bg-neutral-900/60 dark:border-neutral-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-extrabold shadow-xs">
                      {idx + 1}
                    </span>
                    <CardTitle className="text-base font-bold text-neutral-900 dark:text-white">
                      {sop.title}
                    </CardTitle>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 pl-8">
                    {sop.summary}
                  </p>
                </div>

                {/* Involved Roles */}
                <div className="flex items-center gap-1.5 pl-8 sm:pl-0 shrink-0">
                  <IconUser size={13} className="text-neutral-400" />
                  <span className="text-[11px] text-neutral-400 font-medium">Role Terkait:</span>
                  <div className="flex flex-wrap gap-1">
                    {sop.involvedRoles.map((role) => (
                      <span
                        key={role}
                        className="rounded-md bg-neutral-200/70 px-2 py-0.5 text-[10px] font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-brand-200 dark:before:bg-brand-900/60">
                {sop.steps.map((step) => (
                  <div key={step.stepNumber} className="relative group">
                    {/* Circle Step Number */}
                    <div className="absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-brand-500 bg-white text-[11px] font-bold text-brand-700 shadow-xs dark:bg-neutral-900 dark:text-brand-300">
                      {step.stepNumber}
                    </div>

                    <div className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-4 transition-all hover:bg-neutral-50 hover:border-neutral-200 dark:border-neutral-800/80 dark:bg-neutral-900/40 dark:hover:bg-neutral-800/40">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                          {step.title}
                        </h4>
                        <span className="inline-flex items-center gap-1 rounded bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300 w-fit">
                          <IconUser size={11} />
                          <span>Pelaksana: {step.actor}</span>
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                        {step.description}
                      </p>

                      {/* Tips Box if present */}
                      {step.tips && (
                        <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-amber-50/60 p-2 text-[11px] text-amber-900 border border-amber-200/50 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/30">
                          <IconSparkles size={13} className="shrink-0 text-amber-600 mt-0.5" />
                          <span><strong>Tips:</strong> {step.tips}</span>
                        </div>
                      )}

                      {/* Action Route Link Button */}
                      {step.routeLink && (
                        <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-800">
                          <Link
                            href={step.routeLink}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1 text-xs font-bold text-brand-600 border border-brand-200 shadow-xs hover:bg-brand-50 hover:text-brand-700 transition-colors dark:bg-neutral-800 dark:border-brand-800 dark:text-brand-300 dark:hover:bg-neutral-700"
                          >
                            <span>{step.routeLabel || 'Buka Modul'}</span>
                            <IconArrowUpRight size={13} />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
