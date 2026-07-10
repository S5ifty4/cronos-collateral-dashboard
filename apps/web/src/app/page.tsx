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
      <header className="border-b border-cro-border bg-cro-bg/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* CRO Logo */}
              <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
                <svg viewBox="0 0 32 32" className="w-8 h-8 sm:w-10 sm:h-10" fill="none">
                  <defs>
                    <linearGradient id="cro-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4CDBFF" />
                      <stop offset="55%" stopColor="#66DEFF" />
                      <stop offset="100%" stopColor="#1CF1D8" />
                    </linearGradient>
                  </defs>
                  {/* Outer hexagon */}
                  <path
                    d="M16 1L3 8.5v15L16 31l13-7.5v-15L16 1z"
                    fill="#0C0C10"
                    stroke="url(#cro-gradient)"
                    strokeWidth="1.5"
                  />
                  {/* Inner hexagon outline */}
                  <path
                    d="M16 6L7 11v10l9 5 9-5V11L16 6z"
                    fill="none"
                    stroke="#4CDBFF"
                    strokeWidth="1.5"
                  />
                  {/* Center hexagon */}
                  <path
                    d="M16 10l-5 2.9v5.8l5 2.9 5-2.9v-5.8L16 10z"
                    fill="url(#cro-gradient)"
                    stroke="#C7F2FF"
                    strokeWidth="0.75"
                  />
                </svg>
              </div>
              <div>
                <h1 className="font-semibold tracking-tight text-cro-text text-sm sm:text-base">Collateral Dashboard</h1>
                <p className="text-xs text-cro-muted hidden sm:block">Cronos DeFi risk dashboard</p>
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
            {/* Disclaimer */}
            <p className="text-center text-xs text-cro-muted max-w-2xl leading-relaxed">
              Crollateral is an independent, community-built tool. Not affiliated with Tectonic Finance, Fulcrom Finance, or Crypto.com.
              Prices are approximate and may be delayed — always verify your positions directly on the source platform before making
              any decisions. This tool is read-only and never submits transactions or requests wallet signing.
            </p>
            <strong className="text-xs text-cro-muted">Not financial advice. Use at your own risk.</strong>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
              <a href="/terms" className="text-cro-cyan hover:underline">
                Terms of Use
              </a>
              <a
                href="https://tectonic.gitbook.io/docs"
                target="_blank"
                rel="noreferrer"
                className="text-cro-cyan hover:underline"
              >
                Tectonic Whitepaper
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
