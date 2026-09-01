'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  IconKey,
  IconShieldLock,
  IconTruckDelivery,
  IconShoppingCart,
  IconReceipt2,
  IconKeyboard,
  IconPrinter,
  IconHelpCircle,
  IconChevronDown,
  IconChevronRight,
  IconX,
  IconSearch,
  IconFileText,
  IconEdit,
  IconPlus,
} from '@tabler/icons-react';
import { HelpTopicId, HelpArticle } from '../types';
import { useIsAdmin } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { helpDocsApi } from '@/lib/api/help-docs';

interface NavGroup {
  id: string;
  title: string;
  icon: React.ElementType;
  items: {
    id: HelpTopicId;
    title: string;
    badge?: string;
    isDynamic?: boolean;
    articleId?: string;
  }[];
}

const STATIC_GROUPS: NavGroup[] = [
  {
    id: 'roles',
    title: 'Peran & Hak Akses',
    icon: IconKey,
    items: [
      { id: 'roles-overview', title: '5 Klasifikasi Peran' },
      { id: 'capability-matrix', title: 'Matriks Hak Akses Modul', badge: 'Penting' },
    ],
  },
  {
    id: 'gudang',
    title: 'Gudang & Logistik',
    icon: IconTruckDelivery,
    items: [
      { id: 'sop-transfers', title: 'SOP Transfer Antar Cabang' },
      { id: 'sop-waste', title: 'SOP Barang Rusak & Kadaluarsa (Waste)' },
      { id: 'sop-opname', title: 'SOP Penghitungan Stok Opname' },
      { id: 'sop-binding', title: 'SOP Penugasan Lokasi Cabang' },
    ],
  },
  {
    id: 'kasir',
    title: 'Kasir & Penjualan',
    icon: IconShoppingCart,
    items: [
      { id: 'sop-pos', title: 'SOP Transaksi Penjualan Kasir' },
      { id: 'sop-return', title: 'SOP Retur & Penukaran Barang' },
    ],
  },
  {
    id: 'finance',
    title: 'Keuangan & HR',
    icon: IconReceipt2,
    items: [
      { id: 'sop-cashflow', title: 'SOP Arus Kas & Biaya Toko' },
      { id: 'sop-payroll', title: 'SOP Absensi GPS & Penggajian' },
    ],
  },
  {
    id: 'shortcuts',
    title: 'Pintasan Keyboard',
    icon: IconKeyboard,
    items: [{ id: 'shortcuts', title: 'Daftar Pintasan Tombol (Hotkeys)', badge: 'Hotkeys' }],
  },
  {
    id: 'hardware',
    title: 'Perangkat Keras',
    icon: IconPrinter,
    items: [{ id: 'hardware', title: 'Panduan Scanner & Printer Thermal' }],
  },
  {
    id: 'faq',
    title: 'Bantuan & FAQ',
    icon: IconHelpCircle,
    items: [{ id: 'faq', title: 'Tanya Jawab & Kontak IT Support' }],
  },
];

interface HelpSidebarProps {
  activeTopic: HelpTopicId;
  onSelectTopic: (topicId: HelpTopicId) => void;
  mobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
  searchFilter: string;
  onSearchChange: (q: string) => void;
}

export function HelpSidebar({
  activeTopic,
  onSelectTopic,
  mobileMenuOpen,
  onCloseMobileMenu,
  searchFilter,
  onSearchChange,
}: HelpSidebarProps) {
  const isAdminUser = useIsAdmin();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Fetch dynamic articles from Supabase
  const { data: articlesRes } = useQuery({
    queryKey: ['help-articles'],
    queryFn: () => helpDocsApi.getAll(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const dynamicArticles = articlesRes?.data || [];

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleItemClick = (id: HelpTopicId) => {
    onSelectTopic(id);
    onCloseMobileMenu();
  };

  // Merge static groups with dynamic articles
  const allGroups = STATIC_GROUPS.map((grp) => {
    const matchingDynamics = dynamicArticles
      .filter((art) => art.category === grp.id)
      .map((art) => ({
        id: art.slug,
        title: art.title,
        badge: 'Custom',
        isDynamic: true,
        articleId: art.id,
      }));

    return {
      ...grp,
      items: [...grp.items, ...matchingDynamics],
    };
  });

  // Check if there are unassigned dynamic articles (e.g. 'umum')
  const unassignedDynamics = dynamicArticles
    .filter((art) => !STATIC_GROUPS.some((grp) => grp.id === art.category))
    .map((art) => ({
      id: art.slug,
      title: art.title,
      badge: 'Baru',
      isDynamic: true,
      articleId: art.id,
    }));

  if (unassignedDynamics.length > 0) {
    allGroups.push({
      id: 'umum',
      title: 'Panduan Tambahan',
      icon: IconFileText,
      items: unassignedDynamics,
    });
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Mobile Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 p-4 lg:hidden dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <IconShieldLock className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          <span className="font-bold text-sm text-neutral-900 dark:text-white">Daftar Topik Bantuan</span>
        </div>
        <button
          type="button"
          onClick={onCloseMobileMenu}
          className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Tutup Menu"
        >
          <IconX size={18} />
        </button>
      </div>

      {/* Filter / Search within Docs Navigation */}
      <div className="p-3 border-b border-neutral-100 dark:border-neutral-800/80">
        <div className="relative">
          <IconSearch size={14} className="pointer-events-none absolute inset-y-0 left-2.5 my-auto text-neutral-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Saring topik bantuan..."
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50/70 py-1.5 pr-3 pl-8 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-white dark:focus:bg-neutral-900"
          />
        </div>
      </div>

      {/* Navigation Groups List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-3" aria-label="Navigasi Dokumentasi">
        {allGroups.map((group) => {
          const isCollapsed = !!collapsedGroups[group.id];
          const GroupIcon = group.icon;

          // Filter items by searchFilter
          const matchingItems = group.items.filter((item) =>
            !searchFilter || item.title.toLowerCase().includes(searchFilter.toLowerCase())
          );

          if (searchFilter && matchingItems.length === 0) {
            return null;
          }

          return (
            <div key={group.id} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/60"
              >
                <span className="flex items-center gap-2">
                  <GroupIcon size={15} className="text-neutral-400 dark:text-neutral-500" />
                  <span>{group.title}</span>
                </span>
                {isCollapsed ? <IconChevronRight size={13} /> : <IconChevronDown size={13} />}
              </button>

              {!isCollapsed && (
                <div className="pl-3.5 space-y-0.5 border-l-2 border-neutral-100 dark:border-neutral-800 ml-3">
                  {matchingItems.map((item) => {
                    const isActive = activeTopic === item.id;
                    return (
                      <div key={item.id} className="group flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => handleItemClick(item.id)}
                          className={`flex-1 flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-brand-50 text-brand-700 font-bold dark:bg-brand-950/60 dark:text-brand-300'
                              : 'text-neutral-600 hover:bg-neutral-100/80 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-200'
                          }`}
                        >
                          <span className="truncate">{item.title}</span>
                          {item.badge && (
                            <span
                              className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold shrink-0 ml-1 ${
                                isActive
                                  ? 'bg-brand-200 text-brand-800 dark:bg-brand-900 dark:text-brand-200'
                                  : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>

                        {/* Admin Quick Edit Icon for Dynamic Article */}
                        {isAdminUser && item.isDynamic && item.articleId && (
                          <Link
                            href={`/help/editor?id=${item.articleId}`}
                            title="Edit Dokumen SOP"
                            className="hidden group-hover:flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-200 hover:text-brand-600 dark:hover:bg-neutral-800 dark:hover:text-brand-400"
                          >
                            <IconEdit size={12} />
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Admin Quick Action Footer in Sidebar */}
      {isAdminUser && (
        <div className="p-3 border-t border-neutral-200/80 dark:border-neutral-800/80">
          <Link
            href="/help/editor"
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 py-2 text-xs font-bold text-brand-700 hover:bg-brand-100/80 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300 transition-colors"
          >
            <IconPlus size={14} />
            <span>+ Tambah Dokumen SOP</span>
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sub-Sidebar */}
      <aside className="hidden lg:block w-72 shrink-0 border-r border-neutral-200/80 bg-neutral-50/50 dark:border-neutral-800/80 dark:bg-neutral-900/40">
        <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-hidden">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer Backdrop & Sheet */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobileMenu}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-4/5 max-w-sm bg-white shadow-2xl dark:bg-neutral-900">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
