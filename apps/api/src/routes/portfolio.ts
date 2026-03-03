import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { UnifiedPortfolio, ProtocolSnapshot } from '@cronos-dash/shared';
import { adapters, fetchPrices, fetchOraclePrices } from '../adapters/index.js';

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

export const portfolioRoutes: FastifyPluginAsync = async (fastify) => {
  // Prices endpoint — returns oracle prices merged with CoinGecko fallbacks
  fastify.get('/prices', {
    handler: async () => {
      const [cg, oracle] = await Promise.all([fetchPrices(), fetchOraclePrices()]);
      const prices = { ...cg, ...oracle }; // oracle overrides CoinGecko
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
        const validAddress = addressSchema.parse(address);
        const prices = await fetchPrices();

        // Run all adapters in parallel; failed adapters are skipped
        const results = await Promise.allSettled(
          adapters.map((adapter) => adapter.fetchPortfolio(validAddress, prices))
        );

        const snapshots: ProtocolSnapshot[] = [];
        // Merge effective prices from all adapters (oracle prices override CoinGecko)
        let effectivePrices: Record<string, number> = { ...prices };
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          if (result.status === 'fulfilled') {
            snapshots.push(result.value.snapshot);
            // Later adapters' oracle prices merge in (last write wins per symbol)
            effectivePrices = { ...effectivePrices, ...result.value.effectivePrices };
          } else {
            fastify.log.error(
              { adapter: adapters[i].name, err: result.reason },
              'Adapter failed — skipping'
            );
          }
        }

        // Unified totals = sum across all protocol snapshots
        const totalCollateralUsd = snapshots.reduce((s, p) => s + p.totals.collateralUsd, 0);
        const totalBorrowUsd = snapshots.reduce((s, p) => s + p.totals.borrowUsd, 0);
        const totalWeightedCollateralUsd = snapshots.reduce(
          (s, p) => s + p.totals.weightedCollateralUsd,
          0
        );
        const healthFactor =
          totalBorrowUsd === 0
            ? Infinity
            : totalWeightedCollateralUsd / totalBorrowUsd;

        const portfolio: UnifiedPortfolio = {
          address: validAddress,
          snapshots,
          unified: {
            totalCollateralUsd,
            totalBorrowUsd,
            totalWeightedCollateralUsd,
            healthFactor,
          },
          // Use oracle prices (from adapters) so frontend display is consistent
          // with the calculations — same prices shown in simulator & KPI cards
          prices: effectivePrices,
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
