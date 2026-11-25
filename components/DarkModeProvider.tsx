'use client';

import { createContext, useContext, useEffect, useCallback, useSyncExternalStore, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface DarkModeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);
const themeListeners = new Set<() => void>();

function subscribeTheme(listener: () => void) {
  themeListeners.add(listener);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'theme') listener();
  };
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener('change', listener);
  window.addEventListener('storage', handleStorage);
  return () => {
    themeListeners.delete(listener);
    mql.removeEventListener('change', listener);
    window.removeEventListener('storage', handleStorage);
  };
}

function getThemeSnapshot(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {}
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    () => 'light' as Theme,
  );

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('light', 'dark');
    html.classList.add(theme);
    document.body.style.backgroundColor = '';
    document.body.style.color = '';
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const current = getThemeSnapshot();
    const newTheme: Theme = current === 'light' ? 'dark' : 'light';
    try {
      localStorage.setItem('theme', newTheme);
    } catch {}
    themeListeners.forEach((listener) => listener());
  }, []);

  return (
    <DarkModeContext.Provider value={{ theme, toggleTheme }}>{children}</DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within DarkModeProvider');
  }
  return context;
}
