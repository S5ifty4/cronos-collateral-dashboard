'use client';

import { calculateBufferPercentage } from '@cronos-dash/shared';

interface KPICardsProps {
  healthFactor: number | null;
  liquidationPrice: number;
  currentPrice: number;
  totalBorrowUsd: number;
  totalCollateralUsd: number;
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

function getHFColor(hf: number | null | undefined): string {
  if (hf === null || hf === undefined || !isFinite(hf)) return 'text-cro-success';
  if (hf >= 2) return 'text-cro-success';
  if (hf >= 1.5) return 'text-cro-warning';
  if (hf >= 1.1) return 'text-orange-500';
  return 'text-cro-danger';
}

function getHFBorderColor(hf: number | null | undefined): string {
  if (hf === null || hf === undefined || !isFinite(hf)) return 'border-cro-success/50';
  if (hf >= 2) return 'border-cro-success/50';
  if (hf >= 1.5) return 'border-cro-warning/50';
  if (hf >= 1.1) return 'border-orange-500/50';
  return 'border-cro-danger/50';
}

export function KPICards({
  healthFactor,
  liquidationPrice,
  currentPrice,
  totalBorrowUsd,
  totalCollateralUsd,
}: KPICardsProps) {
  const buffer = calculateBufferPercentage(healthFactor ?? Infinity);
  const priceBuffer =
    currentPrice > 0
      ? ((currentPrice - liquidationPrice) / currentPrice) * 100
      : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
      {/* Health Factor */}
      <div
        className={`p-3 sm:p-4 rounded-xl border-2 bg-cro-card ${getHFBorderColor(healthFactor)}`}
      >
        <div className="text-xs sm:text-sm font-medium text-cro-muted mb-1">
          Health Factor
        </div>
        <div className={`text-xl sm:text-3xl font-bold ${getHFColor(healthFactor)}`}>
          {formatNumber(healthFactor)}
        </div>
        <div className="text-xs text-cro-muted mt-1 hidden sm:block">
          Buffer: {formatNumber(buffer, 1)}%
        </div>
      </div>

      {/* CRO Liquidation Price */}
      <div className="p-3 sm:p-4 rounded-xl border border-cro-border bg-cro-card">
        <div className="text-xs sm:text-sm font-medium text-cro-muted mb-1">
          CRO Liq. Price
        </div>
        <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-cro-cyan whitespace-nowrap">
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
        <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-cro-text">
          {formatUsd(totalBorrowUsd)}
        </div>
      </div>

      {/* Total Collateral */}
      <div className="p-3 sm:p-4 rounded-xl border border-cro-border bg-cro-card">
        <div className="text-xs sm:text-sm font-medium text-cro-muted mb-1">
          Total Collateral
        </div>
        <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-cro-text">
          {formatUsd(totalCollateralUsd)}
        </div>
      </div>
    </div>
  );
}
