'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useHaptic } from '@/hooks/useHaptic';
import { useIsAdmin } from '@/lib/auth';
import { 
  IconHome, 
  IconPackage, 
  IconShoppingCart, 
  IconClipboardCheck,
  IconHistory, 
  IconUser,
  IconPrinter
} from '@tabler/icons-react';

export default function BottomNav() {
  const pathname = usePathname();
  const isAdminUser = useIsAdmin();
  const haptic = useHaptic();

  // Hide BottomNav on specific pages that have their own bottom action areas or need full screen
  const isPurchasing = pathname === '/purchasing';
  const isCetakLabel = pathname.startsWith('/bulk-print');
  const isOpnameDetail = pathname.startsWith('/inventory/stock-opname/') && pathname !== '/inventory/stock-opname';
  const isPromoEditor = pathname.startsWith('/inventory/promo/') && pathname !== '/inventory/promo';
  
  if (isPurchasing || isCetakLabel || isOpnameDetail || isPromoEditor) {
    return null;
  }

  const navItems = [
    {
      href: '/dashboard',
      icon: IconHome,
      title: 'Beranda'
    },
    {
      href: '/inventory',
      icon: IconPackage,
      title: 'Stok'
    },
    // Admin gets Pembelian, Staff gets Cetak Label
    ...(isAdminUser ? [{
      href: '/purchasing',
      icon: IconShoppingCart,
      title: 'Pembelian'
    }] : [{
      href: '/bulk-print',
      icon: IconPrinter,
      title: 'Cetak Label'
    }]),
    {
      href: '/transactions/history',
      icon: IconHistory,
      title: 'Riwayat'
    },
    {
      href: '/profile',
      icon: IconUser,
      title: 'Akun'
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-100/95 dark:bg-neutral-950/95 backdrop-blur-md shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)] dark:shadow-none lg:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          // Strict match for dashboard, prefix match for others
          const isActive = item.href === '/dashboard' 
            ? pathname === '/dashboard'
            : (pathname === item.href || pathname.startsWith(item.href + '/'));
            
          const Icon = item.icon;
          
          return (
            <Link
              key={item.title}
              href={item.href}
              onClick={() => {
                haptic.light();
              }}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 select-none active:scale-95 transition-transform ${
                isActive 
                  ? 'text-brand-600 dark:text-brand-400' 
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <Icon 
                className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} 
              />
              <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
