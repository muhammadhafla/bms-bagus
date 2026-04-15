import { usePathname } from 'next/navigation';
import {
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
  { href: '/stock-opname', title: 'Stock Opname' },
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
    <header className="sticky top-0 z-40 bg-white dark:bg-neutral-900 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
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
