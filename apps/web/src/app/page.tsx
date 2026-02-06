'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectWallet } from '@/components/ConnectWallet';
import { Dashboard } from '@/components/Dashboard';

export default function Home() {
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  return (
    <div className="min-h-screen bg-cro-bg cro-glow">
      {/* Header */}
      <header className="border-b border-cro-border bg-cro-dark/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {/* CRO Logo */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cro-cyan to-cro-navy flex items-center justify-center shadow-lg shadow-cro-cyan/20">
                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                  <path
                    d="M16 2L4 9v14l12 7 12-7V9L16 2z"
                    fill="url(#cro-gradient)"
                    stroke="#00D4FF"
                    strokeWidth="1"
                  />
                  <path
                    d="M16 8l-6 3.5v7L16 22l6-3.5v-7L16 8z"
                    fill="#050B15"
                    stroke="#00D4FF"
                    strokeWidth="0.5"
                  />
                  <defs>
                    <linearGradient id="cro-gradient" x1="4" y1="2" x2="28" y2="30">
                      <stop offset="0%" stopColor="#002D74" />
                      <stop offset="100%" stopColor="#0B1426" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div>
                <h1 className="font-bold text-cro-text">Collateral Dashboard</h1>
                <p className="text-xs text-cro-muted">Cronos / Tectonic</p>
              </div>
            </div>
            <ConnectWallet />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard />
      </main>

      {/* Footer - only show demo notice when wallet not connected */}
      {mounted && !isConnected && (
        <footer className="border-t border-cro-border mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <p className="text-center text-sm text-cro-muted">
              MVP - Data is simulated for demo purposes
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
