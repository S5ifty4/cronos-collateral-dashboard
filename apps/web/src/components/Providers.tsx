'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { createAppKit } from '@reown/appkit/react';
import { cronos } from '@reown/appkit/networks';
import { useState, type ReactNode } from 'react';
import { config, wagmiAdapter, wcProjectId } from '@/lib/wagmi';

// Initialize Reown AppKit — this replaces the old WalletConnect modal
// and uses working Reown CDN for wallet icons (fixes broken explorer-api v3 logos)
createAppKit({
  adapters: [wagmiAdapter],
  networks: [cronos],
  projectId: wcProjectId,
  metadata: {
    name: 'Crollateral',
    description: 'DeFi risk dashboard for Cronos lending protocols',
    url: 'https://www.crollateral.finance',
    icons: ['https://www.crollateral.finance/icon.svg'],
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
    swaps: false,
    onramp: false,
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#00D4FF',
    '--w3m-border-radius-master': '12px',
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchInterval: 30_000,
          },
        },
      })
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
