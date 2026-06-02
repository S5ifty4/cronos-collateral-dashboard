'use client';

import type { CollateralPosition, BorrowPosition } from '@cronos-dash/shared';

interface PositionTablesProps {
  collaterals: CollateralPosition[];
  borrows: BorrowPosition[];
  originalCollaterals?: CollateralPosition[];
  originalBorrows?: BorrowPosition[];
  liquidationPrices: Record<string, number>;
  prices: Record<string, number>;
}

function formatNumber(n: number, decimals = 2): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatUsd(n: number): string {
  return `$${formatNumber(n)}`;
}

// Token logo URLs
// Logos bundled locally — avoids external CDN blocking/rate-limiting
const TOKEN_LOGOS: Record<string, string> = {
  // Native + major
  CRO:    '/tokens/CRO.png',
  ETH:    '/tokens/ETH.png',
  WBTC:   '/tokens/WBTC.png',
  // Stablecoins
  USDC:   '/tokens/USDC.png',
  USDT:   '/tokens/USDT.png',
  DAI:    '/tokens/DAI.png',
  TUSD:   '/tokens/TUSD.png',
  USC:    '/tokens/USC.png',
  // Alt crypto
  ATOM:   '/tokens/ATOM.png',
  ADA:    '/tokens/ADA.png',
  XRP:    '/tokens/XRP.png',
  LTC:    '/tokens/LTC.png',
  // Cronos ecosystem
  TONIC:  '/tokens/TONIC.png',
  VVS:    '/tokens/VVS.png',
  LCRO:   '/tokens/LCRO.png',
  // CDC wrapped
  CDCBTC: '/tokens/CDCBTC.png',
  CDCETH: '/tokens/CDCETH.png',
};

export function PositionTables({
  collaterals,
  borrows,
  originalCollaterals,
  originalBorrows,
  liquidationPrices,
  prices,
}: PositionTablesProps) {
  // Check if we're showing simulated values
  const isSimulated = !!originalCollaterals;

  // Helper to get original collateral for comparison
  const getOriginalCollateral = (symbol: string) =>
    originalCollaterals?.find((c) => c.asset.symbol === symbol);

  // Helper to get original borrow for comparison
  const getOriginalBorrow = (symbol: string) =>
    originalBorrows?.find((b) => b.asset.symbol === symbol);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Collateral Table */}
      <div className="bg-cro-card rounded-xl border border-cro-border overflow-hidden">
        <div className="px-4 py-3 bg-cro-card-light border-b border-cro-border">
          <h3 className="font-semibold text-cro-text">Collateral</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-cro-muted uppercase tracking-wider whitespace-nowrap">
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3 text-right">LT</th>
                <th className="px-4 py-3 text-right">Liq.&nbsp;Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cro-border">
              {collaterals.map((col) => {
                const original = getOriginalCollateral(col.asset.symbol);
                const amountDelta = original ? col.amount - original.amount : 0;
                const valueDelta = original ? col.valueUsd - original.valueUsd : 0;
                const hasChange = Math.abs(amountDelta) > 0.0001;
                const isIncrease = amountDelta > 0;

                return (
                  <tr key={col.asset.symbol} className={`hover:bg-cro-card-light transition-colors ${hasChange ? (isIncrease ? 'bg-cro-success/5' : 'bg-cro-danger/5') : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {TOKEN_LOGOS[col.asset.symbol] ? (
                          <img
                            src={TOKEN_LOGOS[col.asset.symbol]}
                            alt={col.asset.symbol}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cro-cyan to-cro-navy flex items-center justify-center text-white text-xs font-bold">
                            {col.asset.symbol.slice(0, 2)}
                          </div>
                        )}
                        <span className="font-medium text-cro-text">{col.asset.symbol}</span>
                        {hasChange && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${isIncrease ? 'bg-cro-success/20 text-cro-success' : 'bg-cro-danger/20 text-cro-danger'}`}>
                            Simulated
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-cro-text">
                      <div>{formatNumber(col.amount, 4)}</div>
                      {hasChange && (
                        <div className={`text-xs ${isIncrease ? 'text-cro-success' : 'text-cro-danger'}`}>
                          {isIncrease ? '+' : ''}{formatNumber(amountDelta, 4)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-cro-text">
                      <div>{formatUsd(col.valueUsd)}</div>
                      {hasChange && (
                        <div className={`text-xs ${isIncrease ? 'text-cro-success' : 'text-cro-danger'}`}>
                          {isIncrease ? '+' : ''}{formatUsd(valueDelta)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-cro-muted">
                      {(col.liquidationThreshold * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-cro-cyan whitespace-nowrap">
                      {liquidationPrices[col.asset.symbol] !== undefined && liquidationPrices[col.asset.symbol] !== null
                        ? `$${formatNumber(liquidationPrices[col.asset.symbol], 3)}`
                        : '—'}
                    </td>
                  </tr>
                );
              })}
              {collaterals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-cro-muted">
                    No collateral positions
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Borrow Table */}
      <div className="bg-cro-card rounded-xl border border-cro-border overflow-hidden">
        <div className="px-4 py-3 bg-cro-card-light border-b border-cro-border">
          <h3 className="font-semibold text-cro-text">Borrowed</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-cro-muted uppercase tracking-wider">
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cro-border">
              {borrows.map((bor) => {
                const original = getOriginalBorrow(bor.asset.symbol);
                const amountDelta = original ? bor.amount - original.amount : 0;
                const valueDelta = original ? bor.valueUsd - original.valueUsd : 0;
                const hasChange = Math.abs(amountDelta) > 0.0001;
                const isIncrease = amountDelta > 0;

                return (
                  <tr key={bor.asset.symbol} className={`hover:bg-cro-card-light transition-colors ${hasChange ? (isIncrease ? 'bg-cro-warning/5' : 'bg-cro-success/5') : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {TOKEN_LOGOS[bor.asset.symbol] ? (
                          <img
                            src={TOKEN_LOGOS[bor.asset.symbol]}
                            alt={bor.asset.symbol}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cro-warning to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                            {bor.asset.symbol.slice(0, 2)}
                          </div>
                        )}
                        <span className="font-medium text-cro-text">{bor.asset.symbol}</span>
                        {hasChange && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${isIncrease ? 'bg-cro-warning/20 text-cro-warning' : 'bg-cro-success/20 text-cro-success'}`}>
                            Simulated
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-cro-text">
                      <div>{formatNumber(bor.amount, 4)}</div>
                      {hasChange && (
                        <div className={`text-xs ${isIncrease ? 'text-cro-warning' : 'text-cro-success'}`}>
                          {isIncrease ? '+' : ''}{formatNumber(amountDelta, 4)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-cro-text">
                      <div>{formatUsd(bor.valueUsd)}</div>
                      {hasChange && (
                        <div className={`text-xs ${isIncrease ? 'text-cro-warning' : 'text-cro-success'}`}>
                          {isIncrease ? '+' : ''}{formatUsd(valueDelta)}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {borrows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-cro-muted">
                    No borrow positions
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
