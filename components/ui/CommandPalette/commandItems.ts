'use client';

import React from 'react';
import {
  IconSun,
  IconLayoutSidebarLeftCollapse,
  IconHelpCircle,
} from '@tabler/icons-react';
import {
  APP_NAVIGATION_ITEMS,
  RolePermissions,
} from '@/lib/constants/navigation';

export type { RolePermissions } from '@/lib/constants/navigation';

export interface CommandActionContext {
  toggleTheme: () => void;
  isDark: boolean;
  toggleSidebar: () => void;
  openLogoutModal: () => void;
  navigate: (href: string) => void;
}

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'menu' | 'action';
  href?: string;
  icon: React.ElementType;
  keywords: string[];
  shortcut?: string;
  badge?: string | number;
  isSuggestedForRole?: (perms: RolePermissions) => boolean;
  isAllowedForRole?: (perms: RolePermissions) => boolean;
  perform?: (ctx: CommandActionContext) => void;
}

// Aksi Cepat Sistem
const SYSTEM_ACTIONS: CommandItem[] = [
  {
    id: 'act-toggle-theme',
    title: 'Ganti Mode Tampilan (Gelap / Terang)',
    subtitle: 'Beralih antara tema gelap dan terang seketika',
    category: 'action',
    icon: IconSun,
    keywords: ['tema', 'dark mode', 'light mode', 'gelap', 'terang', 'theme'],
    shortcut: 'Tema',
    isSuggestedForRole: () => true,
    isAllowedForRole: () => true,
    perform: (ctx) => ctx.toggleTheme(),
  },
  {
    id: 'act-toggle-sidebar',
    title: 'Buka / Sembunyikan Sidebar',
    subtitle: 'Luaskan area kerja konten utama',
    category: 'action',
    icon: IconLayoutSidebarLeftCollapse,
    keywords: ['sidebar', 'menu samping', 'sembunyikan menu', 'collapse sidebar'],
    shortcut: 'Sidebar',
    isSuggestedForRole: () => true,
    isAllowedForRole: () => true,
    perform: (ctx) => ctx.toggleSidebar(),
  },
  {
    id: 'act-help',
    title: 'Pusat Bantuan & Panduan',
    subtitle: 'Buku panduan penggunaan fitur & FAQ sistem',
    category: 'menu',
    href: '/help',
    icon: IconHelpCircle,
    keywords: ['bantuan', 'help', 'panduan', 'faq', 'tutorial', 'sop'],
    isSuggestedForRole: () => true,
    isAllowedForRole: () => true,
  },
];

/**
 * Otomatis mengonversi seluruh modul rute navigasi dari Single Source of Truth (navigation.ts)
 * ditambah aksi sistem menjadi katalog pencarian Command Palette.
 */
export const ALL_COMMAND_ITEMS: CommandItem[] = [
  ...APP_NAVIGATION_ITEMS.map((item): CommandItem => ({
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    category: 'menu',
    href: item.href,
    icon: item.icon,
    keywords: item.keywords || [item.title.toLowerCase()],
    isAllowedForRole: item.isAllowedForRole,
    isSuggestedForRole: item.isSuggestedForRole,
  })),
  ...SYSTEM_ACTIONS,
];

export function getFilteredCommands(perms: RolePermissions): CommandItem[] {
  return ALL_COMMAND_ITEMS.filter((item) => {
    if (!item.isAllowedForRole) return true;
    return item.isAllowedForRole(perms);
  });
}

export function getSuggestedCommands(perms: RolePermissions): CommandItem[] {
  const allowed = getFilteredCommands(perms);
  return allowed.filter((item) => {
    if (!item.isSuggestedForRole) return false;
    return item.isSuggestedForRole(perms);
  });
}
