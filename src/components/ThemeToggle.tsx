'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all backdrop-blur-md shadow-lg group relative overflow-hidden"
            aria-label="Toggle theme"
        >
            <div className="relative z-10 w-6 h-6 flex items-center justify-center text-lg">
                {theme === 'dark' ? (
                    <span className="transform group-hover:rotate-90 transition-transform duration-500">🌙</span>
                ) : (
                    <span className="transform group-hover:rotate-90 transition-transform duration-500">☀️</span>
                )}
            </div>
        </button>
    );
}
