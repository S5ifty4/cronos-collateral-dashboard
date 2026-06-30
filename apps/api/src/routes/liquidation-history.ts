import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { LiquidationHistoryResponse } from '@cronos-dash/shared';

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

const TECTONIC_SUBGRAPH_URL = 'https://graph-v2.cronoslabs.com/subgraphs/name/tectonic/tectonic-main';
const TECTONIC_LIQUIDATION_INCENTIVE = 1.1;

type SubgraphLiquidationEvent = {
  id: string;
  amount: string;
  to: string;
  from: string;
  blockNumber: number;
  blockTime: number;
  tTokenSymbol: string;
  underlyingSymbol: string;
  underlyingRepayAmount: string;
};

type SubgraphMarket = {
  symbol: string;
  underlyingSymbol: string;
  exchangeRate: string;
};

function toNumber(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function collateralSymbolFromTToken(tTokenSymbol: string): string {
  return tTokenSymbol.replace(/^t/i, '');
}

export const liquidationHistoryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Querystring: { address: string };
  }>('/liquidation-history', {
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
        const validAddress = addressSchema.parse(address).toLowerCase();
        const query = `
          query LiquidationHistory($address: String!) {
            liquidationEvents(first: 1000, orderBy: blockNumber, orderDirection: desc, where: { from: $address }) {
              id
              amount
              to
              from
              blockNumber
              blockTime
              tTokenSymbol
              underlyingSymbol
              underlyingRepayAmount
            }
            markets(first: 1000) {
              symbol
              underlyingSymbol
              exchangeRate
            }
          }
        `;

        const response = await fetch(TECTONIC_SUBGRAPH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, variables: { address: validAddress } }),
        });

        if (!response.ok) {
          fastify.log.error({ status: response.status }, 'Tectonic subgraph liquidation history request failed');
          return reply.status(502).send({ error: 'Failed to fetch liquidation history' });
        }

        const payload = await response.json() as {
          data?: { liquidationEvents?: SubgraphLiquidationEvent[]; markets?: SubgraphMarket[] };
          errors?: unknown[];
        };

        if (payload.errors?.length) {
          fastify.log.error({ errors: payload.errors }, 'Tectonic subgraph returned errors');
          return reply.status(502).send({ error: 'Tectonic subgraph returned an error' });
        }

        const marketsBySymbol = new Map(
          (payload.data?.markets || []).map((market) => [market.symbol, market])
        );

        const events = (payload.data?.liquidationEvents || []).map((event) => {
          const seizedTTokenAmount = toNumber(event.amount);
          const debtRepaidAmount = toNumber(event.underlyingRepayAmount);
          const market = marketsBySymbol.get(event.tTokenSymbol);
          const exchangeRate = toNumber(market?.exchangeRate);
          const estimatedCollateralAmount = exchangeRate > 0
            ? seizedTTokenAmount * exchangeRate
            : undefined;
          const collateralSymbol = market?.underlyingSymbol || collateralSymbolFromTToken(event.tTokenSymbol);
          const impliedCollateralPriceUsd = estimatedCollateralAmount && estimatedCollateralAmount > 0
            ? (debtRepaidAmount * TECTONIC_LIQUIDATION_INCENTIVE) / estimatedCollateralAmount
            : undefined;
          const penaltyUsd = debtRepaidAmount * (TECTONIC_LIQUIDATION_INCENTIVE - 1);
          const penaltyCollateralAmount = impliedCollateralPriceUsd && impliedCollateralPriceUsd > 0
            ? penaltyUsd / impliedCollateralPriceUsd
            : undefined;

          return {
            id: event.id,
            txHash: event.id.split('-')[0],
            blockNumber: event.blockNumber,
            blockTime: event.blockTime,
            isoTime: new Date(event.blockTime * 1000).toISOString(),
            borrower: event.from,
            liquidator: event.to,
            tTokenSymbol: event.tTokenSymbol,
            collateralSymbol,
            seizedTTokenAmount,
            estimatedCollateralAmount,
            debtSymbol: event.underlyingSymbol,
            debtRepaidAmount,
            impliedCollateralPriceUsd,
            penaltyUsd,
            penaltyCollateralAmount,
          };
        });

        const result: LiquidationHistoryResponse = {
          address: validAddress,
          events,
          count: events.length,
          source: 'tectonic-subgraph-on-demand',
          note: 'Collateral amounts are estimated from the subgraph market exchange rate available at query time. Exact historical CRO values require block-specific tToken exchange rates.',
        };

        return result;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid address format' });
        }
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch liquidation history' });
      }
    },
  });
};
