'use client';

import { useDarkMode } from '@/components/DarkModeProvider';
import { IconMoon, IconSun } from '@tabler/icons-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useDarkMode();

  return (
    <button
      onClick={toggleTheme}
      className="shadow-elevated btn-press absolute top-4 right-4 z-10 rounded-xl border border-neutral-200 bg-white p-2.5 text-neutral-600 transition-all hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-100"
      aria-label={theme === 'light' ? 'Aktifkan Mode Gelap' : 'Aktifkan Mode Terang'}
    >
      {theme === 'light' ? <IconMoon className="h-5 w-5" /> : <IconSun className="h-5 w-5" />}
    </button>
  );
}
