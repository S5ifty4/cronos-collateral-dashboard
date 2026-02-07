'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectWallet } from '@/components/ConnectWallet';
import { Dashboard } from '@/components/Dashboard';

export default function Home() {
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  const donationAddress = '0x25f8FEBc37F6887834B5f43e6E190BeDeC2c15Df';

  const handleCopy = () => {
    navigator.clipboard.writeText(donationAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    setMounted(true);
  }, []);
  return (
    <div className="min-h-screen bg-cro-bg cro-glow">
      {/* Header */}
      <header className="border-b border-cro-border bg-cro-dark/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* CRO Logo */}
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cro-cyan to-cro-navy flex items-center justify-center shadow-lg shadow-cro-cyan/20">
                <svg viewBox="0 0 32 32" className="w-5 h-5 sm:w-6 sm:h-6" fill="none">
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
                <h1 className="font-bold text-cro-text text-sm sm:text-base">Collateral Dashboard</h1>
                <p className="text-xs text-cro-muted hidden sm:block">Cronos / Tectonic</p>
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

      {/* Footer */}
      <footer className="border-t border-cro-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col items-center gap-3">
            <p className="text-center text-sm text-cro-muted">
              Built by a degen liquidated one too many times 💀
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2 text-xs text-cro-muted">
              <span>Help keep this app running:</span>
              <button
                onClick={handleCopy}
                className="group flex items-center gap-2 px-3 py-1.5 bg-cro-card border border-cro-border rounded-lg hover:border-cro-cyan/50 hover:bg-cro-cyan/5 transition-all cursor-pointer"
                title="Click to copy address"
              >
                <code className="text-cro-cyan text-xs font-mono">
                  {donationAddress.slice(0, 6)}...{donationAddress.slice(-4)}
                </code>
                {copied ? (
                  <svg className="w-4 h-4 text-cro-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-cro-muted group-hover:text-cro-cyan transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
                {copied && <span className="text-cro-success text-xs">Copied!</span>}
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
