import type {
  UnifiedPortfolio,
  SimulateRequest,
  ScenarioResult,
  TargetHFInput,
  TargetHFResult,
  LiquidationHistoryResponse,
  FulcromPositionsResponse,
  FulcromTradeHistoryResponse,
  LiquidationHeatmapResponse,
} from '@cronos-dash/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchPrices(): Promise<Record<string, number>> {
  const res = await fetch(`${API_BASE}/api/prices`);
  if (!res.ok) {
    throw new Error('Failed to fetch prices');
  }
  const data = await res.json();
  return data.prices;
}

export async function fetchPortfolio(address: string): Promise<UnifiedPortfolio> {
  const res = await fetch(`${API_BASE}/api/portfolio?address=${encodeURIComponent(address)}`);
  if (!res.ok) {
    throw new Error('Failed to fetch portfolio');
  }
  return res.json();
}

export async function simulateScenario(
  request: SimulateRequest
): Promise<ScenarioResult> {
  const res = await fetch(`${API_BASE}/api/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    throw new Error('Simulation failed');
  }
  return res.json();
}

export async function calculateTargetHF(
  input: TargetHFInput
): Promise<TargetHFResult> {
  const res = await fetch(`${API_BASE}/api/target-hf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error('Target HF calculation failed');
  }
  return res.json();
}

export async function fetchLiquidationHistory(address: string): Promise<LiquidationHistoryResponse> {
  const res = await fetch(`${API_BASE}/api/liquidation-history?address=${encodeURIComponent(address)}`);
  if (!res.ok) {
    throw new Error('Failed to fetch liquidation history');
  }
  return res.json();
}

export async function fetchFulcromPositions(address: string): Promise<FulcromPositionsResponse> {
  const res = await fetch(`${API_BASE}/api/fulcrom-positions?address=${encodeURIComponent(address)}`);
  if (!res.ok) {
    throw new Error('Failed to fetch Fulcrom positions');
  }
  return res.json();
}

export async function fetchMoonlanderPositions(address: string): Promise<FulcromPositionsResponse> {
  const res = await fetch(`${API_BASE}/api/moonlander-positions?address=${encodeURIComponent(address)}`);
  if (!res.ok) {
    throw new Error('Failed to fetch Moonlander positions');
  }
  return res.json();
}

export async function fetchFulcromTradeHistory(address: string): Promise<FulcromTradeHistoryResponse> {
  const res = await fetch(`${API_BASE}/api/fulcrom-trade-history?address=${encodeURIComponent(address)}`);
  if (!res.ok) {
    throw new Error('Failed to fetch Fulcrom trade history');
  }
  return res.json();
}

export async function fetchLiquidationHeatmap(params: { platform?: string; side?: string } = {}): Promise<LiquidationHeatmapResponse> {
  const query = new URLSearchParams({
    asset: 'CRO',
    platform: params.platform || 'all',
    side: params.side || 'downside',
  });
  const res = await fetch(`${API_BASE}/api/liquidation-heatmap?${query.toString()}`);
  if (!res.ok) {
    throw new Error('Failed to fetch liquidation heatmap');
  }
  return res.json();
}
