// Asset metadata
export interface AssetMeta {
  symbol: string;
  address: string;
  decimals: number;
}

// Collateral position
export interface CollateralPosition {
  asset: AssetMeta;
  amount: number;
  valueUsd: number;
  liquidationThreshold: number; // e.g., 0.75 for 75%
  enabled: boolean;
}

// Borrow position
export interface BorrowPosition {
  asset: AssetMeta;
  amount: number;
  valueUsd: number;
}

// Risk metrics for a protocol
export interface RiskMetrics {
  healthFactor: number;
  totalCollateralUsd: number;
  totalBorrowUsd: number;
  availableBorrowUsd: number;
  liquidationPrices: Record<string, number>; // symbol -> liquidation price
}

// Protocol snapshot
export interface ProtocolSnapshot {
  protocol: string;
  collaterals: CollateralPosition[];
  borrows: BorrowPosition[];
  totals: {
    collateralUsd: number;
    borrowUsd: number;
    weightedCollateralUsd: number; // sum(collateral * LT)
  };
  risk: RiskMetrics;
}

// Unified portfolio across protocols
export interface UnifiedPortfolio {
  address: string;
  snapshots: ProtocolSnapshot[];
  unified: {
    totalCollateralUsd: number;
    totalBorrowUsd: number;
    totalWeightedCollateralUsd: number;
    healthFactor: number;
  };
  prices: Record<string, number>; // symbol -> current price
  timestamp: number;
}

// Scenario types
export type ScenarioAction =
  | { type: 'priceShock'; symbol: string; pctChange: number }
  | { type: 'repay'; symbol: string; amount: number }
  | { type: 'borrow'; symbol: string; amount: number }
  | { type: 'addCollateral'; symbol: string; amount: number }
  | { type: 'withdrawCollateral'; symbol: string; amount: number };

export interface ScenarioInput {
  actions: ScenarioAction[];
}

export interface ScenarioResult {
  original: RiskMetrics;
  simulated: RiskMetrics;
  delta: {
    healthFactor: number;
    totalCollateralUsd: number;
    totalBorrowUsd: number;
  };
}

export interface RepayWithCollateralInput {
  snapshot: ProtocolSnapshot;
  prices: Record<string, number>;
  borrowSymbol: string;
  collateralSymbol: string;
  repayAmount: number;
  quoteCollateralPerBorrowUnit?: number;
  slippagePct?: number;
}

export interface RepayWithCollateralWorstCase {
  effectiveCollateralPerBorrowUnit: number;
  collateralSoldAmount: number;
  remainingCollateralAmount: number;
  simulation: ScenarioResult;
}

export interface RepayWithCollateralResult {
  quoteCollateralPerBorrowUnit: number;
  effectiveCollateralPerBorrowUnit: number;
  collateralSoldAmount: number;
  remainingCollateralAmount: number;
  simulation: ScenarioResult;
  worstCase: RepayWithCollateralWorstCase;
}

export interface LiquidationScenarioInput {
  snapshot: ProtocolSnapshot;
  prices: Record<string, number>;
  borrowSymbol: string;
  collateralSymbol: string;
  collateralPriceChangePct?: number;
  liquidationPenaltyPct?: number;
  closeFactorPct?: number;
  targetHealthFactor?: number;
}

export type LiquidationScenarioMode = 'minimumToRestore' | 'maxCloseFactor';

export interface LiquidationScenarioOutcome {
  mode: LiquidationScenarioMode;
  label: string;
  debtRepaidUsd: number;
  collateralSeizedAmount: number;
  collateralSeizedUsd: number;
  penaltyCollateralAmount: number;
  penaltyUsd: number;
  remainingCollateralAmount: number;
  healthFactorAfter: number;
  cappedByCloseFactor: boolean;
  mayNeedAdditionalLiquidation: boolean;
  simulation: ScenarioResult;
}

export interface LiquidationScenarioResult {
  atRisk: boolean;
  healthFactorBefore: number;
  collateralPrice: number;
  collateralPriceChangePct: number;
  closeFactorPct: number;
  liquidationPenaltyPct: number;
  maxDebtRepayUsd: number;
  repayToTargetUsd: number;
  minimumToRestore: LiquidationScenarioOutcome;
  maxCloseFactor: LiquidationScenarioOutcome;
  estimatedDebtRepaidUsd: number;
  collateralSeizedAmount: number;
  collateralSeizedUsd: number;
  penaltyCollateralAmount: number;
  penaltyUsd: number;
  remainingCollateralAmount: number;
  healthFactorAfter: number;
  cappedByCloseFactor: boolean;
  mayNeedAdditionalLiquidation: boolean;
  simulation: ScenarioResult;
}

export interface LiquidationHistoryEvent {
  id: string;
  txHash: string;
  blockNumber: number;
  blockTime: number;
  isoTime: string;
  borrower: string;
  liquidator: string;
  tTokenSymbol: string;
  collateralSymbol: string;
  seizedTTokenAmount: number;
  estimatedCollateralAmount?: number;
  debtSymbol: string;
  debtRepaidAmount: number;
  impliedCollateralPriceUsd?: number;
  penaltyUsd?: number;
  penaltyCollateralAmount?: number;
}

export interface LiquidationHistoryResponse {
  address: string;
  events: LiquidationHistoryEvent[];
  count: number;
  source: string;
  note?: string;
}

export interface FulcromPosition {
  platform: string;
  pair: string;
  side: 'Long' | 'Short';
  leverage: number;
  netValueUsd: number;
  pnlUsd: number;
  pnlPct: number;
  sizeUsd: number;
  collateralUsd: number;
  netCollateralUsd: number;
  markPrice: number;
  entryPrice: number;
  liquidationPrice: number;
  openOrders: number;
  indexSymbol: string;
  collateralSymbol: string;
  source: 'live' | 'demo';
  sizeTokenAmount?: number;
  takeProfitPrice?: number;
  takeProfitPnlPct?: number;
  stopLossPrice?: number;
  feesUsd?: number;
  slippagePct?: number;
  orderType?: string;
  note?: string;
}

export interface FulcromPositionsResponse {
  address: string;
  positions: FulcromPosition[];
  count: number;
  source: string;
  timestamp: number;
  note?: string;
}

export interface FulcromTradeHistoryEvent {
  id: string;
  txHash: string;
  blockNumber: number;
  blockTime: number;
  isoTime: string;
  action: 'Requested' | 'Increase' | 'Decrease' | 'Close' | 'Liquidation' | 'Cancelled';
  pair: string;
  side: 'Long' | 'Short';
  sizeDeltaUsd?: number;
  collateralDeltaUsd?: number;
  sizeUsd?: number;
  collateralUsd?: number;
  priceUsd?: number;
  feeUsd?: number;
  realisedPnlUsd?: number;
  indexSymbol: string;
  collateralSymbol: string;
}

export interface FulcromTradeHistoryResponse {
  address: string;
  events: FulcromTradeHistoryEvent[];
  count: number;
  source: string;
  fromBlock: number;
  toBlock: number;
  timestamp: number;
  note?: string;
}

// API request/response types
export interface PortfolioRequest {
  address: string;
}

export interface SimulateRequest {
  snapshot: ProtocolSnapshot;
  scenario: ScenarioInput;
  prices: Record<string, number>;
}

// Target HF helper types
export interface TargetHFInput {
  targetHF: number;
  snapshot: ProtocolSnapshot;
  prices: Record<string, number>;
}

export interface TargetHFResult {
  repayAmount?: { symbol: string; amount: number };
  addCollateralAmount?: { symbol: string; amount: number };
}
