'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Wallet icons as inline SVGs
const WalletIcons: Record<string, React.ReactNode> = {
  CryptoComWallet: (
    <svg viewBox="0 0 32 32" className="w-8 h-8">
      <circle cx="16" cy="16" r="14" fill="#002D74"/>
      <path
        d="M16 6L8 10.5v11L16 26l8-4.5v-11L16 6z"
        fill="none"
        stroke="#00D4FF"
        strokeWidth="1.5"
      />
      <path
        d="M16 10l-4 2.25v5.5L16 20l4-2.25v-5.5L16 10z"
        fill="#002D74"
        stroke="#00D4FF"
        strokeWidth="1"
      />
    </svg>
  ),
  MetaMask: (
    <svg viewBox="0 0 35 33" className="w-8 h-8">
      <path d="M32.96 1l-13.14 9.72 2.45-5.73L32.96 1z" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2.66 1l13.02 9.8-2.33-5.81L2.66 1zm25.57 22.53l-3.5 5.34 7.49 2.06 2.14-7.28-6.13-.12zm-26.96.12l2.13 7.28 7.47-2.06-3.48-5.34-6.12.12z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10.47 14.51l-2.08 3.14 7.4.34-.26-7.97-5.06 4.49zm14.68 0l-5.16-4.57-.17 8.05 7.4-.34-2.07-3.14zM10.87 28.87l4.49-2.16-3.88-3.02-.61 5.18zm9.4-2.16l4.46 2.16-.58-5.18-3.88 3.02z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M24.73 28.87l-4.46-2.16.36 2.9-.04 1.23 4.14-1.97zm-13.86 0l4.16 1.97-.03-1.23.36-2.9-4.49 2.16z" fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15.02 21.89l-3.76-1.1 2.66-1.22 1.1 2.32zm5.58 0l1.1-2.32 2.68 1.22-3.78 1.1z" fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10.87 28.87l.63-5.34-4.12.12 3.49 5.22zm13.25-5.34l.61 5.34 3.5-5.22-4.11-.12zm3.13-6.39l-7.4.34.68 3.8 1.1-2.32 2.68 1.22 2.94-3.04zM11.26 20.78l2.66-1.22 1.1 2.32.69-3.8-7.4-.34 2.95 3.04z" fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.31 17.14l3.04 5.94-.1-2.96-2.94-2.98zm15.06 2.98l-.12 2.96 3.06-5.94-2.94 2.98zm-7.67-2.64l-.69 3.8.87 4.49.2-5.91-.38-2.38zm4.22 0l-.36 2.36.18 5.93.87-4.49-.69-3.8z" fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20.6 21.89l-.87 4.49.63.44 3.88-3.02.12-2.96-3.76 1.05zm-9.34-1.05l.1 2.96 3.88 3.02.63-.44-.87-4.49-3.74-1.05z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20.64 30.84l.04-1.23-.34-.29h-5.04l-.32.29.03 1.23-4.14-1.97 1.45 1.19 2.93 2.03h5.12l2.95-2.03 1.44-1.19-4.12 1.97z" fill="#C0AD9E" stroke="#C0AD9E" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20.27 26.71l-.63-.44h-3.66l-.63.44-.36 2.9.32-.29h5.04l.34.29-.42-2.9z" fill="#161616" stroke="#161616" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M33.52 11.35l1.1-5.36L32.96 1l-12.7 9.4 4.9 4.11 6.9 2.01 1.52-1.78-.66-.48 1.05-.96-.81-.62 1.05-.8-.69-.52zM.68 6l1.1 5.35-.7.52 1.06.8-.8.62 1.05.96-.67.48 1.52 1.78 6.9-2.01 4.9-4.11L2.34 1 .68 6z" fill="#763D16" stroke="#763D16" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M32.06 16.52l-6.9-2.01 2.08 3.14-3.06 5.94 4.04-.05h6.05l-2.21-7.02zm-21.59-2.01l-6.9 2.01-2.18 7.02h6.03l4.03.05-3.04-5.94 2.06-3.14zm9.45 3.57l.44-7.6 2-5.43h-8.9l2 5.43.44 7.6.17 2.4.01 5.89h3.66l.02-5.89.16-2.4z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  WalletConnect: (
    <svg viewBox="0 0 32 32" className="w-8 h-8">
      <path
        d="M9.58 11.58c3.54-3.47 9.28-3.47 12.83 0l.43.42a.44.44 0 010 .63l-1.46 1.43a.23.23 0 01-.32 0l-.59-.57a6.47 6.47 0 00-8.95 0l-.63.62a.23.23 0 01-.32 0L9.1 12.68a.44.44 0 010-.63l.48-.47zm15.86 2.95l1.3 1.28a.44.44 0 010 .63l-5.87 5.75a.46.46 0 01-.64 0l-4.17-4.08a.11.11 0 00-.16 0l-4.17 4.08a.46.46 0 01-.64 0l-5.87-5.75a.44.44 0 010-.63l1.3-1.28a.46.46 0 01.64 0l4.17 4.08a.11.11 0 00.16 0l4.17-4.08a.46.46 0 01.64 0l4.17 4.08a.11.11 0 00.16 0l4.17-4.08a.46.46 0 01.64 0z"
        fill="#3B99FC"
      />
    </svg>
  ),
  BrowserWallet: (
    <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="#00D4FF" />
      <path d="M7 12h2m4 0h4" stroke="#00D4FF" />
      <circle cx="17" cy="12" r="1" fill="#00D4FF" />
    </svg>
  ),
};

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close modal when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsModalOpen(false);
      }
    }
    if (isModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isModalOpen]);

  // Close modal on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsModalOpen(false);
      }
    }
    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isModalOpen]);

  // Find connectors
  const injectedConnector = connectors.find(c =>
    c.name.toLowerCase().includes('injected') ||
    c.name.toLowerCase() === 'browser wallet' ||
    c.name.toLowerCase().includes('metamask')
  );
  const walletConnectConnector = connectors.find(c => c.name.toLowerCase().includes('walletconnect'));

  const handleConnect = (connector: typeof connectors[number]) => {
    connect({ connector });
    setIsModalOpen(false);
  };

  // Avoid hydration mismatch by not rendering wallet-specific content on server
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
    <>
      {/* Connect Wallet Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 text-sm font-medium text-cro-bg bg-gradient-to-r from-cro-cyan to-cro-accent rounded-lg hover:shadow-lg hover:shadow-cro-cyan/25 transition-all"
      >
        Connect Wallet
      </button>

      {/* Modal Overlay - rendered via portal to body for proper centering */}
      {isModalOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          {/* Modal */}
          <div
            ref={modalRef}
            className="bg-cro-card border border-cro-border rounded-2xl w-full max-w-md shadow-2xl shadow-black/50 max-h-[90vh] overflow-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-cro-border">
              <h2 className="text-lg font-semibold text-cro-text">Connect Wallet</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-cro-muted hover:text-cro-text transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Read-only notice */}
            <div className="mx-4 mt-4 flex items-start gap-2 p-3 bg-cro-success/10 border border-cro-success/30 rounded-lg">
              <svg className="w-4 h-4 text-cro-success mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-xs text-cro-success leading-relaxed">
                <span className="font-semibold">Read-only access.</span> This app only reads your wallet address to fetch on-chain data. It cannot initiate transactions, move funds, or request signatures.
              </p>
            </div>

            {/* Wallet Options */}
            <div className="p-4 flex flex-col gap-3">
              {/* Browser / Injected wallet (MetaMask, Crypto.com Onchain, etc.) */}
              {injectedConnector && (
                <button
                  onClick={() => handleConnect(injectedConnector)}
                  disabled={isPending}
                  className="flex items-center gap-4 p-4 bg-cro-dark border border-cro-border rounded-xl hover:border-cro-cyan/50 hover:bg-cro-cyan/5 transition-all disabled:opacity-50 text-left"
                >
                  <div className="flex gap-2">
                    {WalletIcons.CryptoComWallet}
                    {WalletIcons.MetaMask}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-cro-text">Browser Wallet</div>
                    <div className="text-xs text-cro-muted">MetaMask, Crypto.com Onchain, or any injected wallet</div>
                  </div>
                </button>
              )}

              {/* WalletConnect */}
              {walletConnectConnector && (
                <button
                  onClick={() => handleConnect(walletConnectConnector)}
                  disabled={isPending}
                  className="flex items-center gap-4 p-4 bg-cro-dark border border-cro-border rounded-xl hover:border-cro-cyan/50 hover:bg-cro-cyan/5 transition-all disabled:opacity-50 text-left"
                >
                  <div className="w-8 h-8 flex items-center justify-center">
                    {WalletIcons.WalletConnect}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-cro-text">WalletConnect</div>
                    <div className="text-xs text-cro-muted">Scan QR code with any mobile wallet</div>
                  </div>
                </button>
              )}
            </div>

            {/* Loading State */}
            {isPending && (
              <div className="px-4 pb-4">
                <div className="flex items-center justify-center gap-2 p-3 bg-cro-cyan/10 border border-cro-cyan/30 rounded-lg">
                  <div className="animate-spin w-4 h-4 border-2 border-cro-cyan border-t-transparent rounded-full" />
                  <span className="text-sm text-cro-cyan">Connecting...</span>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
