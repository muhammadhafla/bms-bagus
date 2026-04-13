import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  IconShoppingCart,
  IconArrowBack,
  IconReport,
  IconReceipt,
  IconSun,
  IconMoon,
} from '@tabler/icons-react';
import { useDarkMode } from '@/components/DarkModeProvider';

interface HeaderProps {
  title?: string;
}

const navItems = [
  { href: '/inventory', title: 'Inventory' },
  { href: '/pembelian', title: 'Pembelian' },
  { href: '/return', title: 'Return' },
  { href: '/reports', title: 'Laporan' },
  { href: '/receipt', title: 'Struk' },
];

export default function Header({ title }: HeaderProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useDarkMode();

  const getCurrentPage = () => {
    if (title) return title;
    if (pathname === '/') return 'Home';
    const item = navItems.find((item) => item.href === pathname);
    return item?.title || 'Dashboard';
  };

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 relative flex items-center justify-center">
              <Image
                src="/images/logo.png"
                alt="Logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="font-bold text-neutral-900 dark:text-white hidden sm:block">BMS</span>
          </Link>
          
          <span className="text-neutral-400 dark:text-neutral-500">/</span>
          
          <span className="font-medium text-neutral-900 dark:text-white">
            {getCurrentPage()}
          </span>
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? (
            <IconMoon className="w-5 h-5" />
          ) : (
            <IconSun className="w-5 h-5" />
          )}
        </button>
      </div>
    </header>
  );
}
