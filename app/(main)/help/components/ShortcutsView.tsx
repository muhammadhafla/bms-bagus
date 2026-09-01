'use client';

import React, { useState } from 'react';
import {
  IconKeyboard,
  IconSearch,
  IconSparkles,
  IconInfoCircle,
} from '@tabler/icons-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { SHORTCUTS_DATA } from '../data/shortcuts-data';

export function ShortcutsView() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredShortcuts = SHORTCUTS_DATA.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        !searchQuery ||
        item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.context.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              <IconKeyboard size={13} />
              <span>Cheatsheet Pintasan Cepat</span>
            </div>
            <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white mt-1">
              Daftar Pintasan Keyboard (Hotkeys)
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Tingkatkan kecepatan kasir dan staf gudang tanpa harus sering menyentuh mouse.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <IconSearch size={14} className="pointer-events-none absolute inset-y-0 left-2.5 my-auto text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari tombol (misal: F2, F9, Ctrl+K)..."
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50/70 py-1.5 pr-3 pl-8 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Shortcuts Categories */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {filteredShortcuts.map((cat, idx) => (
          <Card key={idx} className="overflow-hidden border border-neutral-200/80 dark:border-neutral-800">
            <CardHeader className="bg-neutral-50/80 border-b border-neutral-100 p-4 dark:bg-neutral-900/60 dark:border-neutral-800">
              <CardTitle className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <IconKeyboard className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                <span>{cat.category}</span>
              </CardTitle>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                {cat.description}
              </p>
            </CardHeader>

            <CardContent className="p-0 divide-y divide-neutral-100 dark:divide-neutral-800">
              {cat.items.map((item, itemIdx) => (
                <div
                  key={itemIdx}
                  className="flex items-center justify-between gap-3 p-3.5 hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors"
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <p className="text-xs font-bold text-neutral-900 dark:text-white">
                      {item.description}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                      {item.action}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <kbd className="inline-block rounded-lg border border-neutral-300 bg-neutral-100 px-2.5 py-1 font-mono text-xs font-bold text-neutral-800 shadow-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                      {item.key}
                    </kbd>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
