'use client';

import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { fetchPortfolio, fetchPrices } from '@/lib/api';

// Price milestones for quick selection
const PRICE_MILESTONES = [
  { label: '$1.00', value: 1.0 },
  { label: '$2.12', value: 2.12 },
  { label: '$2.71', value: 2.71 },
];

// Market cap calculation constants
const BNB_CIRCULATING_SUPPLY = 140_000_000; // ~140 million BNB
const CRO_CIRCULATING_SUPPLY = 26_400_000_000; // ~26.4 billion CRO

function formatNumber(n: number, decimals = 2): string {
  if (!isFinite(n)) return '0';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatUsd(n: number): string {
  return `$${formatNumber(n)}`;
}

export default function CropiumPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [simulatedPrice, setSimulatedPrice] = useState(0);
  const [priceInput, setPriceInput] = useState('');
  const [manualCroInput, setManualCroInput] = useState('');
  const [useManualInput, setUseManualInput] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch wallet CRO balance
  const { data: walletBalance } = useBalance({
    address: address,
  });

  // Fetch portfolio data (for CRO in positions)
  const { data: portfolio } = useQuery({
    queryKey: ['portfolio', address],
    queryFn: () => fetchPortfolio(address!),
    enabled: !!address && isConnected && mounted,
  });

  // Fetch live prices
  const { data: prices } = useQuery({
    queryKey: ['prices'],
    queryFn: fetchPrices,
    enabled: mounted,
  });

  const currentCroPrice = prices?.CRO || 0.09;
  const currentBnbPrice = prices?.BNB || 600;

  // Calculate CRO price if it had Binance's market cap
  const bnbMarketCap = currentBnbPrice * BNB_CIRCULATING_SUPPLY;
  const croAtBnbMarketCap = bnbMarketCap / CRO_CIRCULATING_SUPPLY;

  // Set initial simulated price to current price
  useEffect(() => {
    if (currentCroPrice > 0 && simulatedPrice === 0) {
      setSimulatedPrice(currentCroPrice);
      setPriceInput(currentCroPrice.toFixed(4));
    }
  }, [currentCroPrice, simulatedPrice]);

  // Calculate CRO holdings
  const walletCro = walletBalance ? Number(walletBalance.formatted) : 0;

  // CRO in collateral positions
  const positionCro = portfolio?.snapshots[0]?.collaterals
    .filter(c => c.asset.symbol === 'CRO')
    .reduce((sum, c) => sum + c.amount, 0) || 0;

  // Auto-detected total
  const autoDetectedCro = walletCro + positionCro;

  // Manual input value
  const manualCro = parseFloat(manualCroInput) || 0;

  // Total CRO - use manual if enabled or not connected, otherwise use auto-detected
  const totalCro = (useManualInput || !isConnected) ? manualCro : autoDetectedCro;

  // Current and simulated values
  const currentValue = totalCro * currentCroPrice;
  const simulatedValue = totalCro * simulatedPrice;
  const valueChange = simulatedValue - currentValue;
  const percentChange = currentValue > 0 ? ((simulatedValue - currentValue) / currentValue) * 100 : 0;

  const handlePriceInputChange = (value: string) => {
    setPriceInput(value);
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      setSimulatedPrice(num);
    }
  };

  const handleSliderChange = (value: number) => {
    setSimulatedPrice(value);
    setPriceInput(value.toFixed(4));
  };

  const handleMilestoneClick = (value: number) => {
    setSimulatedPrice(value);
    setPriceInput(value.toFixed(2));
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-cro-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-cro-cyan border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cro-bg cro-glow">
      {/* Header */}
      <header className="border-b border-cro-border bg-cro-dark/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💉</span>
              <div>
                <h1 className="font-bold text-cro-text">CROpium Den</h1>
                <p className="text-xs text-cro-muted">Dream a little dream...</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-sm font-medium text-cro-muted bg-cro-card border border-cro-border rounded-lg hover:text-cro-text hover:border-cro-cyan/50 transition-all"
            >
              Return to Reality
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
            {/* CRO Holdings Summary */}
            <div className="bg-cro-card rounded-xl border border-cro-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-cro-text">Your CRO Holdings</h2>
                {isConnected && (
                  <button
                    onClick={() => setUseManualInput(!useManualInput)}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                      useManualInput
                        ? 'bg-purple-600 text-white'
                        : 'bg-cro-dark text-cro-muted hover:text-cro-text border border-cro-border'
                    }`}
                  >
                    {useManualInput ? 'Using Manual' : 'Enter Manually'}
                  </button>
                )}
              </div>

              {/* Manual Input Mode or Not Connected */}
              {(useManualInput || !isConnected) ? (
                <div className="mb-4">
                  <label className="block text-sm text-cro-muted mb-2">Enter your total CRO holdings:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={manualCroInput}
                      onChange={(e) => setManualCroInput(e.target.value)}
                      placeholder="0"
                      className="flex-1 px-4 py-3 text-lg font-mono bg-cro-dark border border-cro-border rounded-lg text-cro-text focus:outline-none focus:ring-2 focus:ring-cro-cyan focus:border-cro-cyan"
                    />
                    <span className="text-cro-muted font-medium">CRO</span>
                  </div>
                  {!isConnected && (
                    <p className="text-xs text-cro-muted mt-2">Connect wallet to auto-detect holdings, or enter manually above.</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-cro-dark rounded-lg">
                    <div className="text-sm text-cro-muted mb-1">Wallet Balance</div>
                    <div className="text-xl font-bold text-cro-text">{formatNumber(walletCro)} CRO</div>
                  </div>
                  <div className="p-4 bg-cro-dark rounded-lg">
                    <div className="text-sm text-cro-muted mb-1">In Positions</div>
                    <div className="text-xl font-bold text-cro-text">{formatNumber(positionCro)} CRO</div>
                  </div>
                  <div className="p-4 bg-cro-dark rounded-lg border border-cro-cyan/30">
                    <div className="text-sm text-cro-muted mb-1">Total CRO</div>
                    <div className="text-xl font-bold text-cro-cyan">{formatNumber(autoDetectedCro)} CRO</div>
                  </div>
                </div>
              )}

              {/* Always show total when using manual input */}
              {(useManualInput || !isConnected) && manualCro > 0 && (
                <div className="mt-4 p-4 bg-cro-dark rounded-lg border border-cro-cyan/30">
                  <div className="text-sm text-cro-muted mb-1">Total CRO</div>
                  <div className="text-xl font-bold text-cro-cyan">{formatNumber(totalCro)} CRO</div>
                </div>
              )}
            </div>

            {/* Value Calculator */}
            <div className="bg-cro-card rounded-xl border border-cro-border p-6">
              <h2 className="text-lg font-semibold text-cro-text mb-6">CROpium Calculator</h2>

              {/* Current vs Simulated Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div className="p-6 bg-cro-dark rounded-xl">
                  <div className="text-sm text-cro-muted mb-2">Current Value</div>
                  <div className="text-3xl font-bold text-cro-text">{formatUsd(currentValue)}</div>
                  <div className="text-sm text-cro-muted mt-1">@ {formatUsd(currentCroPrice)}/CRO</div>
                </div>
                <div className={`p-6 rounded-xl border-2 ${valueChange >= 0 ? 'bg-cro-success/10 border-cro-success/30' : 'bg-cro-danger/10 border-cro-danger/30'}`}>
                  <div className="text-sm text-cro-muted mb-2">Simulated Value</div>
                  <div className={`text-3xl font-bold ${valueChange >= 0 ? 'text-cro-success' : 'text-cro-danger'}`}>
                    {formatUsd(simulatedValue)}
                  </div>
                  <div className={`text-sm mt-1 ${valueChange >= 0 ? 'text-cro-success' : 'text-cro-danger'}`}>
                    {valueChange >= 0 ? '+' : ''}{formatUsd(valueChange)} ({valueChange >= 0 ? '+' : ''}{formatNumber(percentChange)}%)
                  </div>
                </div>
              </div>

              {/* Price Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-cro-text mb-2">
                  CRO Price
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-cro-muted">$</span>
                  <input
                    type="number"
                    value={priceInput}
                    onChange={(e) => handlePriceInputChange(e.target.value)}
                    step="0.01"
                    min="0"
                    className="flex-1 px-4 py-3 text-lg font-mono bg-cro-dark border border-cro-border rounded-lg text-cro-text focus:outline-none focus:ring-2 focus:ring-cro-cyan focus:border-cro-cyan"
                  />
                </div>
              </div>

              {/* Price Slider */}
              <div className="mb-6">
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.01"
                  value={simulatedPrice}
                  onChange={(e) => handleSliderChange(Number(e.target.value))}
                  className="w-full h-3 bg-cro-border rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-cro-muted mt-2">
                  <span>$0</span>
                  <span>$1</span>
                  <span>$2</span>
                  <span>$3</span>
                  <span>$4</span>
                  <span>$5</span>
                </div>
              </div>

              {/* Quick Select Milestones */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleMilestoneClick(currentCroPrice)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    Math.abs(simulatedPrice - currentCroPrice) < 0.001
                      ? 'bg-cro-cyan text-cro-bg'
                      : 'bg-cro-dark text-cro-muted hover:text-cro-text border border-cro-border hover:border-cro-cyan/50'
                  }`}
                >
                  Current (${currentCroPrice.toFixed(4)})
                </button>
                {PRICE_MILESTONES.map((milestone) => (
                  <button
                    key={milestone.value}
                    onClick={() => handleMilestoneClick(milestone.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      Math.abs(simulatedPrice - milestone.value) < 0.001
                        ? 'bg-cro-cyan text-cro-bg'
                        : 'bg-cro-dark text-cro-muted hover:text-cro-text border border-cro-border hover:border-cro-cyan/50'
                    }`}
                  >
                    {milestone.label}
                  </button>
                ))}
                <button
                  onClick={() => handleMilestoneClick(croAtBnbMarketCap)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    Math.abs(simulatedPrice - croAtBnbMarketCap) < 0.01
                      ? 'bg-yellow-500 text-cro-bg'
                      : 'bg-cro-dark text-cro-muted hover:text-cro-text border border-yellow-500/50 hover:border-yellow-500'
                  }`}
                  title={`CRO at Binance market cap ($${formatNumber(bnbMarketCap / 1e9)}B)`}
                >
                  🔶 Binance MC (${croAtBnbMarketCap.toFixed(2)})
                </button>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="text-center text-sm text-cro-muted">
              <p>💉 CROpium is for entertainment purposes only. Not financial advice.</p>
              <p className="mt-1">Past performance doesn't guarantee future results. DYOR.</p>
            </div>
          </div>
      </main>
    </div>
  );
}
