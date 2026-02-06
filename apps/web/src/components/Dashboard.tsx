'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import type { ScenarioResult, CollateralPosition, BorrowPosition, ProtocolSnapshot, UnifiedPortfolio } from '@cronos-dash/shared';
import { calculateRiskMetrics } from '@cronos-dash/shared';
import type { SimulationData } from './ScenarioSimulator';
import { fetchPortfolio } from '@/lib/api';
import { KPICards } from './KPICards';
import { PositionTables } from './PositionTables';
import { ScenarioSimulator } from './ScenarioSimulator';
import { TargetHFHelper } from './TargetHFHelper';

// Mock data for demo mode
const DEMO_PRICES: Record<string, number> = {
  CRO: 0.15,
  USDC: 1.0,
  ETH: 2500,
  WBTC: 43000,
};

function createDemoPortfolio(): UnifiedPortfolio {
  const croPrice = DEMO_PRICES.CRO;
  const croAmount = 500000; // 500,000 CRO supplied
  const croValueUsd = croAmount * croPrice;
  const usdcBorrowed = 21500; // $21,500 USDC borrowed

  const collaterals: CollateralPosition[] = [
    {
      asset: { symbol: 'CRO', address: '0x5C7F8A570d578ED60E9c0fE56278c30F1B1c5A4e', decimals: 18 },
      amount: croAmount,
      valueUsd: croValueUsd,
      liquidationThreshold: 0.75,
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

  const risk = calculateRiskMetrics(collaterals, borrows, DEMO_PRICES);

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
    prices: DEMO_PRICES,
    timestamp: Date.now(),
  };
}

export function Dashboard() {
  const { address, isConnected } = useAccount();
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [mounted, setMounted] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

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

  // Use demo portfolio when in demo mode
  const demoPortfolio = demoMode ? createDemoPortfolio() : null;
  const activePortfolio = demoMode ? demoPortfolio : portfolio;

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
            Explore the simulator with sample data: 500K CRO collateral, $21.5K USDC borrowed
          </p>
        </div>
      </div>
    );
  }

  if (isLoading && !demoMode) {
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

  // Use simulated values if available
  const simulationResult = simulationData?.result || null;

  const displayHF = simulationResult
    ? simulationResult.simulated.healthFactor
    : mainSnapshot.risk.healthFactor;

  const displayLiqPrice = simulationResult
    ? simulationResult.simulated.liquidationPrices['CRO'] || 0
    : mainSnapshot.risk.liquidationPrices['CRO'] || 0;

  const displayBorrow = simulationResult
    ? simulationResult.simulated.totalBorrowUsd
    : mainSnapshot.totals.borrowUsd;

  const displayCollateral = simulationResult
    ? simulationResult.simulated.totalCollateralUsd
    : mainSnapshot.totals.collateralUsd;

  // Compute adjusted collateral positions for display
  const adjustedCollaterals: CollateralPosition[] = mainSnapshot.collaterals.map((col) => {
    const addedAmount = simulationData?.addedCollateral[col.asset.symbol] || 0;
    const priceShockPct = simulationData?.priceShocks[col.asset.symbol] || 0;
    const priceMultiplier = 1 + priceShockPct / 100;
    const currentPrice = activePortfolio.prices[col.asset.symbol] || 0;
    const adjustedPrice = currentPrice * priceMultiplier;
    const newAmount = col.amount + addedAmount;
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
      {/* Demo Mode Banner */}
      {demoMode && (
        <div className="bg-cro-cyan/10 border border-cro-cyan rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-cro-cyan/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-cro-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-cro-cyan font-medium">Demo Mode</p>
              <p className="text-sm text-cro-muted">Using sample data: 500K CRO collateral, $21.5K USDC borrowed</p>
            </div>
          </div>
          <button
            onClick={() => setDemoMode(false)}
            className="px-4 py-2 text-sm text-cro-cyan hover:bg-cro-cyan/10 rounded-lg transition-colors"
          >
            Exit Demo
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <KPICards
        healthFactor={displayHF}
        liquidationPrice={displayLiqPrice}
        currentPrice={activePortfolio.prices['CRO'] || 0}
        totalBorrowUsd={displayBorrow}
        totalCollateralUsd={displayCollateral}
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

      {/* Simulator + Target Helper */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScenarioSimulator
          snapshot={mainSnapshot}
          prices={activePortfolio.prices}
          onSimulationResult={setSimulationData}
        />
        <TargetHFHelper
          snapshot={mainSnapshot}
          prices={activePortfolio.prices}
          currentHF={mainSnapshot.risk.healthFactor}
        />
      </div>
    </div>
  );
}
