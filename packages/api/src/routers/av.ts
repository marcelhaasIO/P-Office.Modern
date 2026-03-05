import { z } from 'zod';
import { createRouter, companyProcedure } from '../trpc';

const addressInput = z.object({
  addressNo: z.string().min(1),
  type: z.enum(['CUSTOMER', 'SUPPLIER', 'EMPLOYEE', 'LEAD', 'PARTNER', 'OTHER']),
  firmName: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  street: z.string().min(1),
  houseNo: z.string().optional(),
  zipCode: z.string().min(4).max(10),
  city: z.string().min(1),
  canton: z.string().optional(),
  countryCode: z.string().length(2).default('CH'),
  email: z.string().email().optional(),
  phone: z.string().optional()
});

export const avRouter = createRouter({
  listAddresses: companyProcedure
    .input(
      z.object({
        query: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(25)
      })
    )
    .query(({ input }) => ({
      total: 0,
      items: [] as Array<{ id: string; addressNo: string; firmName: string; city: string }>,
      query: input.query ?? null
    })),

  createAddress: companyProcedure.input(addressInput).mutation(({ ctx, input }) => ({
    id: `addr_${input.addressNo}`,
    companyId: ctx.companyId,
    ...input
  })),

  plzAutocomplete: companyProcedure
    .input(z.object({ zipCode: z.string().min(2), limit: z.number().int().min(1).max(20).default(10) }))
    .query(({ input }) => ({
      zipCode: input.zipCode,
      suggestions: [] as Array<{ zipCode: string; city: string; canton: string }>
    }))
});
