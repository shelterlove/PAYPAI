'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'paypai-theme';

type ThemeMode = 'light' | 'dark';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const initial: ThemeMode = saved || (prefersDark ? 'dark' : 'light');
    setMode(initial);
    document.documentElement.classList.toggle('theme-dark', initial === 'dark');
  }, []);

  const toggleMode = () => {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.classList.toggle('theme-dark', next === 'dark');
    }
  };

  return (
    <button
      type="button"
      onClick={toggleMode}
      className={`btn-tertiary px-3 py-2 text-sm rounded-full ${className}`}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
    >
      <span className="text-base leading-none">{mode === 'dark' ? '☾' : '☀︎'}</span>
    </button>
  );
}
