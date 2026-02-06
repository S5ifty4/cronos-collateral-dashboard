'use client';

import { useState, useEffect } from 'react';
import type { ProtocolSnapshot } from '@cronos-dash/shared';
import { calculateTargetHF } from '@cronos-dash/shared';

interface TargetHFHelperProps {
  snapshot: ProtocolSnapshot;
  prices: Record<string, number>;
  currentHF: number;
}

function formatNumber(n: number, decimals = 2): string {
  if (!isFinite(n)) return '∞';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function TargetHFHelper({
  snapshot,
  prices,
  currentHF,
}: TargetHFHelperProps) {
  const [targetHF, setTargetHF] = useState(1.5);
  const [result, setResult] = useState<{
    repayAmount?: { symbol: string; amount: number };
    addCollateralAmount?: { symbol: string; amount: number };
  } | null>(null);

  useEffect(() => {
    if (targetHF <= currentHF) {
      setResult(null);
      return;
    }
    const calculated = calculateTargetHF({ targetHF, snapshot, prices });
    setResult(calculated);
  }, [targetHF, snapshot, prices, currentHF]);

  const presets = [1.3, 1.5, 2.0, 3.0];

  return (
    <div className="bg-cro-card rounded-xl border border-cro-border p-4">
      <h3 className="font-semibold text-cro-text mb-4">Target Health Factor</h3>

      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-cro-text">
            Target HF
          </label>
          <span className="text-sm font-mono text-cro-cyan font-bold">
            {formatNumber(targetHF)}
          </span>
        </div>
        <input
          type="range"
          min="1.1"
          max="5"
          step="0.1"
          value={targetHF}
          onChange={(e) => setTargetHF(Number(e.target.value))}
          className="w-full h-2 bg-cro-border rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-center gap-2 mt-2">
          {presets.map((preset) => (
            <button
              key={preset}
              onClick={() => setTargetHF(preset)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                targetHF === preset
                  ? 'bg-cro-cyan text-cro-bg border-cro-cyan'
                  : 'bg-cro-card text-cro-muted border-cro-border hover:border-cro-cyan hover:text-cro-cyan'
              }`}
            >
              {preset}x
            </button>
          ))}
        </div>
      </div>

      {targetHF <= currentHF ? (
        <div className="p-3 bg-cro-success/10 border border-cro-success/30 rounded-lg text-sm text-cro-success">
          Your current HF ({formatNumber(currentHF)}) is already at or above
          target.
        </div>
      ) : result ? (
        <div className="space-y-3">
          {result.repayAmount && result.repayAmount.amount > 0 && (
            <div className="p-3 bg-cro-cyan/10 border border-cro-cyan/30 rounded-lg">
              <div className="text-xs text-cro-cyan font-medium mb-1">
                Option 1: Repay Debt
              </div>
              <div className="text-lg font-bold text-cro-text">
                Repay ${formatNumber(result.repayAmount.amount)}{' '}
                {result.repayAmount.symbol}
              </div>
            </div>
          )}
          {result.addCollateralAmount && result.addCollateralAmount.amount > 0 && (
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <div className="text-xs text-purple-400 font-medium mb-1">
                Option 2: Add Collateral
              </div>
              <div className="text-lg font-bold text-cro-text">
                Add {formatNumber(result.addCollateralAmount.amount, 0)}{' '}
                {result.addCollateralAmount.symbol}
              </div>
              <div className="text-xs text-purple-400">
                ≈ $
                {formatNumber(
                  result.addCollateralAmount.amount *
                    (prices[result.addCollateralAmount.symbol] || 0)
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
