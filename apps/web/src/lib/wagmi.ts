import { http, createConfig } from 'wagmi';
import { cronos } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// WalletConnect project ID - get yours at https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo';

export const config = createConfig({
  chains: [cronos],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [cronos.id]: http('https://evm.cronos.org'),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
