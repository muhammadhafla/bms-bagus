'use client';

import { useDarkMode } from '@/components/DarkModeProvider';
import { IconMoon, IconSun } from '@tabler/icons-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useDarkMode();
  
  return (
    <button
      onClick={toggleTheme}
      className="absolute top-4 right-4 p-2.5 rounded-xl bg-white dark:bg-neutral-900 shadow-elevated border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all btn-press z-10"
      aria-label={theme === 'light' ? 'Aktifkan Mode Gelap' : 'Aktifkan Mode Terang'}
    >
      {theme === 'light' ? <IconMoon className="w-5 h-5" /> : <IconSun className="w-5 h-5" />}
    </button>
  );
}
