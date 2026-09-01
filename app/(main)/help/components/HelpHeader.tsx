'use client';

import React from 'react';
import Link from 'next/link';
import {
  IconArrowLeft,
  IconShieldLock,
  IconSearch,
  IconSun,
  IconMoon,
  IconUser,
  IconMenu2,
  IconPlus,
} from '@tabler/icons-react';
import { useDarkMode } from '@/components/DarkModeProvider';
import { Profile } from '@/lib/auth';

interface HelpHeaderProps {
  profile: Profile | null;
  userEmail?: string;
  userRoles: string[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenMobileMenu: () => void;
}

export function HelpHeader({
  profile,
  userEmail,
  userRoles,
  searchQuery,
  onSearchChange,
  onOpenMobileMenu,
}: HelpHeaderProps) {
  const { theme, toggleTheme } = useDarkMode();

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/90 backdrop-blur-md dark:border-neutral-800/80 dark:bg-neutral-900/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: Back Button & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 lg:hidden dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-300"
            aria-label="Buka Menu Topik Bantuan"
          >
            <IconMenu2 size={18} />
          </button>

          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-brand-700 dark:hover:bg-brand-950/50 dark:hover:text-brand-300"
          >
            <IconArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">Kembali ke Aplikasi</span>
            <span className="sm:hidden">Kembali</span>
          </Link>

          <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />

          <div className="min-w-0 flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-400">
              <IconShieldLock size={16} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-extrabold tracking-tight text-neutral-900 sm:text-sm dark:text-white truncate">
                Pusat Bantuan & Panduan BMS
              </h1>
              <p className="text-[10px] text-neutral-400 truncate hidden md:block">
                Dokumentasi Hak Akses, SOP, Hotkey, & Hardware
              </p>
            </div>
          </div>
        </div>

        {/* Center: Global Search Input */}
        <div className="relative hidden md:block max-w-xs w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
            <IconSearch size={15} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari fitur, SOP, hotkey, FAQ..."
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50/80 py-1.5 pr-12 pl-9 text-xs text-neutral-900 transition-all placeholder:text-neutral-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-white dark:focus:bg-neutral-900"
          />
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
            <kbd className="rounded border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
              Ctrl+K
            </kbd>
          </div>
        </div>

        {/* Right: Active Role Pill, Dark Mode & User Avatar */}
        <div className="flex items-center gap-2 shrink-0">
          {/* User Active Roles */}
          <div className="hidden xl:flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800/80 px-2.5 py-1 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60">
            <IconUser size={13} className="text-neutral-500" />
            <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
              {profile?.nama || userEmail || 'Pengguna'}:
            </span>
            <div className="flex items-center gap-1">
              {userRoles.map((r) => (
                <span
                  key={r}
                  className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-800 uppercase tracking-wider dark:bg-brand-950 dark:text-brand-300"
                >
                  {r.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Admin Create Document Action */}
          {userRoles.includes('admin') && (
            <Link
              href="/help/editor"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-700 transition-colors"
            >
              <IconPlus size={14} />
              <span className="hidden sm:inline">Tulis Dokumen</span>
            </Link>
          )}

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            aria-label="Ganti Tema Warna"
          >
            {theme === 'dark' ? <IconSun size={15} /> : <IconMoon size={15} />}
          </button>
        </div>
      </div>
    </header>
  );
}
