'use client';

import { useState, useEffect } from 'react';
import type { ProtocolSnapshot } from '@cronos-dash/shared';
import { calculateTargetHF } from '@cronos-dash/shared';
import { InfoTooltip } from './InfoTooltip';

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

// Convert Borrow Limit Used % to Health Factor
function percentToHF(percent: number): number {
  if (percent <= 0) return Infinity;
  return 100 / percent;
}

// Convert Health Factor to Borrow Limit Used %
function hfToPercent(hf: number): number {
  if (!isFinite(hf) || hf <= 0) return 100;
  return Math.min(100, (1 / hf) * 100);
}

export function TargetHFHelper({
  snapshot,
  prices,
  currentHF,
}: TargetHFHelperProps) {
  // Store as target borrow limit % (lower = safer)
  const [targetPercent, setTargetPercent] = useState(50); // 50% = HF 2.0
  const [result, setResult] = useState<{
    repayAmount?: { symbol: string; amount: number };
    addCollateralAmount?: { symbol: string; amount: number };
  } | null>(null);

  const currentPercent = hfToPercent(currentHF);
  const targetHF = percentToHF(targetPercent);

  useEffect(() => {
    // Target must be lower (safer) than current to show suggestions
    if (targetPercent >= currentPercent) {
      setResult(null);
      return;
    }
    const calculated = calculateTargetHF({ targetHF, snapshot, prices });
    setResult(calculated);
  }, [targetPercent, currentPercent, targetHF, snapshot, prices]);

  // Preset targets as borrow limit % (lower = safer)
  const presets = [
    { label: '25%', value: 25 },   // HF 4.0 - safest
    { label: '33%', value: 33 },   // HF 3.0
    { label: '50%', value: 50 },   // HF 2.0
    { label: '75%', value: 75 },   // HF 1.33 - riskiest
  ];

  return (
    <div className="bg-cro-card rounded-xl border border-cro-border p-4">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="font-semibold text-cro-text">Target HF</h3>
        <InfoTooltip label="About target health factor">
          Choose a safer borrow-limit-used percentage and estimate either how much debt to repay or how much collateral to add. Lower percentages map to higher health factors.
        </InfoTooltip>
      </div>

      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-cro-text">
            Target HF
          </label>
          <span className="text-sm font-mono text-cro-cyan font-bold">
            {formatNumber(targetPercent, 0)}%
          </span>
        </div>
        <input
          type="range"
          min="10"
          max="90"
          step="1"
          value={targetPercent}
          onChange={(e) => setTargetPercent(Number(e.target.value))}
          className="w-full h-2 bg-cro-border rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-center gap-2 mt-2">
          {presets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => setTargetPercent(preset.value)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                targetPercent === preset.value
                  ? 'bg-cro-cyan text-cro-bg border-cro-cyan'
                  : 'bg-cro-card text-cro-muted border-cro-border hover:border-cro-cyan hover:text-cro-cyan'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {targetPercent >= currentPercent ? (
        <div className="p-3 bg-cro-success/10 border border-cro-success/30 rounded-lg text-sm text-cro-success">
          Your current borrow-limit used (<span className="font-mono">{formatNumber(currentPercent, 1)}%</span>) is already at or below target.
        </div>
      ) : result ? (
        <div className="space-y-3">
          {result.repayAmount && result.repayAmount.amount > 0 && (
            <div className="p-3 bg-cro-cyan/10 border border-cro-cyan/30 rounded-lg">
              <div className="text-xs text-cro-cyan font-medium mb-1">
                Option 1: Repay Debt
              </div>
              <div className="text-lg font-bold font-mono text-cro-text">
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
              <div className="text-lg font-bold font-mono text-cro-text">
                Add {formatNumber(result.addCollateralAmount.amount, 0)}{' '}
                {result.addCollateralAmount.symbol}
              </div>
              <div className="text-xs text-purple-400 font-mono">
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
