'use client';

import { useEffect, useMemo, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { config, chains } from '@/lib/wagmi';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const updateTheme = () => {
      if (typeof document === 'undefined') return;
      setThemeMode(document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light');
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const rainbowTheme = useMemo(
    () =>
      themeMode === 'dark'
        ? darkTheme({
            accentColor: '#6A4BFF',
            accentColorForeground: '#FFFFFF',
            borderRadius: 'large',
            overlayBlur: 'small'
          })
        : lightTheme({
            accentColor: '#5A39BA',
            accentColorForeground: '#FFFFFF',
            borderRadius: 'large',
            overlayBlur: 'small'
          }),
    [themeMode]
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider chains={chains} theme={rainbowTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
