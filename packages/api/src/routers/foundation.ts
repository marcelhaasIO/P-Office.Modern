import { z } from 'zod';
import { createRouter, companyProcedure } from '../trpc';

const switchCompanyInput = z.object({
  companyId: z.string().min(1)
});

export const foundationRouter = createRouter({
  health: companyProcedure.query(({ ctx }) => ({
    ok: true,
    tenantId: ctx.tenantId,
    companyId: ctx.companyId,
    at: new Date().toISOString()
  })),

  switchCompany: companyProcedure.input(switchCompanyInput).mutation(({ input }) => ({
    switched: true,
    companyId: input.companyId
  })),

  globalSearch: companyProcedure
    .input(
      z.object({
        query: z.string().min(2),
        limit: z.number().int().min(1).max(50).default(20)
      })
    )
    .query(({ input }) => ({
      query: input.query,
      results: [] as Array<{ entity: string; id: string; label: string; href: string }>
    }))
});
