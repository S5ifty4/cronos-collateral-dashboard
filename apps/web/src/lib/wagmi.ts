import { http, createConfig } from 'wagmi';
import { cronos } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';

// Reown (formerly WalletConnect) project ID
// Get yours at https://cloud.reown.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId && process.env.NODE_ENV === 'production') {
  throw new Error(
    '[Reown] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. ' +
    'Get a project ID at https://cloud.reown.com'
  );
}

export const wcProjectId = projectId || 'dev-placeholder-replace-me';

// Reown AppKit adapter — handles WalletConnect with working Reown CDN
export const wagmiAdapter = new WagmiAdapter({
  networks: [cronos],
  projectId: wcProjectId,
  transports: {
    [cronos.id]: http('https://evm.cronos.org'),
  },
});

// Wagmi config — derived from the adapter (keeps wagmi hooks working as-is)
export const config = wagmiAdapter.wagmiConfig;

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
