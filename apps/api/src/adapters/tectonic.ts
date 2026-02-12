import { createPublicClient, http, formatUnits, type PublicClient } from 'viem';
import { cronos } from 'viem/chains';
import type {
  ProtocolSnapshot,
  CollateralPosition,
  BorrowPosition,
  AssetMeta,
} from '@cronos-dash/shared';
import { calculateRiskMetrics } from '@cronos-dash/shared';
import { config, TECTONIC_ADDRESSES, ASSETS, CRONOS_RPC_URLS } from '../config.js';

// Safety factor to match Tectonic UI's available borrow display
// Tectonic UI shows ~58% of raw getAccountLiquidity() value
const TECTONIC_SAFETY_FACTOR = 0.58;

// Comptroller ABI for reading account data
const COMPTROLLER_ABI = [
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

// tToken ABI for balances
const TTOKEN_ABI = [
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

// ERC20 ABI for underlying tokens
const ERC20_ABI = [
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

// Create clients for each RPC endpoint
const rpcClients: PublicClient[] = CRONOS_RPC_URLS.map((url) =>
  createPublicClient({
    chain: cronos,
    transport: http(url),
  })
);

// Track which RPC is currently preferred (rotates on failure)
let preferredRpcIndex = 0;

/**
 * Get a working RPC client, trying fallbacks on failure
 */
async function getWorkingClient(): Promise<PublicClient> {
  // Try preferred client first, then rotate through others
  for (let i = 0; i < rpcClients.length; i++) {
    const index = (preferredRpcIndex + i) % rpcClients.length;
    const client = rpcClients[index];
    try {
      // Quick health check - get block number
      await client.getBlockNumber();
      if (i > 0) {
        // We had to fall back, update preferred
        console.log(`RPC fallback: switched to ${CRONOS_RPC_URLS[index]}`);
        preferredRpcIndex = index;
      }
      return client;
    } catch (error) {
      console.warn(`RPC ${CRONOS_RPC_URLS[index]} failed, trying next...`);
    }
  }
  // All failed, return first and let the caller handle the error
  console.error('All RPC endpoints failed, using primary');
  return rpcClients[0];
}

// Default client for backward compatibility
const client = rpcClients[0];

// Map tToken addresses to asset info
const TTOKEN_MAP: Record<string, { symbol: string; underlyingDecimals: number }> = {
  [TECTONIC_ADDRESSES.tCRO.toLowerCase()]: { symbol: 'CRO', underlyingDecimals: 18 },
  [TECTONIC_ADDRESSES.tUSDC.toLowerCase()]: { symbol: 'USDC', underlyingDecimals: 6 },
  [TECTONIC_ADDRESSES.tETH.toLowerCase()]: { symbol: 'ETH', underlyingDecimals: 18 },
  [TECTONIC_ADDRESSES.tWBTC.toLowerCase()]: { symbol: 'WBTC', underlyingDecimals: 8 },
};

// Native CRO handling - tCRO doesn't have underlying() as CRO is native
const NATIVE_TTOKEN = TECTONIC_ADDRESSES.tCRO.toLowerCase();

// Liquidation thresholds (collateral factors) for Tectonic
const LIQUIDATION_THRESHOLDS: Record<string, number> = {
  CRO: 0.75,
  USDC: 0.85,
  ETH: 0.80,
  WBTC: 0.75,
};

interface TectonicAdapterOptions {
  useMockData?: boolean;
}

// Portfolio cache to reduce RPC calls
interface CachedPortfolio {
  data: ProtocolSnapshot;
  timestamp: number;
}
const portfolioCache = new Map<string, CachedPortfolio>();
const PORTFOLIO_CACHE_TTL = 120000; // 2 minutes

/**
 * Clear expired portfolio cache entries
 */
function cleanupPortfolioCache() {
  const now = Date.now();
  for (const [address, cached] of portfolioCache.entries()) {
    if (now - cached.timestamp > PORTFOLIO_CACHE_TTL) {
      portfolioCache.delete(address);
    }
  }
}

/**
 * Fetch portfolio data from Tectonic protocol
 * Reads actual on-chain data from Tectonic contracts on Cronos mainnet.
 */
export async function fetchTectonicPortfolio(
  address: string,
  prices: Record<string, number>,
  options: TectonicAdapterOptions = {}
): Promise<ProtocolSnapshot> {
  // Allow fallback to mock data for testing
  if (options.useMockData === true) {
    return getMockPortfolio(address, prices);
  }

  // Check portfolio cache
  const cacheKey = address.toLowerCase();
  const now = Date.now();
  const cached = portfolioCache.get(cacheKey);

  if (cached && now - cached.timestamp < PORTFOLIO_CACHE_TTL) {
    console.log(`Using cached portfolio for ${address}`);
    // Update values with current prices (cache structure, recalc USD values)
    return recalculatePortfolioWithPrices(cached.data, prices);
  }

  // Cleanup old cache entries periodically
  if (portfolioCache.size > 100) {
    cleanupPortfolioCache();
  }

  try {
    const userAddress = address as `0x${string}`;

    // Get a working RPC client (with fallback support)
    const rpcClient = await getWorkingClient();

    // Get markets the user has entered (enabled as collateral)
    const assetsIn = await rpcClient.readContract({
      address: TECTONIC_ADDRESSES.comptroller,
      abi: COMPTROLLER_ABI,
      functionName: 'getAssetsIn',
      args: [userAddress],
    });

    const enabledMarkets = new Set(assetsIn.map((a) => a.toLowerCase()));
    console.log(`User ${address} has entered markets:`, Array.from(enabledMarkets));

    // Get account liquidity from Comptroller (this gives us the protocol's actual available borrow)
    const accountLiquidity = await rpcClient.readContract({
      address: TECTONIC_ADDRESSES.comptroller,
      abi: COMPTROLLER_ABI,
      functionName: 'getAccountLiquidity',
      args: [userAddress],
    });
    // Returns [error, liquidity, shortfall] - all scaled by 1e18
    const protocolAvailableBorrow = Number(accountLiquidity[1]) / 1e18;
    const protocolShortfall = Number(accountLiquidity[2]) / 1e18;
    console.log(`Protocol liquidity: $${protocolAvailableBorrow.toFixed(2)}, shortfall: $${protocolShortfall.toFixed(2)}`);

    // Get all supported tToken addresses
    const tTokenAddresses = Object.keys(TTOKEN_MAP);

    // Fetch data for all markets in parallel
    const marketDataPromises = tTokenAddresses.map(async (tTokenAddress) => {
      const tToken = tTokenAddress as `0x${string}`;
      const assetInfo = TTOKEN_MAP[tTokenAddress];

      // Fetch tToken balance, borrow balance, exchange rate, and collateral factor in parallel
      const [tTokenBalance, borrowBalance, exchangeRate, marketInfo] = await Promise.all([
        rpcClient.readContract({
          address: tToken,
          abi: TTOKEN_ABI,
          functionName: 'balanceOf',
          args: [userAddress],
        }),
        rpcClient.readContract({
          address: tToken,
          abi: TTOKEN_ABI,
          functionName: 'borrowBalanceStored',
          args: [userAddress],
        }),
        rpcClient.readContract({
          address: tToken,
          abi: TTOKEN_ABI,
          functionName: 'exchangeRateStored',
        }),
        rpcClient.readContract({
          address: TECTONIC_ADDRESSES.comptroller,
          abi: COMPTROLLER_ABI,
          functionName: 'markets',
          args: [tToken],
        }),
      ]);

      // Calculate underlying balance from tToken balance
      // For Compound-style protocols:
      // underlyingBalance = tTokenBalance * exchangeRate / 10^(18 + underlyingDecimals)
      // We need BigInt arithmetic to avoid precision loss
      const underlyingDecimals = assetInfo.underlyingDecimals;

      // tToken has 8 decimals, exchangeRate is scaled by 10^(10 + underlyingDecimals)
      // To get underlying: tTokenBalance * exchangeRate / 10^(18 + underlyingDecimals)
      // We'll divide in steps to maintain precision
      const product = tTokenBalance * exchangeRate; // BigInt multiplication
      const divisor = BigInt(10) ** BigInt(18 + underlyingDecimals);
      const underlyingBalance = Number(product / divisor) + Number(product % divisor) / Number(divisor);

      // Borrow balance is already in underlying decimals
      const borrowBalanceNum = Number(borrowBalance) / Math.pow(10, underlyingDecimals);

      // Collateral factor from market info (18 decimals)
      const collateralFactor = Number(marketInfo[1]) / 1e18;

      const isEnabled = enabledMarkets.has(tTokenAddress);
      const price = prices[assetInfo.symbol] || 0;

      return {
        symbol: assetInfo.symbol,
        tTokenAddress,
        underlyingBalance,
        borrowBalance: borrowBalanceNum,
        collateralFactor,
        isEnabled,
        price,
        underlyingDecimals,
      };
    });

    const marketData = await Promise.all(marketDataPromises);

    // Build collateral and borrow positions
    const collaterals: CollateralPosition[] = [];
    const borrows: BorrowPosition[] = [];

    for (const market of marketData) {
      const assetMeta: AssetMeta = {
        symbol: market.symbol,
        address: ASSETS[market.symbol as keyof typeof ASSETS]?.address || '',
        decimals: market.underlyingDecimals,
      };

      // Add collateral position if user has supplied
      if (market.underlyingBalance > 0.000001) { // Filter dust
        collaterals.push({
          asset: assetMeta,
          amount: market.underlyingBalance,
          valueUsd: market.underlyingBalance * market.price,
          liquidationThreshold: market.collateralFactor,
          enabled: market.isEnabled,
        });
      }

      // Add borrow position if user has borrowed
      if (market.borrowBalance > 0.000001) { // Filter dust
        borrows.push({
          asset: assetMeta,
          amount: market.borrowBalance,
          valueUsd: market.borrowBalance * market.price,
        });
      }
    }

    console.log(`Found ${collaterals.length} collateral positions, ${borrows.length} borrow positions`);

    // Calculate totals
    const totals = {
      collateralUsd: collaterals.reduce((sum, c) => sum + c.valueUsd, 0),
      borrowUsd: borrows.reduce((sum, b) => sum + b.valueUsd, 0),
      weightedCollateralUsd: collaterals
        .filter((c) => c.enabled)
        .reduce((sum, c) => sum + c.valueUsd * c.liquidationThreshold, 0),
    };

    // Calculate risk metrics, but override availableBorrowUsd with protocol's value
    const risk = calculateRiskMetrics(collaterals, borrows, prices);
    // Use the protocol's available borrow with safety factor to match Tectonic UI
    risk.availableBorrowUsd = protocolShortfall > 0 ? 0 : protocolAvailableBorrow * TECTONIC_SAFETY_FACTOR;

    const snapshot: ProtocolSnapshot = {
      protocol: 'tectonic',
      collaterals,
      borrows,
      totals,
      risk,
    };

    // Cache the portfolio
    portfolioCache.set(cacheKey, { data: snapshot, timestamp: now });
    console.log(`Cached portfolio for ${address}`);

    return snapshot;
  } catch (error) {
    console.error('Error fetching Tectonic portfolio:', error);
    // Return empty portfolio on error rather than throwing
    return {
      protocol: 'tectonic',
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
}

/**
 * Recalculate portfolio USD values with current prices
 * Used when returning cached portfolio data with fresh prices
 */
function recalculatePortfolioWithPrices(
  snapshot: ProtocolSnapshot,
  prices: Record<string, number>
): ProtocolSnapshot {
  // Update collateral values
  const collaterals: CollateralPosition[] = snapshot.collaterals.map((c) => ({
    ...c,
    valueUsd: c.amount * (prices[c.asset.symbol] || 0),
  }));

  // Update borrow values
  const borrows: BorrowPosition[] = snapshot.borrows.map((b) => ({
    ...b,
    valueUsd: b.amount * (prices[b.asset.symbol] || 1),
  }));

  // Recalculate totals
  const totals = {
    collateralUsd: collaterals.reduce((sum, c) => sum + c.valueUsd, 0),
    borrowUsd: borrows.reduce((sum, b) => sum + b.valueUsd, 0),
    weightedCollateralUsd: collaterals
      .filter((c) => c.enabled)
      .reduce((sum, c) => sum + c.valueUsd * c.liquidationThreshold, 0),
  };

  // Recalculate risk with new prices
  const risk = calculateRiskMetrics(collaterals, borrows, prices);

  // Apply safety factor to available borrow to match Tectonic display
  const rawAvailableBorrow = Math.max(0, totals.weightedCollateralUsd - totals.borrowUsd);
  risk.availableBorrowUsd = rawAvailableBorrow * TECTONIC_SAFETY_FACTOR;

  return {
    ...snapshot,
    collaterals,
    borrows,
    totals,
    risk,
  };
}

/**
 * Mock portfolio for development/demo
 */
function getMockPortfolio(
  address: string,
  prices: Record<string, number>
): ProtocolSnapshot {
  const croPrice = prices['CRO'] || 0.15;
  const croAmount = 500000; // 500,000 CRO supplied
  const croValueUsd = croAmount * croPrice;

  const usdcBorrowed = 21500; // $21,500 USDC borrowed
  const usdcPrice = prices['USDC'] || 1;

  const collaterals: CollateralPosition[] = [
    {
      asset: ASSETS.CRO as AssetMeta,
      amount: croAmount,
      valueUsd: croValueUsd,
      liquidationThreshold: LIQUIDATION_THRESHOLDS.CRO,
      enabled: true,
    },
  ];

  const borrows: BorrowPosition[] = [
    {
      asset: ASSETS.USDC as AssetMeta,
      amount: usdcBorrowed,
      valueUsd: usdcBorrowed * usdcPrice,
    },
  ];

  const totals = {
    collateralUsd: collaterals.reduce((sum, c) => sum + c.valueUsd, 0),
    borrowUsd: borrows.reduce((sum, b) => sum + b.valueUsd, 0),
    weightedCollateralUsd: collaterals.reduce(
      (sum, c) => sum + c.valueUsd * c.liquidationThreshold,
      0
    ),
  };

  const risk = calculateRiskMetrics(collaterals, borrows, prices);

  return {
    protocol: 'tectonic',
    collaterals,
    borrows,
    totals,
    risk,
  };
}

// CoinGecko IDs for our assets
const COINGECKO_IDS: Record<string, string> = {
  CRO: 'crypto-com-chain',
  USDC: 'usd-coin',
  ETH: 'ethereum',
  WBTC: 'wrapped-bitcoin',
  BTC: 'bitcoin',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  AVAX: 'avalanche-2',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  ATOM: 'cosmos',
};

// Fallback prices if API fails
const FALLBACK_PRICES: Record<string, number> = {
  CRO: 0.09,
  USDC: 1.0,
  ETH: 3200,
  WBTC: 98000,
  BTC: 98000,
  SOL: 180,
  BNB: 600,
  XRP: 2.5,
  ADA: 0.9,
  AVAX: 35,
  DOGE: 0.3,
  DOT: 7,
  MATIC: 0.5,
  LINK: 18,
  ATOM: 9,
};

// Price cache to avoid rate limiting
let priceCache: Record<string, number> | null = null;
let priceCacheTimestamp = 0;
const PRICE_CACHE_TTL = 300000; // 5 minutes

/**
 * Fetch current prices from CoinGecko API with caching
 */
export async function fetchPrices(): Promise<Record<string, number>> {
  // Return cached prices if still valid
  const now = Date.now();
  if (priceCache && now - priceCacheTimestamp < PRICE_CACHE_TTL) {
    console.log('Using cached prices:', priceCache);
    return priceCache;
  }

  try {
    const ids = Object.values(COINGECKO_IDS).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.warn('CoinGecko API error, using fallback prices');
      // Use cached prices if available, otherwise fallback
      return priceCache || FALLBACK_PRICES;
    }

    const data = await response.json() as Record<string, { usd?: number }>;

    // Map CoinGecko response to our symbol format
    const prices: Record<string, number> = {};
    for (const [symbol, geckoId] of Object.entries(COINGECKO_IDS)) {
      prices[symbol] = data[geckoId]?.usd ?? FALLBACK_PRICES[symbol];
    }

    // Update cache
    priceCache = prices;
    priceCacheTimestamp = now;

    console.log('Fetched live prices:', prices);
    return prices;
  } catch (error) {
    console.error('Failed to fetch prices from CoinGecko:', error);
    // Use cached prices if available, otherwise fallback
    return priceCache || FALLBACK_PRICES;
  }
}
