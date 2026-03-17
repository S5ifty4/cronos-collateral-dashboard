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
 * Calculate Borrow Limit Used % (inverse of Health Factor)
 * This matches Tectonic's display - higher % = more risk
 * At 100% you get liquidated
 */
function calculateBorrowLimitUsed(healthFactor: number | null): number {
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

/**
 * Color based on Borrow Limit Used % (higher = more danger)
 * <50% = safe (green), 50-67% = caution (yellow), 67-90% = warning (orange), >90% = danger (red)
 */
function getBorrowLimitColor(borrowLimitUsed: number): string {
  if (borrowLimitUsed < 50) return 'text-cro-success';
  if (borrowLimitUsed < 67) return 'text-cro-warning';
  if (borrowLimitUsed < 90) return 'text-orange-500';
  return 'text-cro-danger';
}

function getBorrowLimitBorderColor(borrowLimitUsed: number): string {
  if (borrowLimitUsed < 50) return 'border-cro-success/50';
  if (borrowLimitUsed < 67) return 'border-cro-warning/50';
  if (borrowLimitUsed < 90) return 'border-orange-500/50';
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
  const borrowLimitUsed = calculateBorrowLimitUsed(healthFactor);
  const ltv = calculateLTV(totalBorrowUsd, totalCollateralUsd);
  const priceBuffer =
    currentPrice > 0
      ? ((currentPrice - liquidationPrice) / currentPrice) * 100
      : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
      {/* Health Factor */}
      <div
        className={`p-3 sm:p-4 rounded-xl border-2 bg-cro-card ${getBorrowLimitBorderColor(borrowLimitUsed)}`}
      >
        <div className="text-xs sm:text-sm font-medium text-cro-muted mb-1">
          Health Factor
        </div>
        <div className={`text-xl sm:text-3xl font-bold font-mono ${getBorrowLimitColor(borrowLimitUsed)}`}>
          {formatNumber(borrowLimitUsed, 1)}%
        </div>
        <div className="text-xs text-cro-muted mt-1 hidden sm:block">
          LTV: {formatNumber(ltv, 2)}%
        </div>
      </div>

      {/* Liquidation Price */}
      <div className="p-3 sm:p-4 rounded-xl border border-cro-border bg-cro-card">
        <div className="text-xs sm:text-sm font-medium text-cro-muted mb-1">
          {collateralSymbol} Liq. Price
        </div>
        <div className="text-lg sm:text-2xl lg:text-3xl font-bold font-mono text-cro-cyan whitespace-nowrap">
          ${formatNumber(liquidationPrice, 3)}
        </div>
        <div className="text-xs text-cro-muted mt-1 hidden sm:block">
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
