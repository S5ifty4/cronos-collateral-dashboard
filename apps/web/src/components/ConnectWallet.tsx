'use client';

import { useAccount, useDisconnect } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useState, useEffect } from 'react';

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        disabled
        className="px-4 py-2 text-sm font-medium text-cro-text bg-cro-card border border-cro-border rounded-lg opacity-50"
      >
        Connect Wallet
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-cro-card border border-cro-border rounded-lg">
          <div className="w-2 h-2 bg-cro-success rounded-full animate-pulse" />
          <span className="text-xs sm:text-sm text-cro-text font-mono">
            {address.slice(0, 4)}...{address.slice(-4)}
          </span>
        </div>
        <button
          onClick={() => disconnect()}
          className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-cro-muted bg-cro-card border border-cro-border rounded-lg hover:bg-cro-card-light hover:text-cro-text transition-colors"
        >
          <span className="hidden sm:inline">Disconnect</span>
          <span className="sm:hidden">×</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => open()}
      className="px-4 py-2 text-sm font-medium text-cro-bg bg-gradient-to-r from-cro-cyan to-cro-accent rounded-lg hover:shadow-lg hover:shadow-cro-cyan/25 transition-all"
    >
      Connect Wallet
    </button>
  );
}
