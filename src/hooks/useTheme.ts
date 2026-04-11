import { useState, useEffect } from 'react';
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from '../utils/storage';

const THEME_STORAGE_KEY = 'theme';

/** Theme persists in localStorage so it survives page navigation, refresh, and account switches. */
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = safeLocalStorageGetItem(THEME_STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    safeLocalStorageSetItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return { theme, toggleTheme };
}

