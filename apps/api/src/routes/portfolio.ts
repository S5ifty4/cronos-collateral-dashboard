import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { UnifiedPortfolio } from '@cronos-dash/shared';
import { fetchTectonicPortfolio, fetchPrices } from '../adapters/tectonic.js';

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

export const portfolioRoutes: FastifyPluginAsync = async (fastify) => {
  // Prices endpoint for demo mode
  fastify.get('/prices', {
    handler: async () => {
      const prices = await fetchPrices();
      return { prices, timestamp: Date.now() };
    },
  });

  fastify.get<{
    Querystring: { address: string };
  }>('/portfolio', {
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
        // Validate address
        const validAddress = addressSchema.parse(address);

        // Fetch current prices
        const prices = await fetchPrices();

        // Fetch portfolio from Tectonic
        const tectonicSnapshot = await fetchTectonicPortfolio(
          validAddress,
          prices
        );

        // Build unified portfolio (MVP: just Tectonic)
        const portfolio: UnifiedPortfolio = {
          address: validAddress,
          snapshots: [tectonicSnapshot],
          unified: {
            totalCollateralUsd: tectonicSnapshot.totals.collateralUsd,
            totalBorrowUsd: tectonicSnapshot.totals.borrowUsd,
            totalWeightedCollateralUsd: tectonicSnapshot.totals.weightedCollateralUsd,
            healthFactor: tectonicSnapshot.risk.healthFactor,
          },
          prices,
          timestamp: Date.now(),
        };

        return portfolio;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid address format' });
        }
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch portfolio' });
      }
    },
  });
};
