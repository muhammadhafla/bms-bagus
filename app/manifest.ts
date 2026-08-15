import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/bms-bagus',
    name: 'BMS - Bagus Management System',
    short_name: 'BMS Bagus',
    description: 'Aplikasi manajemen inventory, transaksi, dan keuangan toko',
    lang: 'id',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    background_color: '#ffffff',
    theme_color: '#4f46e5',
    orientation: 'portrait-primary',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Dashboard',
        short_name: 'Beranda',
        url: '/dashboard',
        description: 'Lihat ringkasan data bisnis',
      },
      {
        name: 'Stok Inventory',
        short_name: 'Inventory',
        url: '/inventory',
        description: 'Kelola stok produk',
      },
      {
        name: 'Riwayat Transaksi',
        short_name: 'Riwayat',
        url: '/transactions/history',
        description: 'Lihat semua riwayat transaksi',
      },
    ],
  };
}
