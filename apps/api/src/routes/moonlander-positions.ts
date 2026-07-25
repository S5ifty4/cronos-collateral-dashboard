import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createPublicClient, formatUnits, http, parseAbi } from 'viem';
import { cronos } from 'viem/chains';
import type { FulcromPosition, FulcromPositionsResponse } from '@cronos-dash/shared';
import { config } from '../config.js';
import { fetchPrices } from '../adapters/index.js';

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

const MOONLANDER = {
  diamond: '0xE6F6351fb66f3a35313fEEFF9116698665FBEeC9',
} as const;

const PAIRS = [
  { symbol: 'CRO', pair: 'CRO/USD', base: '0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23' },
] as const;

const TOKEN_DECIMALS: Record<string, number> = {
  '0xc21223249ca28397b4b6541dffaecc539bff0c59': 6, // USDC
};

const TRADING_READER_ABI = parseAbi([
  'function positionsCount(address user, address pairBase) view returns (uint256)',
  'function positionsByPage(address user, address pairBase, uint256 offset, uint256 limit) view returns ((bytes32 positionHash,string pair,address pairBase,address marginToken,bool isLong,uint96 margin,uint128 qty,uint128 entryPrice,uint128 stopLoss,uint128 takeProfit,uint96 openFee,uint96 executionFee,int256 fundingFee,uint32 timestamp,uint96 holdingFee)[] page)',
]);

function tokenAmount(raw: bigint, decimals: number): number {
  return Number(formatUnits(raw, decimals));
}

function moonlanderPrice(raw: bigint): number {
  return Number(formatUnits(raw, 18));
}

function moonlanderQty(raw: bigint): number {
  return Number(formatUnits(raw, 10));
}

function signedTokenAmount(raw: bigint, decimals: number): number {
  return raw < 0n ? -Number(formatUnits(-raw, decimals)) : Number(formatUnits(raw, decimals));
}

function approximateLiquidationPrice(position: {
  side: 'Long' | 'Short';
  entryPrice: number;
  collateralUsd: number;
  sizeUsd: number;
}): number {
  if (position.entryPrice <= 0 || position.sizeUsd <= 0) return 0;
  const marginPct = position.collateralUsd / position.sizeUsd;
  return position.side === 'Long'
    ? position.entryPrice * Math.max(0, 1 - marginPct)
    : position.entryPrice * (1 + marginPct);
}

export const moonlanderPositionsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Querystring: { address: string };
  }>('/moonlander-positions', {
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
        const prices = await fetchPrices();
        const positions: FulcromPosition[] = [];

        for (const pairMeta of PAIRS) {
          const pairBase = pairMeta.base as `0x${string}`;
          const count = await client.readContract({
            address: MOONLANDER.diamond,
            abi: TRADING_READER_ABI,
            functionName: 'positionsCount',
            args: [validAddress, pairBase],
          });
          if (count <= 0n) continue;

          const page = await client.readContract({
            address: MOONLANDER.diamond,
            abi: TRADING_READER_ABI,
            functionName: 'positionsByPage',
            args: [validAddress, pairBase, 0n, count],
          });

          for (const raw of page) {
            const collateralDecimals = TOKEN_DECIMALS[raw.marginToken.toLowerCase()] ?? 18;
            const collateralUsd = tokenAmount(raw.margin, collateralDecimals);
            const openFeeUsd = tokenAmount(raw.openFee, collateralDecimals);
            const executionFeeUsd = tokenAmount(raw.executionFee, collateralDecimals);
            const fundingFeeUsd = signedTokenAmount(raw.fundingFee, collateralDecimals);
            const holdingFeeUsd = tokenAmount(raw.holdingFee, collateralDecimals);
            const sizeTokenAmount = moonlanderQty(raw.qty);
            const entryPrice = moonlanderPrice(raw.entryPrice);
            const markPrice = prices[pairMeta.symbol] || entryPrice;
            const side = raw.isLong ? 'Long' : 'Short';
            const sizeUsd = sizeTokenAmount * markPrice;
            const grossPnlUsd = (markPrice - entryPrice) * sizeTokenAmount * (raw.isLong ? 1 : -1);
            const feesUsd = openFeeUsd + executionFeeUsd + holdingFeeUsd + Math.abs(fundingFeeUsd);
            const pnlUsd = grossPnlUsd - feesUsd;
            const netValueUsd = collateralUsd + pnlUsd;
            const pnlPct = collateralUsd > 0 ? (pnlUsd / collateralUsd) * 100 : 0;
            const leverage = collateralUsd > 0 ? sizeUsd / collateralUsd : 0;
            const stopLossPrice = moonlanderPrice(raw.stopLoss);
            const takeProfitPrice = moonlanderPrice(raw.takeProfit);
            const takeProfitPnlPct = takeProfitPrice > 0 && collateralUsd > 0
              ? (((takeProfitPrice - entryPrice) * sizeTokenAmount * (raw.isLong ? 1 : -1)) / collateralUsd) * 100
              : undefined;

            positions.push({
              platform: 'Moonlander',
              pair: raw.pair || pairMeta.pair,
              side,
              leverage,
              netValueUsd,
              pnlUsd,
              pnlPct,
              sizeUsd,
              collateralUsd,
              netCollateralUsd: Math.max(0, netValueUsd),
              markPrice,
              entryPrice,
              liquidationPrice: approximateLiquidationPrice({ side, entryPrice, collateralUsd, sizeUsd }),
              openOrders: 0,
              indexSymbol: pairMeta.symbol,
              collateralSymbol: raw.marginToken.toLowerCase() === '0xc21223249ca28397b4b6541dffaecc539bff0c59' ? 'USDC.e' : 'Collateral',
              source: 'live',
              sizeTokenAmount,
              takeProfitPrice: takeProfitPrice || undefined,
              takeProfitPnlPct,
              stopLossPrice: stopLossPrice || undefined,
              feesUsd,
              note: 'Live Moonlander position from on-chain TradingReaderFacet; mark price uses the dashboard live CRO oracle.',
            });
          }
        }

        const response: FulcromPositionsResponse = {
          address: validAddress,
          positions: positions.sort((a, b) => b.sizeUsd - a.sizeUsd),
          count: positions.length,
          source: 'moonlander-trading-reader-contract',
          timestamp: Date.now(),
          note: 'Moonlander positions are read from the Moonlander contract; mark price uses the dashboard live CRO oracle.',
        };

        return response;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid address format' });
        }
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch Moonlander positions' });
      }
    },
  });
};
