import { createPublicClient, formatUnits, http, parseAbiItem } from 'viem';
import { cronos } from 'viem/chains';
import type {
  LiquidationBucket,
  LiquidationHeatmapResponse,
  LiquidationHeatmapSource,
  LiquidationPlatform,
  LiquidationPositionRisk,
  LiquidationRiskKind,
} from '@cronos-dash/shared';
import { config } from '../config.js';
import { fetchPrices } from '../adapters/index.js';

const TECTONIC_SUBGRAPH_URL = 'https://graph-v2.cronoslabs.com/subgraphs/name/tectonic/tectonic-main';
const FULCROM_TRADES_SUBGRAPH = 'https://graph-v2.cronoslabs.com/subgraphs/name/fulcrom/trades-prod';
const WCRO = '0x5c7f8a570d578ed84e63fdfa7b1ee72deae1ae23';
const MOONLANDER_DIAMOND = '0xE6F6351fb66f3a35313FEEFF9116698665FBEeC9';
const USD_DECIMALS = 30;
const MOONLANDER_PRICE_DECIMALS = 18;
const MOONLANDER_QTY_DECIMALS = 10;
const DEFAULT_DOWNSIDE_SHOCKS = [0, -5, -10, -15, -20, -25, -35, -50, -80];
const DEFAULT_UPSIDE_SHOCKS = [0, 5, 10, 15, 20, 25, 35, 50, 80];
const CACHE_TTL_MS = 5 * 60_000;

type HeatmapSide = 'downside' | 'upside' | 'both';
type HeatmapPlatformFilter = 'all' | LiquidationPlatform;

type CollectorResult = {
  positions: LiquidationPositionRisk[];
  source: LiquidationHeatmapSource;
};

type CacheEntry = {
  key: string;
  timestamp: number;
  response: LiquidationHeatmapResponse;
};

let cache: CacheEntry | null = null;

function now() {
  return Date.now();
}

function zeroPlatformBreakdown(): Record<LiquidationPlatform, { atRiskUsd: number; count: number }> {
  return {
    tectonic: { atRiskUsd: 0, count: 0 },
    fulcrom: { atRiskUsd: 0, count: 0 },
    moonlander: { atRiskUsd: 0, count: 0 },
  };
}

function zeroRiskKindBreakdown(): Record<LiquidationRiskKind, { atRiskUsd: number; count: number }> {
  return {
    'lending-debt': { atRiskUsd: 0, count: 0 },
    'perps-notional': { atRiskUsd: 0, count: 0 },
  };
}

function shockList(side: HeatmapSide): number[] {
  if (side === 'upside') return DEFAULT_UPSIDE_SHOCKS;
  if (side === 'both') return [...DEFAULT_DOWNSIDE_SHOCKS, ...DEFAULT_UPSIDE_SHOCKS.slice(1)];
  return DEFAULT_DOWNSIDE_SHOCKS;
}

function buildBuckets(currentPriceUsd: number, positions: LiquidationPositionRisk[], side: HeatmapSide): LiquidationBucket[] {
  return shockList(side).map((shockPct) => {
    const priceUsd = currentPriceUsd * (1 + shockPct / 100);
    const isDownsideBucket = shockPct <= 0;
    const atRisk = positions.filter((position) => {
      if (!Number.isFinite(position.liquidationPriceUsd) || position.liquidationPriceUsd <= 0) return false;
      if (position.side === 'Short') {
        return !isDownsideBucket && position.liquidationPriceUsd <= priceUsd && position.liquidationPriceUsd >= currentPriceUsd;
      }
      return isDownsideBucket && position.liquidationPriceUsd >= priceUsd;
    });

    const byPlatform = zeroPlatformBreakdown();
    const byRiskKind = zeroRiskKindBreakdown();
    let totalAtRiskUsd = 0;

    for (const position of atRisk) {
      totalAtRiskUsd += position.amountAtRiskUsd;
      byPlatform[position.platform].atRiskUsd += position.amountAtRiskUsd;
      byPlatform[position.platform].count += 1;
      byRiskKind[position.riskKind].atRiskUsd += position.amountAtRiskUsd;
      byRiskKind[position.riskKind].count += 1;
    }

    return {
      shockPct,
      priceUsd,
      totalAtRiskUsd,
      positionCount: atRisk.length,
      byPlatform,
      byRiskKind,
    };
  });
}

function distancePct(currentPriceUsd: number, liquidationPriceUsd: number, side: 'Long' | 'Short' | 'Borrow') {
  if (currentPriceUsd <= 0 || liquidationPriceUsd <= 0) return 0;
  if (side === 'Short') return ((liquidationPriceUsd - currentPriceUsd) / currentPriceUsd) * 100;
  return ((currentPriceUsd - liquidationPriceUsd) / currentPriceUsd) * 100;
}

async function graphQuery<T>(url: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`Subgraph request failed with ${response.status}`);
  const payload = await response.json() as { data?: T; errors?: unknown };
  if (payload.errors) throw new Error('Subgraph returned errors');
  if (!payload.data) throw new Error('Subgraph returned no data');
  return payload.data;
}

type TectonicAccountToken = {
  symbol: string;
  storedBorrowBalance: string;
  tTokenBalance: string;
  enteredMarket: boolean;
  market: {
    underlyingSymbol: string;
    collateralFactor: string;
    underlyingPriceUSD: string;
    exchangeRate: string;
  };
};

type TectonicAccount = {
  id: string;
  tokens: TectonicAccountToken[];
};

type TectonicMarket = {
  underlyingSymbol: string;
  underlyingPriceUSD: string;
};

async function fetchTectonicAccounts(): Promise<{ accounts: TectonicAccount[]; croPrice: number }> {
  const accounts: TectonicAccount[] = [];
  let skip = 0;
  const first = 1000;
  const maxAccounts = 20_000;
  let croPrice = 0;

  while (skip < maxAccounts) {
    const data = await graphQuery<{ accounts: TectonicAccount[]; markets: TectonicMarket[] }>(TECTONIC_SUBGRAPH_URL, `
      query TectonicBorrowers($first: Int!, $skip: Int!) {
        accounts(first: $first, skip: $skip, where: { hasBorrowed: true }) {
          id
          tokens {
            symbol
            storedBorrowBalance
            tTokenBalance
            enteredMarket
            market {
              underlyingSymbol
              collateralFactor
              underlyingPriceUSD
              exchangeRate
            }
          }
        }
        markets(first: 50) {
          underlyingSymbol
          underlyingPriceUSD
        }
      }
    `, { first, skip });

    if (!croPrice) {
      const croMarket = data.markets.find((market) => market.underlyingSymbol === 'CRO');
      croPrice = Number(croMarket?.underlyingPriceUSD || 0);
    }
    accounts.push(...data.accounts);
    if (data.accounts.length < first) break;
    skip += first;
  }

  return { accounts, croPrice };
}

async function collectTectonic(currentPriceUsd: number): Promise<CollectorResult> {
  const started = now();
  const { accounts, croPrice } = await fetchTectonicAccounts();
  const price = croPrice || currentPriceUsd;
  const positions: LiquidationPositionRisk[] = [];

  for (const account of accounts) {
    let weightedNonCroUsd = 0;
    let weightedCroUnits = 0;
    let croCollateralUsd = 0;
    let totalDebtUsd = 0;
    const debtSymbols = new Set<string>();

    for (const token of account.tokens || []) {
      const market = token.market;
      const underlyingSymbol = market.underlyingSymbol === 'WCRO' ? 'CRO' : market.underlyingSymbol;
      const tokenBalance = Number(token.tTokenBalance || 0);
      const exchangeRate = Number(market.exchangeRate || 0);
      const underlyingAmount = tokenBalance * exchangeRate;
      const assetPrice = Number(market.underlyingPriceUSD || 0);
      const collateralFactor = Number(market.collateralFactor || 0);
      const collateralUsd = token.enteredMarket ? underlyingAmount * assetPrice : 0;
      const weightedUsd = collateralUsd * collateralFactor;
      const borrowUsd = Number(token.storedBorrowBalance || 0) * assetPrice;

      if (borrowUsd > 0.01) {
        totalDebtUsd += borrowUsd;
        debtSymbols.add(underlyingSymbol);
      }

      if (weightedUsd > 0) {
        if (underlyingSymbol === 'CRO' || underlyingSymbol === 'LCRO') {
          // LCRO is CRO-correlated collateral. Treat its current USD value as CRO-price-sensitive exposure.
          const unitsAtCurrentPrice = price > 0 ? collateralUsd / price : 0;
          weightedCroUnits += unitsAtCurrentPrice * collateralFactor;
          croCollateralUsd += collateralUsd;
        } else {
          weightedNonCroUsd += weightedUsd;
        }
      }
    }

    if (totalDebtUsd <= 0.01 || weightedCroUnits <= 0 || croCollateralUsd <= 0) continue;
    const liquidationPriceUsd = (totalDebtUsd - weightedNonCroUsd) / weightedCroUnits;
    if (!Number.isFinite(liquidationPriceUsd) || liquidationPriceUsd <= 0 || liquidationPriceUsd > price * 1.5) continue;

    positions.push({
      id: `tectonic-${account.id}`,
      platform: 'tectonic',
      riskKind: 'lending-debt',
      account: account.id,
      pair: `CRO collateral / ${Array.from(debtSymbols).slice(0, 3).join('+') || 'Borrow'} debt`,
      side: 'Borrow',
      collateralSymbol: 'CRO',
      debtOrIndexSymbol: Array.from(debtSymbols).join(', ') || 'Borrow',
      currentPriceUsd: price,
      liquidationPriceUsd,
      distancePct: distancePct(price, liquidationPriceUsd, 'Borrow'),
      collateralUsd: croCollateralUsd,
      debtUsd: totalDebtUsd,
      amountAtRiskUsd: totalDebtUsd,
      source: 'tectonic-subgraph-accounts',
      updatedAt: started,
    });
  }

  return {
    positions,
    source: {
      platform: 'tectonic',
      source: 'tectonic-subgraph-accounts',
      updatedAt: started,
      ok: true,
      note: `Scanned ${accounts.length.toLocaleString()} Tectonic borrower accounts; CRO/LCRO collateral debt at risk is bucketed by shocked CRO oracle price.`,
    },
  };
}

type FulcromActivePosition = {
  id: string;
  account: string;
  indexToken: string;
  collateralToken: string;
  isLong: boolean;
  size: string;
  collateral: string;
  averagePrice: string;
  createdAt: string;
};

function usd30(raw: string | bigint | undefined): number {
  if (raw === undefined) return 0;
  try {
    const value = typeof raw === 'bigint' ? raw : BigInt(raw);
    return Number(formatUnits(value, USD_DECIMALS));
  } catch {
    return 0;
  }
}

function moonlanderPrice(raw: bigint): number {
  return Number(formatUnits(raw, MOONLANDER_PRICE_DECIMALS));
}

function moonlanderQty(raw: bigint): number {
  return Number(formatUnits(raw, MOONLANDER_QTY_DECIMALS));
}

function approximatePerpsLiquidationPrice(position: { side: 'Long' | 'Short'; entryPrice: number; collateralUsd: number; sizeUsd: number; feeUsd?: number }): number {
  if (position.entryPrice <= 0 || position.sizeUsd <= 0) return 0;
  const effectiveCollateralUsd = Math.max(0, position.collateralUsd - (position.feeUsd || 0));
  const marginPct = effectiveCollateralUsd / position.sizeUsd;
  return position.side === 'Long'
    ? position.entryPrice * Math.max(0, 1 - marginPct)
    : position.entryPrice * (1 + marginPct);
}

async function fetchFulcromActivePositions(): Promise<FulcromActivePosition[]> {
  const all: FulcromActivePosition[] = [];
  const first = 1000;
  let skip = 0;
  while (skip < 10_000) {
    const data = await graphQuery<{ activePositions: FulcromActivePosition[] }>(FULCROM_TRADES_SUBGRAPH, `
      query FulcromActivePositions($first: Int!, $skip: Int!) {
        activePositions(first: $first, skip: $skip, orderBy: size, orderDirection: desc) {
          id
          account
          indexToken
          collateralToken
          isLong
          size
          collateral
          averagePrice
          createdAt
        }
      }
    `, { first, skip });
    all.push(...data.activePositions);
    if (data.activePositions.length < first) break;
    skip += first;
  }
  return all;
}

async function collectFulcrom(currentPriceUsd: number): Promise<CollectorResult> {
  const started = now();
  const activePositions = await fetchFulcromActivePositions();
  const positions = activePositions
    .filter((position) => position.indexToken.toLowerCase() === WCRO)
    .map((position): LiquidationPositionRisk | null => {
      const side = position.isLong ? 'Long' : 'Short';
      const sizeUsd = usd30(position.size);
      const collateralUsd = usd30(position.collateral);
      const entryPrice = usd30(position.averagePrice);
      const liquidationPriceUsd = approximatePerpsLiquidationPrice({ side, entryPrice, collateralUsd, sizeUsd, feeUsd: 5 });
      if (sizeUsd <= 0 || liquidationPriceUsd <= 0) return null;
      return {
        id: `fulcrom-${position.id}`,
        platform: 'fulcrom',
        riskKind: 'perps-notional',
        account: position.account,
        pair: 'CRO/USD',
        side,
        collateralSymbol: position.collateralToken.toLowerCase() === WCRO ? 'CRO' : 'USDC/Other',
        debtOrIndexSymbol: 'CRO',
        currentPriceUsd,
        liquidationPriceUsd,
        distancePct: distancePct(currentPriceUsd, liquidationPriceUsd, side),
        collateralUsd,
        notionalUsd: sizeUsd,
        amountAtRiskUsd: sizeUsd,
        source: 'fulcrom-activepositions-subgraph',
        updatedAt: started,
      };
    })
    .filter((position): position is LiquidationPositionRisk => Boolean(position));

  return {
    positions,
    source: {
      platform: 'fulcrom',
      source: 'fulcrom-activepositions-subgraph',
      updatedAt: started,
      ok: true,
      note: `Scanned ${activePositions.length.toLocaleString()} Fulcrom active positions and filtered CRO/USD perps. Liquidation prices are planning estimates.`,
    },
  };
}

const MOONLANDER_OPEN_MARKET_TRADE_EVENT = parseAbiItem('event OpenMarketTrade(address indexed user, bytes32 indexed tradeHash, (address user,uint32 userOpenTradeIndex,uint40 holdingFeeRate,uint128 entryPrice,uint128 qty,address pairBase,address tokenIn,uint96 margin,uint128 stopLoss,uint128 takeProfit,uint24 broker,bool isLong,uint32 timestamp,uint96 openFee,uint96 executionFee,int256 longAccFundingFeePerShare,uint256 openBlock) ot)');
const MOONLANDER_CLOSE_TRADE_EVENT = parseAbiItem('event CloseTradeSuccessful(address indexed user, bytes32 indexed tradeHash, (uint128 closePrice,int96 fundingFee,uint96 closeFee,int96 pnl,uint96 holdingFee) closeInfo)');
const MOONLANDER_EXECUTE_CLOSE_EVENT = parseAbiItem('event ExecuteCloseSuccessful(address indexed user, bytes32 indexed tradeHash, uint8 executionType, (uint128 closePrice,int96 fundingFee,uint96 closeFee,int96 pnl,uint96 holdingFee) closeInfo)');

type MoonlanderOpen = {
  user: `0x${string}`;
  tradeHash: `0x${string}`;
  ot: {
    entryPrice: bigint;
    qty: bigint;
    pairBase: `0x${string}`;
    tokenIn: `0x${string}`;
    margin: bigint;
    isLong: boolean;
    openFee: bigint;
    executionFee: bigint;
    timestamp: number;
  };
};

async function collectMoonlander(currentPriceUsd: number): Promise<CollectorResult> {
  const started = now();
  const client = createPublicClient({ chain: cronos, transport: http(config.cronosRpcUrl) });
  const latestBlock = await client.getBlockNumber();
  const lookbackBlocks = BigInt(Number(process.env.MOONLANDER_HEATMAP_LOOKBACK_BLOCKS || 20_000));
  const fromBlock = latestBlock > lookbackBlocks ? latestBlock - lookbackBlocks : 0n;
  const chunkSize = 1900n;
  const openByHash = new Map<string, MoonlanderOpen>();
  let scannedChunks = 0;

  for (let start = fromBlock; start <= latestBlock; start += chunkSize + 1n) {
    const end = start + chunkSize > latestBlock ? latestBlock : start + chunkSize;
    scannedChunks += 1;
    const [opens, closes, executeCloses] = await Promise.all([
      client.getLogs({ address: MOONLANDER_DIAMOND, event: MOONLANDER_OPEN_MARKET_TRADE_EVENT, fromBlock: start, toBlock: end }),
      client.getLogs({ address: MOONLANDER_DIAMOND, event: MOONLANDER_CLOSE_TRADE_EVENT, fromBlock: start, toBlock: end }),
      client.getLogs({ address: MOONLANDER_DIAMOND, event: MOONLANDER_EXECUTE_CLOSE_EVENT, fromBlock: start, toBlock: end }),
    ]);

    for (const log of opens) {
      const args = log.args as unknown as MoonlanderOpen;
      if (args?.ot?.pairBase?.toLowerCase() === WCRO) {
        openByHash.set(args.tradeHash.toLowerCase(), args);
      }
    }
    for (const log of [...closes, ...executeCloses]) {
      const args = log.args as { tradeHash?: `0x${string}` };
      if (args?.tradeHash) openByHash.delete(args.tradeHash.toLowerCase());
    }
  }

  const positions: LiquidationPositionRisk[] = Array.from(openByHash.values()).map((open): LiquidationPositionRisk => {
    const side: 'Long' | 'Short' = open.ot.isLong ? 'Long' : 'Short';
    const entryPrice = moonlanderPrice(open.ot.entryPrice);
    const sizeTokenAmount = moonlanderQty(open.ot.qty);
    const sizeUsd = sizeTokenAmount * currentPriceUsd;
    const collateralUsd = Number(formatUnits(open.ot.margin, 6));
    const feesUsd = Number(formatUnits(open.ot.openFee + open.ot.executionFee, 6));
    const liquidationPriceUsd = approximatePerpsLiquidationPrice({ side, entryPrice, collateralUsd, sizeUsd, feeUsd: feesUsd });
    return {
      id: `moonlander-${open.tradeHash}`,
      platform: 'moonlander',
      riskKind: 'perps-notional',
      account: open.user,
      pair: 'CRO/USD',
      side,
      collateralSymbol: open.ot.tokenIn.toLowerCase() === '0xc21223249ca28397b4b6541dffaecc539bff0c59' ? 'USDC.e' : 'Collateral',
      debtOrIndexSymbol: 'CRO',
      currentPriceUsd,
      liquidationPriceUsd,
      distancePct: distancePct(currentPriceUsd, liquidationPriceUsd, side),
      collateralUsd,
      notionalUsd: sizeUsd,
      amountAtRiskUsd: sizeUsd,
      source: 'moonlander-diamond-recent-log-indexer',
      updatedAt: started,
      note: `Indexed from recent Moonlander logs starting block ${fromBlock.toString()}; older still-open positions may require a deeper indexer backfill.`,
    };
  }).filter((position) => position.amountAtRiskUsd > 0 && position.liquidationPriceUsd > 0);

  return {
    positions,
    source: {
      platform: 'moonlander',
      source: 'moonlander-diamond-recent-log-indexer',
      updatedAt: started,
      ok: true,
      note: `Scanned ${scannedChunks} Moonlander log chunks from block ${fromBlock.toString()} to ${latestBlock.toString()}. This is a live recent-log indexer; set MOONLANDER_HEATMAP_LOOKBACK_BLOCKS higher for deeper backfill.`,
    },
  };
}

function failedSource(platform: LiquidationPlatform, error: unknown): LiquidationHeatmapSource {
  return {
    platform,
    source: 'collector-error',
    updatedAt: now(),
    ok: false,
    note: error instanceof Error ? error.message : 'Unknown collector error',
  };
}

export async function buildLiquidationHeatmap(options: { platform?: HeatmapPlatformFilter; side?: HeatmapSide } = {}): Promise<LiquidationHeatmapResponse> {
  const platform = options.platform || 'all';
  const side = options.side || 'downside';
  const cacheKey = `${platform}:${side}`;
  if (cache?.key === cacheKey && now() - cache.timestamp < CACHE_TTL_MS) {
    return cache.response;
  }

  const prices = await fetchPrices();
  const currentPriceUsd = prices.CRO || 0;
  if (currentPriceUsd <= 0) throw new Error('CRO price unavailable');

  const collectors: Array<[LiquidationPlatform, () => Promise<CollectorResult>]> = [];
  if (platform === 'all' || platform === 'tectonic') collectors.push(['tectonic', () => collectTectonic(currentPriceUsd)]);
  if (platform === 'all' || platform === 'fulcrom') collectors.push(['fulcrom', () => collectFulcrom(currentPriceUsd)]);
  if (platform === 'all' || platform === 'moonlander') collectors.push(['moonlander', () => collectMoonlander(currentPriceUsd)]);

  const settled = await Promise.allSettled(collectors.map(([, collect]) => collect()));
  const positions: LiquidationPositionRisk[] = [];
  const sources: LiquidationHeatmapSource[] = [];

  settled.forEach((result, index) => {
    const collectorPlatform = collectors[index][0];
    if (result.status === 'fulfilled') {
      positions.push(...result.value.positions);
      sources.push(result.value.source);
    } else {
      sources.push(failedSource(collectorPlatform, result.reason));
    }
  });

  if (positions.length === 0 && !sources.some((source) => source.ok)) {
    throw new Error('All liquidation heatmap collectors failed');
  }

  const filteredPositions = positions
    .filter((position) => side === 'both' || (side === 'upside' ? position.side === 'Short' : position.side !== 'Short'))
    .sort((a, b) => a.distancePct - b.distancePct);

  const response: LiquidationHeatmapResponse = {
    asset: 'CRO',
    currentPriceUsd,
    buckets: buildBuckets(currentPriceUsd, filteredPositions, side),
    positions: filteredPositions.slice(0, 500),
    sources,
    timestamp: now(),
    note: 'Tectonic values are debt at risk. Fulcrom and Moonlander values are perps notional at risk. Perps liquidation prices are planning estimates, not venue guarantees.',
  };

  cache = { key: cacheKey, timestamp: now(), response };
  return response;
}
