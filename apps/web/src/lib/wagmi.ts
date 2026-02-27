import { http, createConfig } from 'wagmi';
import { cronos } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// WalletConnect project ID — get yours at https://cloud.walletconnect.com
// Required: set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in your .env.local
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId && process.env.NODE_ENV === 'production') {
  throw new Error(
    '[wagmi] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. ' +
    'Get a project ID at https://cloud.walletconnect.com and add it to your environment.'
  );
}

// In dev/test we allow a fallback placeholder — WC modal just won't work until ID is set
const wcProjectId = projectId || 'dev-placeholder-replace-me';

export const config = createConfig({
  chains: [cronos],
  connectors: [
    // Injected connector handles MetaMask, Crypto.com Onchain, and any browser wallet
    injected(),
    // WalletConnect for mobile wallets and WC-compatible extensions
    walletConnect({ projectId: wcProjectId }),
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
