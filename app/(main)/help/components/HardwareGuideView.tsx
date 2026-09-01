'use client';

import React, { useState } from 'react';
import {
  IconPrinter,
  IconBarcode,
  IconAlertTriangle,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconSparkles,
} from '@tabler/icons-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { HARDWARE_GUIDES } from '../data/hardware-data';

export function HardwareGuideView() {
  const [openTroubleIndex, setOpenTroubleIndex] = useState<string | null>(null);

  const toggleTrouble = (id: string) => {
    setOpenTroubleIndex((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          <IconPrinter size={13} />
          <span>Panduan Integrasi Perangkat Kasir & Gudang</span>
        </div>
        <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white mt-1">
          Setup Hardware: Barcode Scanner & Printer Thermal
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          Petunjuk menghubungkan alat scan barcode dan pengaturan cetak struk nota belanja tanpa kendala teknis.
        </p>
      </div>

      {/* Hardware Guides List */}
      <div className="space-y-6">
        {HARDWARE_GUIDES.map((hw) => (
          <Card key={hw.id} className="overflow-hidden border border-neutral-200/80 dark:border-neutral-800">
            <CardHeader className="bg-neutral-50/80 border-b border-neutral-100 p-5 dark:bg-neutral-900/60 dark:border-neutral-800">
              <CardTitle className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                {hw.category === 'scanner' ? (
                  <IconBarcode className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                ) : (
                  <IconPrinter className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                )}
                <span>{hw.title}</span>
              </CardTitle>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {hw.summary}
              </p>
            </CardHeader>

            <CardContent className="p-5 space-y-5">
              {/* Specifications */}
              <div className="rounded-xl bg-neutral-50 p-3.5 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800 space-y-2">
                <strong className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                  Spesifikasi & Standar Kompatibilitas:
                </strong>
                <ul className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                  {hw.specifications.map((spec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <IconCheck size={13} className="shrink-0 text-emerald-600 mt-0.5" />
                      <span>{spec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Setup Steps */}
              <div className="space-y-2">
                <strong className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                  Langkah-Langkah Instalasi:
                </strong>
                <div className="space-y-2">
                  {hw.setupSteps.map((step, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-neutral-100 bg-white p-3 text-xs text-neutral-700 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-300"
                    >
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              {/* Troubleshooting Accordion */}
              {hw.troubleshooting.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <strong className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <IconAlertTriangle size={14} />
                    <span>Solusi Masalah Umum (Troubleshooting):</span>
                  </strong>
                  <div className="space-y-2">
                    {hw.troubleshooting.map((trouble, i) => {
                      const itemKey = `${hw.id}-${i}`;
                      const isOpen = openTroubleIndex === itemKey;

                      return (
                        <div
                          key={i}
                          className="rounded-xl border border-neutral-200/70 overflow-hidden dark:border-neutral-800"
                        >
                          <button
                            type="button"
                            onClick={() => toggleTrouble(itemKey)}
                            className="flex w-full items-center justify-between p-3 text-left text-xs font-bold text-neutral-800 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800/60"
                            aria-expanded={isOpen}
                          >
                            <span>⚠️ {trouble.issue}</span>
                            {isOpen ? <IconChevronUp size={15} /> : <IconChevronDown size={15} />}
                          </button>
                          {isOpen && (
                            <div className="bg-amber-50/40 p-3 text-xs text-neutral-700 border-t border-neutral-100 dark:bg-amber-950/20 dark:text-neutral-300 dark:border-neutral-800">
                              <strong>Solusi: </strong> {trouble.solution}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
