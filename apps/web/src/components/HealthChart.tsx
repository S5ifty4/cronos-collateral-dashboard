'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { HealthSnapshot } from '@/lib/health-history';

type Range = '7d' | '30d' | '90d' | 'all';

interface Props {
  snapshots: HealthSnapshot[];
  currentHF: number;
}

function lineColor(hf: number): string {
  if (hf >= 1.5) return '#22d3ee';   // cyan / green-ish
  if (hf >= 1.2) return '#facc15';   // yellow
  return '#ef4444';                   // red
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const RANGE_MS: Record<Range, number> = {
  '7d': 7 * 24 * 3600 * 1000,
  '30d': 30 * 24 * 3600 * 1000,
  '90d': 90 * 24 * 3600 * 1000,
  'all': Infinity,
};

const RANGE_LABELS: { key: Range; label: string }[] = [
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: 'all', label: 'All' },
];

export function HealthChart({ snapshots, currentHF }: Props) {
  const [range, setRange] = useState<Range>('30d');

  const filtered = useMemo(() => {
    const cutoff = range === 'all' ? 0 : Date.now() - RANGE_MS[range];
    // Only show 'all' unified snapshots to avoid duplicate entries
    return snapshots
      .filter((s) => s.protocol === 'all' && s.timestamp >= cutoff)
      .map((s) => ({
        ts: s.timestamp,
        hf: Math.min(s.healthFactor === Infinity ? 5 : s.healthFactor, 5),
        date: formatDate(s.timestamp),
      }));
  }, [snapshots, range]);

  if (filtered.length < 2) {
    return (
      <div className="bg-cro-card border border-cro-border rounded-xl p-6 text-center">
        <p className="text-cro-muted text-sm">
          Health factor history will appear here after a few visits
        </p>
      </div>
    );
  }

  const color = lineColor(currentHF);

  return (
    <div className="bg-cro-card border border-cro-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-cro-text">Health Factor History</h3>
        <div className="flex gap-1">
          {RANGE_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                range === key
                  ? 'bg-cro-cyan text-cro-dark font-semibold'
                  : 'text-cro-muted hover:text-cro-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={filtered} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 5]}
            tickFormatter={(v: number) => (v === 5 ? '5+' : v.toFixed(1))}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: '#0f1923',
              border: '1px solid #1e293b',
              borderRadius: 8,
              color: '#e2e8f0',
              fontSize: 12,
            }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value: number | undefined) => [
              value === undefined ? 'N/A' : value === 5 ? '5+' : value.toFixed(3),
              'Health Factor',
            ]}
          />
          {/* Liquidation line at HF = 1.0 */}
          <ReferenceLine
            y={1}
            stroke="#ef4444"
            strokeDasharray="4 4"
            label={{ value: 'Liquidation', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }}
          />
          <Line
            type="monotone"
            dataKey="hf"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
