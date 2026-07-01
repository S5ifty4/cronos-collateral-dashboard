'use client';

interface KPICardsProps {
  healthFactor: number | null;
  liquidationPrice: number;
  currentPrice: number;
  totalBorrowUsd: number;
  totalCollateralUsd: number;
  collateralSymbol?: string;
}

/**
 * Calculate Tectonic-style Health Factor / Lava Bar %.
 * Higher = more risk; 100% means liquidatable.
 */
function calculateLavaBar(healthFactor: number | null): number {
  if (healthFactor === null || !isFinite(healthFactor) || healthFactor <= 0) return 0;
  return Math.min(100, (1 / healthFactor) * 100);
}

/**
 * Calculate LTV (Loan-to-Value) percentage
 * LTV = Total Borrowed / Total Collateral * 100
 */
function calculateLTV(totalBorrowUsd: number, totalCollateralUsd: number): number {
  if (totalCollateralUsd <= 0) return 0;
  return (totalBorrowUsd / totalCollateralUsd) * 100;
}

function formatNumber(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined || !isFinite(n)) return '∞';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatUsd(n: number): string {
  return `$${formatNumber(n)}`;
}

function getRiskStatus(lavaBar: number): string {
  if (lavaBar < 50) return 'Healthy';
  if (lavaBar < 75) return 'Moderate';
  if (lavaBar < 90) return 'High Risk';
  if (lavaBar < 100) return 'Near Limit';
  return 'Liquidatable';
}

function getLavaBarColor(lavaBar: number): string {
  if (lavaBar < 50) return 'text-cro-success';
  if (lavaBar < 75) return 'text-cro-warning';
  if (lavaBar < 90) return 'text-orange-500';
  return 'text-cro-danger';
}

function getLavaBarBorderColor(lavaBar: number): string {
  if (lavaBar < 50) return 'border-cro-success/50';
  if (lavaBar < 75) return 'border-cro-warning/50';
  if (lavaBar < 90) return 'border-orange-500/50';
  return 'border-cro-danger/50';
}

export function KPICards({
  healthFactor,
  liquidationPrice,
  currentPrice,
  totalBorrowUsd,
  totalCollateralUsd,
  collateralSymbol = 'CRO',
}: KPICardsProps) {
  const lavaBar = calculateLavaBar(healthFactor);
  const ltv = calculateLTV(totalBorrowUsd, totalCollateralUsd);
  const priceBuffer =
    currentPrice > 0
      ? ((currentPrice - liquidationPrice) / currentPrice) * 100
      : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
      {/* Health Factor / Lava Bar */}
      <div
        className={`p-3 sm:p-4 rounded-xl border-2 bg-cro-card ${getLavaBarBorderColor(lavaBar)}`}
      >
        <div className="flex items-center justify-between gap-2 text-xs sm:text-sm font-medium text-cro-muted mb-1">
          <span>Health Factor</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getLavaBarColor(lavaBar)} bg-cro-dark/60`}>
            {getRiskStatus(lavaBar)}
          </span>
        </div>
        <div className={`text-xl sm:text-3xl font-bold font-mono ${getLavaBarColor(lavaBar)}`}>
          {formatNumber(lavaBar, 1)}%
        </div>
        <div className="text-xs text-cro-muted font-mono mt-1 hidden sm:block">
          Lava Bar · Current LTV {formatNumber(ltv, 2)}%
        </div>
      </div>

      {/* Liquidation Price */}
      <div className="p-3 sm:p-4 rounded-xl border border-cro-border bg-cro-card">
        <div className="text-xs sm:text-sm font-medium text-cro-muted mb-1">
          {collateralSymbol} Liq. Price
        </div>
        <div className="text-lg sm:text-2xl lg:text-3xl font-bold font-mono text-cro-cyan whitespace-nowrap">
          ${formatNumber(liquidationPrice, 5)}
        </div>
        <div className="text-xs text-cro-muted font-mono mt-1 hidden sm:block">
          {priceBuffer > 0 ? `${formatNumber(priceBuffer, 1)}% below current` : '—'}
        </div>
      </div>

      {/* Total Borrow */}
      <div className="p-3 sm:p-4 rounded-xl border border-cro-border bg-cro-card">
        <div className="text-xs sm:text-sm font-medium text-cro-muted mb-1">
          Total Borrowed
        </div>
        <div className="text-lg sm:text-2xl lg:text-3xl font-bold font-mono text-cro-text">
          {formatUsd(totalBorrowUsd)}
        </div>
      </div>

      {/* Total Collateral */}
      <div className="p-3 sm:p-4 rounded-xl border border-cro-border bg-cro-card">
        <div className="text-xs sm:text-sm font-medium text-cro-muted mb-1">
          Total Collateral
        </div>
        <div className="text-lg sm:text-2xl lg:text-3xl font-bold font-mono text-cro-text">
          {formatUsd(totalCollateralUsd)}
        </div>
      </div>
    </div>
  );
}
