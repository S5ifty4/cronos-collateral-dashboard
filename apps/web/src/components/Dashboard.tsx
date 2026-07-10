'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import type { ScenarioResult, CollateralPosition, BorrowPosition, ProtocolSnapshot, UnifiedPortfolio } from '@cronos-dash/shared';
import { calculateRiskMetrics } from '@cronos-dash/shared';
import type { SimulationData } from './ScenarioSimulator';
import { fetchPortfolio, fetchPrices } from '@/lib/api';
import { KPICards } from './KPICards';
import { PositionTables } from './PositionTables';
import { ScenarioSimulator } from './ScenarioSimulator';
import { RepayWithCollateralBox } from './RepayWithCollateralBox';
import { LiquidationScenarioBox } from './LiquidationScenarioBox';
import { LiquidationHistoryBox } from './LiquidationHistoryBox';
import { TargetHFHelper } from './TargetHFHelper';
import { FulcromPositions } from './FulcromPositions';

// Fallback prices for demo mode (used if API fails)
const FALLBACK_PRICES: Record<string, number> = {
  CRO: 0.09,
  USDC: 1.0,
  ETH: 3200,
  WBTC: 98000,
  BTC: 98000,
  SOL: 180,
  BNB: 600,
  XRP: 2.5,
  ADA: 0.9,
  AVAX: 35,
  DOGE: 0.3,
  DOT: 7,
  MATIC: 0.5,
  LINK: 18,
  ATOM: 9,
};

// Collateral options with default LT percentages
const COLLATERAL_OPTIONS = [
  { symbol: 'CRO', name: 'Cronos', defaultLT: 75 },
  { symbol: 'BTC', name: 'Bitcoin', defaultLT: 80 },
  { symbol: 'ETH', name: 'Ethereum', defaultLT: 82 },
  { symbol: 'SOL', name: 'Solana', defaultLT: 70 },
  { symbol: 'BNB', name: 'BNB', defaultLT: 75 },
  { symbol: 'XRP', name: 'XRP', defaultLT: 65 },
  { symbol: 'ADA', name: 'Cardano', defaultLT: 65 },
  { symbol: 'AVAX', name: 'Avalanche', defaultLT: 70 },
  { symbol: 'DOGE', name: 'Dogecoin', defaultLT: 50 },
  { symbol: 'DOT', name: 'Polkadot', defaultLT: 65 },
  { symbol: 'MATIC', name: 'Polygon', defaultLT: 70 },
  { symbol: 'LINK', name: 'Chainlink', defaultLT: 70 },
  { symbol: 'ATOM', name: 'Cosmos', defaultLT: 65 },
];

function createDemoPortfolio(prices: Record<string, number>, collateralAmount: number, usdcBorrowed: number, ltPercent: number, assetSymbol: string): UnifiedPortfolio {
  const assetPrice = prices[assetSymbol] || FALLBACK_PRICES[assetSymbol] || 1;
  const collateralValueUsd = collateralAmount * assetPrice;
  const lt = ltPercent / 100;

  const collaterals: CollateralPosition[] = [
    {
      asset: { symbol: assetSymbol, address: '0x0000000000000000000000000000000000000000', decimals: 18 },
      amount: collateralAmount,
      valueUsd: collateralValueUsd,
      liquidationThreshold: lt,
      enabled: true,
    },
  ];

  const borrows: BorrowPosition[] = [
    {
      asset: { symbol: 'USDC', address: '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59', decimals: 6 },
      amount: usdcBorrowed,
      valueUsd: usdcBorrowed,
    },
  ];

  const totals = {
    collateralUsd: collaterals.reduce((sum, c) => sum + c.valueUsd, 0),
    borrowUsd: borrows.reduce((sum, b) => sum + b.valueUsd, 0),
    weightedCollateralUsd: collaterals.reduce((sum, c) => sum + c.valueUsd * c.liquidationThreshold, 0),
  };

  const risk = calculateRiskMetrics(collaterals, borrows, prices);

  const snapshot: ProtocolSnapshot = {
    protocol: 'tectonic',
    collaterals,
    borrows,
    totals,
    risk,
  };

  return {
    address: '0xDemo',
    snapshots: [snapshot],
    unified: {
      totalCollateralUsd: totals.collateralUsd,
      totalBorrowUsd: totals.borrowUsd,
      totalWeightedCollateralUsd: totals.weightedCollateralUsd,
      healthFactor: risk.healthFactor,
    },
    prices,
    timestamp: Date.now(),
  };
}

function formatSummaryNumber(n: number, decimals = 0): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function buildSimulationSummary(data: SimulationData | null): string | null {
  if (!data) return null;
  const parts: string[] = [];

  for (const [symbol, pct] of Object.entries(data.priceShocks)) {
    parts.push(`${symbol} ${pct >= 0 ? '+' : ''}${formatSummaryNumber(pct, 1)}%`);
  }
  for (const [symbol, amount] of Object.entries(data.repaid)) {
    parts.push(`Repay ${formatSummaryNumber(amount)} ${symbol}`);
  }
  for (const [symbol, amount] of Object.entries(data.addedBorrow)) {
    parts.push(`Borrow ${formatSummaryNumber(amount)} ${symbol}`);
  }
  for (const [symbol, amount] of Object.entries(data.addedCollateral)) {
    parts.push(`Add ${formatSummaryNumber(amount)} ${symbol}`);
  }
  for (const [symbol, amount] of Object.entries(data.withdrawnCollateral)) {
    parts.push(`Use ${formatSummaryNumber(amount)} ${symbol} collateral`);
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

export function Dashboard() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [simulationResetKey, setSimulationResetKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [demoCollateral, setDemoCollateral] = useState(500000);
  const [demoBorrowed, setDemoBorrowed] = useState(10000);
  const [demoLT, setDemoLT] = useState(75);
  const [demoAsset, setDemoAsset] = useState('CRO');
  const [selectedLoanIndex, setSelectedLoanIndex] = useState(0);
  const [activeProtocol, setActiveProtocol] = useState<'tectonic' | 'fulcrom'>('tectonic');

  // Update LT when asset changes
  const handleAssetChange = (symbol: string) => {
    setDemoAsset(symbol);
    const asset = COLLATERAL_OPTIONS.find(a => a.symbol === symbol);
    if (asset) {
      setDemoLT(asset.defaultLT);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Exit demo mode when wallet connects
  useEffect(() => {
    if (isConnected) {
      setDemoMode(false);
    }
  }, [isConnected]);

  const { data: portfolio, isLoading, error } = useQuery({
    queryKey: ['portfolio', address],
    queryFn: () => fetchPortfolio(address!),
    enabled: !!address && isConnected && mounted && !demoMode,
    refetchInterval: 30000,
  });

  // Fetch live prices for demo mode
  const { data: livePrices, isLoading: pricesLoading } = useQuery({
    queryKey: ['prices'],
    queryFn: fetchPrices,
    enabled: demoMode && mounted,
    refetchInterval: 60000, // Refresh every minute
  });

  // Use demo portfolio when in demo mode
  const demoPrices = livePrices || FALLBACK_PRICES;
  const demoPortfolio = demoMode ? createDemoPortfolio(demoPrices, demoCollateral, demoBorrowed, demoLT, demoAsset) : null;
  const activePortfolio = demoMode ? demoPortfolio : portfolio;

  const ProtocolToggle = () => (
    <div className="rounded-2xl border border-cro-border bg-cro-card p-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setActiveProtocol('tectonic')}
          className={`rounded-xl px-3 py-3 text-sm font-semibold transition-all sm:text-base ${
            activeProtocol === 'tectonic'
              ? 'bg-cro-cyan text-cro-dark shadow-[0_0_24px_rgba(76,219,255,0.18)]'
              : 'bg-cro-dark text-cro-muted hover:bg-cro-border hover:text-cro-text'
          }`}
        >
          Tectonic Lending
        </button>
        <button
          type="button"
          onClick={() => setActiveProtocol('fulcrom')}
          className={`rounded-xl px-3 py-3 text-sm font-semibold transition-all sm:text-base ${
            activeProtocol === 'fulcrom'
              ? 'bg-gradient-to-r from-purple-500 to-cro-cyan text-cro-dark shadow-[0_0_24px_rgba(168,85,247,0.20)]'
              : 'bg-cro-dark text-cro-muted hover:bg-cro-border hover:text-cro-text'
          }`}
        >
          Fulcrom Perps
        </button>
      </div>
    </div>
  );

  // Show loading placeholder during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-cro-cyan border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isConnected && !demoMode) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-24 h-24 mb-6 rounded-full bg-cro-card border border-cro-border flex items-center justify-center">
          <svg
            className="w-12 h-12 text-cro-cyan"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-cro-text mb-2">
          Connect Your Wallet
        </h2>
        <p className="text-cro-muted text-center max-w-sm mb-6">
          Connect your wallet to view your Tectonic positions and simulate scenarios.
        </p>
        <div className="flex flex-col items-center gap-3">
          <span className="text-cro-muted text-sm">or</span>
          <button
            onClick={() => setDemoMode(true)}
            className="px-6 py-3 bg-cro-card border border-cro-cyan text-cro-cyan rounded-lg hover:bg-cro-cyan/10 transition-colors font-medium"
          >
            Try Demo Mode
          </button>
          <p className="text-xs text-cro-muted text-center max-w-xs">
            Explore the simulator with sample data
          </p>
        </div>
      </div>
    );
  }

  if (activeProtocol === 'fulcrom') {
    return (
      <div className="space-y-6">
        <ProtocolToggle />
        <FulcromPositions address={address} demoMode={demoMode} />
      </div>
    );
  }

  if ((isLoading && !demoMode) || (demoMode && pricesLoading)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-cro-cyan border-t-transparent rounded-full" />
      </div>
    );
  }

  if ((error || !activePortfolio) && !demoMode) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-cro-danger mb-2">Failed to load portfolio</div>
        <p className="text-cro-muted text-sm">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  if (!activePortfolio) {
    return null;
  }

  const mainSnapshot = activePortfolio.snapshots[0];
  if (!mainSnapshot) {
    return (
      <div className="text-center py-20 text-cro-muted">
        No positions found on Tectonic
      </div>
    );
  }

  // Generate loan pairs from collaterals and borrows
  // Each loan is a collateral/borrow pair for focused analysis
  const loanPairs = mainSnapshot.collaterals.map((col, idx) => {
    const primaryBorrow = mainSnapshot.borrows[0]; // Usually USDC
    return {
      id: idx,
      label: `${col.asset.symbol}/${primaryBorrow?.asset.symbol || 'USDC'}`,
      collateral: col,
      borrow: primaryBorrow,
    };
  });

  // Ensure selected index is valid
  const validSelectedIndex = Math.min(selectedLoanIndex, Math.max(0, loanPairs.length - 1));
  const selectedLoan = loanPairs[validSelectedIndex];

  // Use simulated values if available
  const simulationResult = simulationData?.result || null;

  // Get the collateral asset symbol for price displays (use selected loan's collateral)
  const collateralSymbol = demoMode ? demoAsset : (selectedLoan?.collateral.asset.symbol || mainSnapshot.collaterals[0]?.asset.symbol || 'CRO');

  const displayHF = simulationResult
    ? simulationResult.simulated.healthFactor
    : mainSnapshot.risk.healthFactor;

  const displayLiqPrice = simulationResult
    ? simulationResult.simulated.liquidationPrices[collateralSymbol] || 0
    : mainSnapshot.risk.liquidationPrices[collateralSymbol] || 0;

  const displayBorrow = simulationResult
    ? simulationResult.simulated.totalBorrowUsd
    : mainSnapshot.totals.borrowUsd;

  const displayCollateral = simulationResult
    ? simulationResult.simulated.totalCollateralUsd
    : mainSnapshot.totals.collateralUsd;
  const activeSimulationSummary = buildSimulationSummary(simulationData);
  const clearSimulation = () => {
    setSimulationData(null);
    setSimulationResetKey((key) => key + 1);
  };

  // Compute adjusted collateral positions for display
  const adjustedCollaterals: CollateralPosition[] = mainSnapshot.collaterals.map((col) => {
    const addedAmount = simulationData?.addedCollateral[col.asset.symbol] || 0;
    const withdrawnAmount = simulationData?.withdrawnCollateral[col.asset.symbol] || 0;
    const priceShockPct = simulationData?.priceShocks[col.asset.symbol] || 0;
    const priceMultiplier = 1 + priceShockPct / 100;
    const currentPrice = activePortfolio.prices[col.asset.symbol] || 0;
    const adjustedPrice = currentPrice * priceMultiplier;
    const newAmount = Math.max(0, col.amount + addedAmount - withdrawnAmount);
    const newValueUsd = newAmount * adjustedPrice;

    return {
      ...col,
      amount: newAmount,
      valueUsd: newValueUsd,
    };
  });

  // Compute adjusted borrow positions for display
  const adjustedBorrows: BorrowPosition[] = mainSnapshot.borrows.map((bor) => {
    const repaidAmount = simulationData?.repaid[bor.asset.symbol] || 0;
    const borrowedMore = simulationData?.addedBorrow[bor.asset.symbol] || 0;
    const currentPrice = activePortfolio.prices[bor.asset.symbol] || 1; // USDC = 1
    const newAmount = Math.max(0, bor.amount - repaidAmount + borrowedMore);
    const newValueUsd = newAmount * currentPrice;

    return {
      ...bor,
      amount: newAmount,
      valueUsd: newValueUsd,
    };
  });

  return (
    <div className="space-y-6">
      <ProtocolToggle />
      {/* Positions Bar + CROpium - Only show when connected (not in demo mode) */}
      {!demoMode && loanPairs.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {/* Loan Position Tabs - spans 3 columns (aligns with Health Factor through Total Borrowed) */}
          <div className="col-span-2 lg:col-span-3 bg-cro-card rounded-xl border border-cro-border p-3 flex items-center">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs text-cro-muted px-2 whitespace-nowrap">Positions:</span>
              {loanPairs.map((loan, idx) => (
                <button
                  key={loan.id}
                  onClick={() => setSelectedLoanIndex(idx)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    validSelectedIndex === idx
                      ? 'bg-cro-cyan text-cro-dark'
                      : 'bg-cro-dark text-cro-muted hover:text-cro-text hover:bg-cro-border'
                  }`}
                >
                  {loan.label}
                </button>
              ))}
            </div>
          </div>

          {/* CROpium Banner - spans 1 column (aligns with Total Collateral) */}
          <div className="col-span-2 lg:col-span-1 bg-gradient-to-r from-purple-900/30 to-cro-card rounded-xl border border-purple-500/30 p-3 flex items-center justify-between">
            <span className="text-sm text-purple-300 font-medium">Take a shot of CROpium</span>
            <button
              onClick={() => router.push('/cropium')}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-lg transition-colors"
              title="Enter the CROpium Den"
            >
              💉
            </button>
          </div>
        </div>
      )}

      {/* Demo Mode Banner + CROpium */}
      {demoMode && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {/* Demo Mode Controls - spans 3 columns (aligns with Health Factor through Total Borrowed) */}
          <div className="col-span-2 lg:col-span-3 bg-cro-cyan/10 border border-cro-cyan rounded-lg p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-cro-cyan/20 flex items-center justify-center">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-cro-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-cro-cyan font-medium text-sm sm:text-base">Demo Mode</p>
              </div>
              <button
                onClick={() => setDemoMode(false)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-cro-cyan hover:bg-cro-cyan/10 rounded-lg transition-colors"
              >
                Exit Demo
              </button>
            </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-cro-muted">Collateral</label>
              <select
                value={demoAsset}
                onChange={(e) => handleAssetChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-cro-dark border border-cro-border rounded-lg text-cro-text focus:outline-none focus:ring-1 focus:ring-cro-cyan"
              >
                {COLLATERAL_OPTIONS.map((asset) => (
                  <option key={asset.symbol} value={asset.symbol}>
                    {asset.symbol}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-cro-muted">Amount</label>
              <input
                type="number"
                value={demoCollateral || ''}
                onChange={(e) => setDemoCollateral(e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0))}
                placeholder="0"
                className="w-full px-3 py-2 text-sm font-mono bg-cro-dark border border-cro-border rounded-lg text-cro-text focus:outline-none focus:ring-1 focus:ring-cro-cyan"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-cro-muted">USDC Borrowed</label>
              <input
                type="number"
                value={demoBorrowed || ''}
                onChange={(e) => setDemoBorrowed(e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0))}
                placeholder="0"
                className="w-full px-3 py-2 text-sm font-mono bg-cro-dark border border-cro-border rounded-lg text-cro-text focus:outline-none focus:ring-1 focus:ring-cro-cyan"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-cro-muted">LT %</label>
              <input
                type="number"
                value={demoLT}
                onChange={(e) => setDemoLT(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-full px-3 py-2 text-sm font-mono bg-cro-dark border border-cro-border rounded-lg text-cro-text focus:outline-none focus:ring-1 focus:ring-cro-cyan"
              />
            </div>
          </div>
          </div>

          {/* CROpium Banner - spans 1 column (aligns with Total Collateral) */}
          <div className="col-span-2 lg:col-span-1 bg-gradient-to-r from-purple-900/30 to-cro-card rounded-xl border border-purple-500/30 p-4 flex flex-col items-center justify-center gap-3">
            <span className="text-sm text-purple-300 font-medium text-center">Take a shot of CROpium</span>
            <button
              onClick={() => router.push('/cropium')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-2xl transition-colors"
              title="Enter the CROpium Den"
            >
              💉
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {activeSimulationSummary && (
        <div className="rounded-xl border border-cro-cyan/40 bg-cro-cyan/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-cro-cyan font-semibold">Active Simulation</div>
            <div className="mt-1 text-sm text-cro-text">{activeSimulationSummary}</div>
          </div>
          <button
            type="button"
            onClick={clearSimulation}
            className="self-start sm:self-auto rounded-lg border border-cro-cyan/40 px-3 py-1.5 text-sm text-cro-cyan hover:bg-cro-cyan/10 transition-colors"
          >
            Clear simulation
          </button>
        </div>
      )}

      <KPICards
        healthFactor={displayHF}
        liquidationPrice={displayLiqPrice}
        currentPrice={activePortfolio.prices[collateralSymbol] || 0}
        totalBorrowUsd={displayBorrow}
        totalCollateralUsd={displayCollateral}
        collateralSymbol={collateralSymbol}
      />

      {/* Position Tables */}
      <PositionTables
        collaterals={simulationData ? adjustedCollaterals : mainSnapshot.collaterals}
        borrows={simulationData ? adjustedBorrows : mainSnapshot.borrows}
        originalCollaterals={simulationData ? mainSnapshot.collaterals : undefined}
        originalBorrows={simulationData ? mainSnapshot.borrows : undefined}
        liquidationPrices={
          simulationResult
            ? simulationResult.simulated.liquidationPrices
            : mainSnapshot.risk.liquidationPrices
        }
        prices={activePortfolio.prices}
      />

      {/* Simulator + Repay with Collateral + Liquidation Scenario + Target Helper */}
      <div className="space-y-6">
        <ScenarioSimulator
          key={`scenario-${simulationResetKey}`}
          snapshot={mainSnapshot}
          prices={activePortfolio.prices}
          onSimulationResult={setSimulationData}
          collateralAsset={demoMode ? demoAsset : undefined}
          borrowAsset={selectedLoan?.borrow.asset.symbol}
          showRepayWithCollateral={false}
        />
        <RepayWithCollateralBox
          key={`repay-${simulationResetKey}`}
          snapshot={mainSnapshot}
          prices={activePortfolio.prices}
          onSimulationResult={setSimulationData}
          collateralAsset={demoMode ? demoAsset : undefined}
          borrowAsset={selectedLoan?.borrow.asset.symbol}
        />
        <LiquidationScenarioBox
          snapshot={mainSnapshot}
          prices={activePortfolio.prices}
          collateralAsset={demoMode ? demoAsset : undefined}
          borrowAsset={selectedLoan?.borrow.asset.symbol}
        />
        {!demoMode && <LiquidationHistoryBox address={address} />}
        <TargetHFHelper
          snapshot={mainSnapshot}
          prices={activePortfolio.prices}
          currentHF={mainSnapshot.risk.healthFactor}
        />
      </div>
    </div>
  );
}
