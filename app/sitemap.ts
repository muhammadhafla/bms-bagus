import { MetadataRoute } from 'next';

interface RouteConfig {
  path: string;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

const APP_ROUTES: RouteConfig[] = [
  // Root & Autentikasi
  { path: '', changeFrequency: 'daily', priority: 1.0 },
  { path: '/login', changeFrequency: 'monthly', priority: 0.9 },

  // Dashboard & Analitik
  { path: '/dashboard', changeFrequency: 'daily', priority: 0.9 },
  { path: '/analytics', changeFrequency: 'daily', priority: 0.8 },

  // Produk & Katalog (Inventory)
  { path: '/inventory', changeFrequency: 'daily', priority: 0.8 },
  { path: '/inventory/kategori', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/inventory/promo', changeFrequency: 'daily', priority: 0.7 },
  { path: '/inventory/promo/new', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/inventory/stock-opname', changeFrequency: 'daily', priority: 0.7 },
  { path: '/inventory/reports/difference', changeFrequency: 'daily', priority: 0.7 },

  // Operasional & Transaksi
  { path: '/purchasing', changeFrequency: 'daily', priority: 0.8 },
  { path: '/purchasing/supplier', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/transactions/history', changeFrequency: 'daily', priority: 0.8 },
  { path: '/transactions/return', changeFrequency: 'daily', priority: 0.7 },

  // Gudang & Logistik (Warehouse)
  { path: '/warehouse', changeFrequency: 'daily', priority: 0.8 },
  { path: '/warehouse/stocks', changeFrequency: 'daily', priority: 0.7 },
  { path: '/warehouse/transfers', changeFrequency: 'daily', priority: 0.7 },
  { path: '/warehouse/transfers/new', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/warehouse/outbound', changeFrequency: 'daily', priority: 0.7 },
  { path: '/warehouse/master', changeFrequency: 'weekly', priority: 0.7 },

  // Keuangan (Finance)
  { path: '/finance/cash-flow', changeFrequency: 'daily', priority: 0.8 },
  { path: '/finance/operasional', changeFrequency: 'daily', priority: 0.8 },
  { path: '/finance/ledger', changeFrequency: 'daily', priority: 0.8 },

  // HR & Payroll (Staff & Admin)
  { path: '/payroll', changeFrequency: 'daily', priority: 0.7 },
  { path: '/payroll/gaji', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/payroll/slip', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/admin/payroll/kehadiran', changeFrequency: 'daily', priority: 0.7 },
  { path: '/admin/payroll/kasbon', changeFrequency: 'daily', priority: 0.7 },
  { path: '/admin/payroll/gaji', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/admin/payroll/karyawan', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/admin/payroll/lokasi-kerja', changeFrequency: 'monthly', priority: 0.6 },

  // Master Data & Pengaturan
  { path: '/members', changeFrequency: 'daily', priority: 0.7 },
  { path: '/members/tiers', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/users', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/master/label-templates', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/bulk-print', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/print-history', changeFrequency: 'daily', priority: 0.6 },
  { path: '/profile', changeFrequency: 'monthly', priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bms.vercel.app';
  const currentDate = new Date();

  return APP_ROUTES.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: currentDate,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

