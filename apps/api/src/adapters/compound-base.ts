/**
 * Generic Compound V2 fork adapter factory.
 * Supports any Compound-compatible protocol on any EVM chain.
 */
import { createPublicClient, http, type PublicClient } from 'viem';
import { cronos } from 'viem/chains';
import type {
  ProtocolSnapshot,
  CollateralPosition,
  BorrowPosition,
  AssetMeta,
} from '@cronos-dash/shared';
import { calculateRiskMetrics } from '@cronos-dash/shared';

// ─── ABIs ────────────────────────────────────────────────────────────────────

export const COMPTROLLER_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'getAssetsIn',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'getAccountLiquidity',
    outputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'uint256' },
      { name: '', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tToken', type: 'address' }],
    name: 'markets',
    outputs: [
      { name: 'isListed', type: 'bool' },
      { name: 'collateralFactorMantissa', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getAllMarkets',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const TTOKEN_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'borrowBalanceCurrent',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'borrowBalanceStored',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'exchangeRateStored',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'exchangeRateCurrent',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'underlying',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const ERC20_ABI = [
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CompoundMarketConfig {
  tTokenAddress: `0x${string}`;
  symbol: string;
  underlyingDecimals: number;
  underlyingAddress?: string;
  isNative?: boolean; // true for native gas token (e.g. CRO) — no underlying() call
}

export interface CompoundProtocolConfig {
  name: string;         // e.g. 'tectonic' | 'mimas'
  displayName: string;  // e.g. 'Tectonic' | 'Mimas Finance'
  chainId: number;      // 25 = Cronos mainnet
  rpcUrls: string[];
  comptroller: `0x${string}`;
  maxLtv: number;       // e.g. 0.63 for Tectonic
  markets: readonly CompoundMarketConfig[];
}

interface CachedPortfolio {
  data: ProtocolSnapshot;
  timestamp: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Recalculate portfolio USD values with current prices.
 * Used when returning cached data with fresh prices.
 */
export function recalculatePortfolioWithPrices(
  snapshot: ProtocolSnapshot,
  prices: Record<string, number>,
  maxLtv: number
): ProtocolSnapshot {
  const collaterals: CollateralPosition[] = snapshot.collaterals.map((c) => ({
    ...c,
    valueUsd: c.amount * (prices[c.asset.symbol] ?? 0),
  }));

  const borrows: BorrowPosition[] = snapshot.borrows.map((b) => ({
    ...b,
    valueUsd: b.amount * (prices[b.asset.symbol] ?? 1),
  }));

  const totals = {
    collateralUsd: collaterals.reduce((sum, c) => sum + c.valueUsd, 0),
    borrowUsd: borrows.reduce((sum, b) => sum + b.valueUsd, 0),
    weightedCollateralUsd: collaterals
      .filter((c) => c.enabled)
      .reduce((sum, c) => sum + c.valueUsd * c.liquidationThreshold, 0),
  };

  const risk = calculateRiskMetrics(collaterals, borrows, prices);
  risk.availableBorrowUsd = Math.max(0, totals.collateralUsd * maxLtv - totals.borrowUsd);

  return { ...snapshot, collaterals, borrows, totals, risk };
}

function emptySnapshot(protocol: string): ProtocolSnapshot {
  return {
    protocol,
    collaterals: [],
    borrows: [],
    totals: { collateralUsd: 0, borrowUsd: 0, weightedCollateralUsd: 0 },
    risk: {
      healthFactor: Infinity,
      totalCollateralUsd: 0,
      totalBorrowUsd: 0,
      availableBorrowUsd: 0,
      liquidationPrices: {},
    },
  };
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a Compound V2-compatible protocol adapter.
 * Returns an object with { name, displayName, fetchPortfolio }.
 */
export function createCompoundAdapter(cfg: CompoundProtocolConfig) {
  const PORTFOLIO_CACHE_TTL = 120_000; // 2 min
  const portfolioCache = new Map<string, CachedPortfolio>();

  // Build per-instance RPC clients
  const rpcClients: PublicClient[] = cfg.rpcUrls.map((url) =>
    createPublicClient({ chain: cronos, transport: http(url) })
  );
  let preferredRpcIndex = 0;

  async function getWorkingClient(): Promise<PublicClient> {
    for (let i = 0; i < rpcClients.length; i++) {
      const idx = (preferredRpcIndex + i) % rpcClients.length;
      try {
        await rpcClients[idx].getBlockNumber();
        if (i > 0) {
          console.log(`[${cfg.name}] RPC fallback → ${cfg.rpcUrls[idx]}`);
          preferredRpcIndex = idx;
        }
        return rpcClients[idx];
      } catch {
        console.warn(`[${cfg.name}] RPC ${cfg.rpcUrls[idx]} failed, trying next…`);
      }
    }
    console.error(`[${cfg.name}] All RPC endpoints failed, using primary`);
    return rpcClients[0];
  }

  function cleanupCache() {
    const now = Date.now();
    for (const [key, cached] of portfolioCache.entries()) {
      if (now - cached.timestamp > PORTFOLIO_CACHE_TTL) portfolioCache.delete(key);
    }
  }

  // Build tToken map from config
  const tTokenMap: Record<
    string,
    { symbol: string; underlyingDecimals: number; underlyingAddress?: string; isNative?: boolean }
  > = {};
  for (const m of cfg.markets) {
    tTokenMap[m.tTokenAddress.toLowerCase()] = {
      symbol: m.symbol,
      underlyingDecimals: m.underlyingDecimals,
      underlyingAddress: m.underlyingAddress,
      isNative: m.isNative,
    };
  }

  async function fetchPortfolio(
    address: string,
    prices: Record<string, number>
  ): Promise<ProtocolSnapshot> {
    const cacheKey = address.toLowerCase();
    const now = Date.now();
    const cached = portfolioCache.get(cacheKey);

    if (cached && now - cached.timestamp < PORTFOLIO_CACHE_TTL) {
      console.log(`[${cfg.name}] Using cached portfolio for ${address}`);
      return recalculatePortfolioWithPrices(cached.data, prices, cfg.maxLtv);
    }

    if (portfolioCache.size > 100) cleanupCache();

    try {
      const userAddress = address as `0x${string}`;
      const rpcClient = await getWorkingClient();

      // Markets the user has enabled as collateral
      const assetsIn = await rpcClient.readContract({
        address: cfg.comptroller,
        abi: COMPTROLLER_ABI,
        functionName: 'getAssetsIn',
        args: [userAddress],
      });
      const enabledMarkets = new Set(assetsIn.map((a) => a.toLowerCase()));

      // Account liquidity (available borrow / shortfall in USD, 18 dec)
      const [, liquidityRaw, shortfallRaw] = await rpcClient.readContract({
        address: cfg.comptroller,
        abi: COMPTROLLER_ABI,
        functionName: 'getAccountLiquidity',
        args: [userAddress],
      });
      const protocolShortfall = Number(shortfallRaw) / 1e18;
      console.log(`[${cfg.name}] shortfall=$${protocolShortfall.toFixed(2)}`);

      const tTokenAddresses = Object.keys(tTokenMap);

      // Fetch data for all markets in parallel
      const marketData = await Promise.all(
        tTokenAddresses.map(async (tTokenAddr) => {
          const tToken = tTokenAddr as `0x${string}`;
          const info = tTokenMap[tTokenAddr];

          const [tTokenBalance, borrowBalance, exchangeRate, marketInfo] = await Promise.all([
            rpcClient.readContract({ address: tToken, abi: TTOKEN_ABI, functionName: 'balanceOf', args: [userAddress] }),
            rpcClient.readContract({ address: tToken, abi: TTOKEN_ABI, functionName: 'borrowBalanceCurrent', args: [userAddress] }),
            rpcClient.readContract({ address: tToken, abi: TTOKEN_ABI, functionName: 'exchangeRateStored' }),
            rpcClient.readContract({ address: cfg.comptroller, abi: COMPTROLLER_ABI, functionName: 'markets', args: [tToken] }),
          ]);

          const ud = info.underlyingDecimals;
          const product = tTokenBalance * exchangeRate;
          const divisor = BigInt(10) ** BigInt(18 + ud);
          const underlyingBalance =
            Number(product / divisor) + Number(product % divisor) / Number(divisor);

          const borrowBalanceNum = Number(borrowBalance) / Math.pow(10, ud);
          const collateralFactor = Number(marketInfo[1]) / 1e18;
          const isEnabled = enabledMarkets.has(tTokenAddr);
          const price = prices[info.symbol] ?? 0;

          return { info, tTokenAddr, underlyingBalance, borrowBalanceNum, collateralFactor, isEnabled, price, ud };
        })
      );

      const collaterals: CollateralPosition[] = [];
      const borrows: BorrowPosition[] = [];

      for (const m of marketData) {
        const assetMeta: AssetMeta = {
          symbol: m.info.symbol,
          address: m.info.underlyingAddress ?? '',
          decimals: m.ud,
        };

        if (m.underlyingBalance > 0.000001) {
          collaterals.push({
            asset: assetMeta,
            amount: m.underlyingBalance,
            valueUsd: m.underlyingBalance * m.price,
            liquidationThreshold: m.collateralFactor,
            enabled: m.isEnabled,
          });
        }

        if (m.borrowBalanceNum > 0.000001) {
          borrows.push({
            asset: assetMeta,
            amount: m.borrowBalanceNum,
            valueUsd: m.borrowBalanceNum * m.price,
          });
        }
      }

      console.log(`[${cfg.name}] ${collaterals.length} collaterals, ${borrows.length} borrows`);

      const totals = {
        collateralUsd: collaterals.reduce((sum, c) => sum + c.valueUsd, 0),
        borrowUsd: borrows.reduce((sum, b) => sum + b.valueUsd, 0),
        weightedCollateralUsd: collaterals
          .filter((c) => c.enabled)
          .reduce((sum, c) => sum + c.valueUsd * c.liquidationThreshold, 0),
      };

      const risk = calculateRiskMetrics(collaterals, borrows, prices);
      const maxBorrow = totals.collateralUsd * cfg.maxLtv;
      risk.availableBorrowUsd = protocolShortfall > 0 ? 0 : Math.max(0, maxBorrow - totals.borrowUsd);

      const snapshot: ProtocolSnapshot = { protocol: cfg.name, collaterals, borrows, totals, risk };
      portfolioCache.set(cacheKey, { data: snapshot, timestamp: now });

      return snapshot;
    } catch (error) {
      console.error(`[${cfg.name}] Error fetching portfolio:`, error);
      return emptySnapshot(cfg.name);
    }
  }

  return {
    name: cfg.name,
    displayName: cfg.displayName,
    fetchPortfolio,
  };
}
