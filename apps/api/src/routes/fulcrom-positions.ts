import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createPublicClient, formatUnits, http, parseAbi } from 'viem';
import { cronos } from 'viem/chains';
import type { FulcromPosition, FulcromPositionsResponse } from '@cronos-dash/shared';
import { config } from '../config.js';

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

const FULCROM = {
  vault: '0x8C7Ef34aa54210c76D6d5E475f43e0c11f876098',
  reader: '0x3881df9c3115aA4a2E35C080764B5Dd8112dE177',
} as const;

const USD_DECIMALS = 30;
const LIQUIDATION_FEE_USD = 5;

const TOKENS = [
  { symbol: 'AAVE', address: '0xE657b115bc45c0786274c824f83e3e02CE809185' },
  { symbol: 'ADA', address: '0x0e517979C2c1c1522ddB0c73905e0D39b3F990c0' },
  { symbol: 'ATOM', address: '0xb888d8dd1733d72681b30c00ee76bde93ae7aa93' },
  { symbol: 'BCH', address: '0x7589B70aBb83427bb7049e08ee9fC6479ccB7a23' },
  { symbol: 'BTC', address: '0x062e66477faf219f25d27dced647bf57c3107d52' },
  { symbol: 'CRO', address: '0x5c7f8a570d578ed84e63fdfa7b1ee72deae1ae23' },
  { symbol: 'DOGE', address: '0x1a8e39ae59e5556b56b76fcba98d22c9ae557396' },
  { symbol: 'ETH', address: '0xe44fd7fcb2b1581822d0c862b68222998a0c299a' },
  { symbol: 'HBAR', address: '0xe0C7226a58f54db71eDc6289Ba2dc80349B41974' },
  { symbol: 'LTC', address: '0x9d97Be214b68C7051215BB61059B4e299Cd792c3' },
  { symbol: 'NEAR', address: '0xafe470ae215e48c144c7158eae3ccf0c451cb0cb' },
  { symbol: 'PAXG', address: '0x81749e7258f9e577f61f49ABeeB426b70F561b89' },
  { symbol: 'PENGU', address: '0x769409037336430A1a5890065B7853f0D1D8b58f' },
  { symbol: 'PEPE', address: '0xf868c454784048af4f857991583e34243c92ff48' },
  { symbol: 'SHIB', address: '0xbed48612bc69fa1cab67052b42a95fb30c1bcfee' },
  { symbol: 'SOL', address: '0xc9DE0F3e08162312528FF72559db82590b481800' },
  { symbol: 'SUI', address: '0x81710203A7FC16797aC9899228a87fd622df9706' },
  { symbol: 'TRUMP', address: '0xd1D7A0Ff6Cd3d494038b7FB93dbAeF624Da6f417' },
  { symbol: 'UNI', address: '0x16aD43896f7C47a5d9Ee546c44A22205738B329c' },
  { symbol: 'WIF', address: '0x25e8c72d267b96e757875d8b565a42c0e3b8f12f' },
  { symbol: 'XRP', address: '0xb9ce0dd29c91e02d4620f57a66700fc5e41d6d15' },
] as const;

const STABLE_TOKENS = [
  { symbol: 'USDC', address: '0xc21223249ca28397b4b6541dffaecc539bff0c59' },
  { symbol: 'USDT', address: '0x66e428c3f67a68878562e79a0234c1f83c208770' },
] as const;

const READER_ABI = parseAbi([
  'function getPositions(address _vault, address _account, address[] _collateralTokens, address[] _indexTokens, bool[] _isLong) view returns (uint256[])',
]);

const VAULT_ABI = parseAbi([
  'function getMaxPrice(address _token) view returns (uint256)',
  'function getMinPrice(address _token) view returns (uint256)',
]);

function usd(raw: bigint): number {
  return Number(formatUnits(raw, USD_DECIMALS));
}

function price(raw: bigint): number {
  return Number(formatUnits(raw, USD_DECIMALS));
}

function approximateLiquidationPrice(position: {
  side: 'Long' | 'Short';
  entryPrice: number;
  collateralUsd: number;
  sizeUsd: number;
}): number {
  if (position.entryPrice <= 0 || position.sizeUsd <= 0) return 0;
  const effectiveCollateralUsd = Math.max(0, position.collateralUsd - LIQUIDATION_FEE_USD);
  const marginPct = effectiveCollateralUsd / position.sizeUsd;
  return position.side === 'Long'
    ? position.entryPrice * Math.max(0, 1 - marginPct)
    : position.entryPrice * (1 + marginPct);
}

function buildPositionCandidates() {
  const collateralTokens: `0x${string}`[] = [];
  const indexTokens: `0x${string}`[] = [];
  const isLong: boolean[] = [];
  const metadata: Array<{ indexSymbol: string; collateralSymbol: string; side: 'Long' | 'Short'; indexAddress: `0x${string}` }> = [];

  const add = (collateral: { symbol: string; address: string }, index: { symbol: string; address: string }, side: 'Long' | 'Short') => {
    collateralTokens.push(collateral.address as `0x${string}`);
    indexTokens.push(index.address as `0x${string}`);
    isLong.push(side === 'Long');
    metadata.push({ indexSymbol: index.symbol, collateralSymbol: collateral.symbol, side, indexAddress: index.address as `0x${string}` });
  };

  for (const index of TOKENS) {
    // GMX/Fulcrom-style longs commonly use the index token as collateral. Fulcrom's UI may also route stable collateral.
    add(index, index, 'Long');
    for (const stable of STABLE_TOKENS) {
      add(stable, index, 'Long');
      add(stable, index, 'Short');
    }
  }

  return { collateralTokens, indexTokens, isLong, metadata };
}

export const fulcromPositionsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Querystring: { address: string };
  }>('/fulcrom-positions', {
    schema: {
      querystring: {
        type: 'object',
        required: ['address'],
        properties: {
          address: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
        },
      },
    },
    handler: async (request, reply) => {
      const { address } = request.query;

      try {
        const validAddress = addressSchema.parse(address) as `0x${string}`;
        const client = createPublicClient({
          chain: cronos,
          transport: http(config.cronosRpcUrl),
        });
        const { collateralTokens, indexTokens, isLong, metadata } = buildPositionCandidates();

        const rawPositions = await client.readContract({
          address: FULCROM.reader,
          abi: READER_ABI,
          functionName: 'getPositions',
          args: [FULCROM.vault, validAddress, collateralTokens, indexTokens, isLong],
        });

        const positions: FulcromPosition[] = [];
        const priceCache = new Map<`0x${string}`, number>();
        const getMarkPrice = async (token: `0x${string}`) => {
          const cached = priceCache.get(token);
          if (cached !== undefined) return cached;
          const [minRaw, maxRaw] = await Promise.all([
            client.readContract({ address: FULCROM.vault, abi: VAULT_ABI, functionName: 'getMinPrice', args: [token] }),
            client.readContract({ address: FULCROM.vault, abi: VAULT_ABI, functionName: 'getMaxPrice', args: [token] }),
          ]);
          const mark = (price(minRaw) + price(maxRaw)) / 2;
          priceCache.set(token, mark);
          return mark;
        };

        for (let i = 0; i < metadata.length; i++) {
          const offset = i * 9;
          const sizeUsd = usd(rawPositions[offset] ?? 0n);
          if (sizeUsd <= 0) continue;

          const collateralUsd = usd(rawPositions[offset + 1] ?? 0n);
          const entryPrice = price(rawPositions[offset + 2] ?? 0n);
          const realisedPnlRaw = rawPositions[offset + 5] ?? 0n;
          const lastIncreasedTime = rawPositions[offset + 7] ?? 0n;
          const deltaUsd = usd(rawPositions[offset + 8] ?? 0n);
          const meta = metadata[i];
          const markPrice = await getMarkPrice(meta.indexAddress);
          const hasProfit = meta.side === 'Long' ? markPrice >= entryPrice : markPrice <= entryPrice;
          const unrealizedPnlUsd = hasProfit ? deltaUsd : -deltaUsd;
          const realisedPnlUsd = usd(realisedPnlRaw < 0n ? -realisedPnlRaw : realisedPnlRaw) * (realisedPnlRaw < 0n ? -1 : 1);
          const pnlUsd = unrealizedPnlUsd + realisedPnlUsd;
          const leverage = collateralUsd > 0 ? sizeUsd / collateralUsd : 0;
          const pnlPct = collateralUsd > 0 ? (pnlUsd / collateralUsd) * 100 : 0;
          const netValueUsd = collateralUsd + pnlUsd;
          const liquidationPrice = approximateLiquidationPrice({
            side: meta.side,
            entryPrice,
            collateralUsd,
            sizeUsd,
          });

          positions.push({
            platform: 'Fulcrom Finance',
            pair: `${meta.indexSymbol}/USD`,
            side: meta.side,
            leverage,
            netValueUsd,
            pnlUsd,
            pnlPct,
            sizeUsd,
            collateralUsd,
            netCollateralUsd: Math.max(0, netValueUsd),
            markPrice,
            entryPrice,
            liquidationPrice,
            openOrders: 0,
            indexSymbol: meta.indexSymbol,
            collateralSymbol: meta.collateralSymbol,
            source: 'live',
          });
        }

        const response: FulcromPositionsResponse = {
          address: validAddress,
          positions: positions.sort((a, b) => b.sizeUsd - a.sizeUsd),
          count: positions.length,
          source: 'fulcrom-reader-contract',
          timestamp: Date.now(),
          note: 'Liquidation prices are planning estimates derived from position collateral and size; verify on Fulcrom before trading.',
        };

        return response;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid address format' });
        }
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch Fulcrom positions' });
      }
    },
  });
};
