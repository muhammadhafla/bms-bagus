'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface DarkModeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const html = document.documentElement;
    let initialTheme: Theme = 'light';
    
    if (savedTheme) {
      initialTheme = savedTheme;
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      initialTheme = 'dark';
    }
    
    setTheme(initialTheme);
    html.classList.remove('light', 'dark');
    html.classList.add(initialTheme);
    
    // Clear inline styles
    document.body.style.backgroundColor = '';
    document.body.style.color = '';
    
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      const html = document.documentElement;
      html.classList.remove('light', 'dark');
      html.classList.add(newTheme);
      
      // Clear inline styles
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
      
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  }, []);

  return (
    <DarkModeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within DarkModeProvider');
  }
  return context;
}
