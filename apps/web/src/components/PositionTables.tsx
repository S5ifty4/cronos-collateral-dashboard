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

function formatTokenAmount(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return formatNumber(n, 2);
  if (abs >= 1) return formatNumber(n, 4);
  return formatNumber(n, 6);
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

function TokenLogo({ symbol, variant = 'collateral' }: { symbol: string; variant?: 'collateral' | 'borrow' }) {
  if (TOKEN_LOGOS[symbol]) {
    return (
      <img
        src={TOKEN_LOGOS[symbol]}
        alt={symbol}
        className="h-8 w-8 sm:h-7 sm:w-7 rounded-full flex-shrink-0"
      />
    );
  }

  const gradient = variant === 'borrow'
    ? 'from-cro-warning to-orange-600'
    : 'from-cro-cyan to-cro-navy';

  return (
    <div className={`h-8 w-8 sm:h-7 sm:w-7 rounded-full bg-gradient-to-br ${gradient} flex flex-shrink-0 items-center justify-center text-white text-xs font-bold`}>
      {symbol.slice(0, 2)}
    </div>
  );
}

export function PositionTables({
  collaterals,
  borrows,
  originalCollaterals,
  originalBorrows,
  liquidationPrices,
}: PositionTablesProps) {
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

        {/* Desktop/tablet table. Hidden on phones to avoid predictable numeric column collisions. */}
        <div className="hidden sm:block overflow-hidden">
          <table className="w-full table-fixed text-xs xl:text-sm">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[25%]" />
              <col className="w-[21%]" />
              <col className="w-[18%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr className="text-left text-xs text-cro-muted uppercase tracking-wider whitespace-nowrap">
                <th className="px-2 sm:px-3 py-3">Asset</th>
                <th className="px-2 sm:px-3 py-3 text-right">Amount</th>
                <th className="px-2 sm:px-3 py-3 text-right">Value</th>
                <th className="px-2 sm:px-3 py-3 text-right">Liq.&nbsp;Thresh.</th>
                <th className="px-2 sm:px-3 py-3 text-right">Liq.&nbsp;Price</th>
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
                    <td className="px-2 sm:px-3 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <TokenLogo symbol={col.asset.symbol} />
                        <span className="font-medium text-cro-text truncate">{col.asset.symbol}</span>
                        {hasChange && (
                          <span className={`hidden sm:inline text-[10px] px-1.5 py-0.5 rounded ${isIncrease ? 'bg-cro-success/20 text-cro-success' : 'bg-cro-danger/20 text-cro-danger'}`}>
                            Simulated
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 sm:px-3 py-3 text-right font-mono tabular-nums text-cro-text whitespace-nowrap">
                      <div>{formatTokenAmount(col.amount)}</div>
                      {hasChange && (
                        <div className={`text-xs ${isIncrease ? 'text-cro-success' : 'text-cro-danger'}`}>
                          {isIncrease ? '+' : ''}{formatTokenAmount(amountDelta)}
                        </div>
                      )}
                    </td>
                    <td className="px-2 sm:px-3 py-3 text-right font-mono tabular-nums text-cro-text whitespace-nowrap">
                      <div>{formatUsd(col.valueUsd)}</div>
                      {hasChange && (
                        <div className={`text-xs ${isIncrease ? 'text-cro-success' : 'text-cro-danger'}`}>
                          {isIncrease ? '+' : ''}{formatUsd(valueDelta)}
                        </div>
                      )}
                    </td>
                    <td className="px-2 sm:px-3 py-3 text-right font-mono tabular-nums text-cro-muted whitespace-nowrap">
                      {(col.liquidationThreshold * 100).toFixed(0)}%
                    </td>
                    <td className="px-2 sm:px-3 py-3 text-right font-mono tabular-nums text-cro-cyan whitespace-nowrap">
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

        {/* Phone card layout: avoids squeezing amount/value/liquidation columns into one row. */}
        <div className="divide-y divide-cro-border sm:hidden">
          {collaterals.map((col) => {
            const original = getOriginalCollateral(col.asset.symbol);
            const amountDelta = original ? col.amount - original.amount : 0;
            const valueDelta = original ? col.valueUsd - original.valueUsd : 0;
            const hasChange = Math.abs(amountDelta) > 0.0001;
            const isIncrease = amountDelta > 0;

            return (
              <div
                key={col.asset.symbol}
                className={`p-4 ${hasChange ? (isIncrease ? 'bg-cro-success/5' : 'bg-cro-danger/5') : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <TokenLogo symbol={col.asset.symbol} />
                    <div className="min-w-0">
                      <div className="font-semibold text-cro-text truncate">{col.asset.symbol}</div>
                      <div className="text-xs text-cro-muted">Collateral asset</div>
                    </div>
                  </div>
                  <div className="min-w-0 text-right font-mono tabular-nums text-cro-text">
                    <div className="break-words">{formatTokenAmount(col.amount)}</div>
                    {hasChange && (
                      <div className={`text-xs ${isIncrease ? 'text-cro-success' : 'text-cro-danger'}`}>
                        {isIncrease ? '+' : ''}{formatTokenAmount(amountDelta)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-lg border border-cro-border bg-cro-dark/50 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-cro-muted">Value</div>
                    <div className="mt-1 font-mono tabular-nums text-cro-text">{formatUsd(col.valueUsd)}</div>
                    {hasChange && (
                      <div className={`text-xs ${isIncrease ? 'text-cro-success' : 'text-cro-danger'}`}>
                        {isIncrease ? '+' : ''}{formatUsd(valueDelta)}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-cro-border bg-cro-dark/50 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-cro-muted">Liq. Thresh.</div>
                      <div className="mt-1 font-mono tabular-nums text-cro-text">
                        {(col.liquidationThreshold * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="rounded-lg border border-cro-cyan/30 bg-cro-cyan/5 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-cro-muted">Liq. Price</div>
                      <div className="mt-1 font-mono tabular-nums text-cro-cyan">
                        {liquidationPrices[col.asset.symbol] !== undefined && liquidationPrices[col.asset.symbol] !== null
                          ? `$${formatNumber(liquidationPrices[col.asset.symbol], 3)}`
                          : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {collaterals.length === 0 && (
            <div className="px-4 py-8 text-center text-cro-muted">
              No collateral positions
            </div>
          )}
        </div>
      </div>

      {/* Borrow Table */}
      <div className="bg-cro-card rounded-xl border border-cro-border overflow-hidden">
        <div className="px-4 py-3 bg-cro-card-light border-b border-cro-border">
          <h3 className="font-semibold text-cro-text">Borrowed</h3>
        </div>

        <div className="hidden sm:block overflow-hidden">
          <table className="w-full table-fixed text-xs xl:text-sm">
            <colgroup>
              <col className="w-[35%]" />
              <col className="w-[33%]" />
              <col className="w-[32%]" />
            </colgroup>
            <thead>
              <tr className="text-left text-xs text-cro-muted uppercase tracking-wider">
                <th className="px-2 sm:px-3 py-3">Asset</th>
                <th className="px-2 sm:px-3 py-3 text-right">Amount</th>
                <th className="px-2 sm:px-3 py-3 text-right">Value</th>
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
                    <td className="px-2 sm:px-3 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <TokenLogo symbol={bor.asset.symbol} variant="borrow" />
                        <span className="font-medium text-cro-text truncate">{bor.asset.symbol}</span>
                        {hasChange && (
                          <span className={`hidden sm:inline text-[10px] px-1.5 py-0.5 rounded ${isIncrease ? 'bg-cro-warning/20 text-cro-warning' : 'bg-cro-success/20 text-cro-success'}`}>
                            Simulated
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 sm:px-3 py-3 text-right font-mono tabular-nums text-cro-text whitespace-nowrap">
                      <div>{formatTokenAmount(bor.amount)}</div>
                      {hasChange && (
                        <div className={`text-xs ${isIncrease ? 'text-cro-warning' : 'text-cro-success'}`}>
                          {isIncrease ? '+' : ''}{formatTokenAmount(amountDelta)}
                        </div>
                      )}
                    </td>
                    <td className="px-2 sm:px-3 py-3 text-right font-mono tabular-nums text-cro-text whitespace-nowrap">
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

        <div className="divide-y divide-cro-border sm:hidden">
          {borrows.map((bor) => {
            const original = getOriginalBorrow(bor.asset.symbol);
            const amountDelta = original ? bor.amount - original.amount : 0;
            const valueDelta = original ? bor.valueUsd - original.valueUsd : 0;
            const hasChange = Math.abs(amountDelta) > 0.0001;
            const isIncrease = amountDelta > 0;

            return (
              <div
                key={bor.asset.symbol}
                className={`p-4 ${hasChange ? (isIncrease ? 'bg-cro-warning/5' : 'bg-cro-success/5') : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <TokenLogo symbol={bor.asset.symbol} variant="borrow" />
                    <div className="min-w-0">
                      <div className="font-semibold text-cro-text truncate">{bor.asset.symbol}</div>
                      <div className="text-xs text-cro-muted">Borrowed asset</div>
                    </div>
                  </div>
                  <div className="min-w-0 text-right font-mono tabular-nums text-cro-text">
                    <div className="break-words">{formatTokenAmount(bor.amount)}</div>
                    {hasChange && (
                      <div className={`text-xs ${isIncrease ? 'text-cro-warning' : 'text-cro-success'}`}>
                        {isIncrease ? '+' : ''}{formatTokenAmount(amountDelta)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-cro-border bg-cro-dark/50 p-3 text-sm">
                  <div className="text-[10px] uppercase tracking-wider text-cro-muted">Value</div>
                  <div className="mt-1 font-mono tabular-nums text-cro-text">{formatUsd(bor.valueUsd)}</div>
                  {hasChange && (
                    <div className={`text-xs ${isIncrease ? 'text-cro-warning' : 'text-cro-success'}`}>
                      {isIncrease ? '+' : ''}{formatUsd(valueDelta)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {borrows.length === 0 && (
            <div className="px-4 py-8 text-center text-cro-muted">
              No borrow positions
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
