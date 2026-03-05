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
    .query(async ({ ctx, input }) => {
      const query = input.query?.trim();

      const where = {
        companyId: ctx.companyId,
        ...(query
          ? {
              OR: [
                { firmName: { contains: query, mode: 'insensitive' as const } },
                { addressNo: { contains: query, mode: 'insensitive' as const } },
                { city: { contains: query, mode: 'insensitive' as const } }
              ]
            }
          : {})
      };

      const [items, total] = await Promise.all([
        ctx.db.address.findMany({
          where,
          orderBy: [{ updatedAt: 'desc' }],
          take: input.limit,
          select: {
            id: true,
            addressNo: true,
            firmName: true,
            city: true,
            zipCode: true,
            type: true
          }
        }),
        ctx.db.address.count({ where })
      ]);

      return {
        total,
        items,
        query: query ?? null
      };
    }),

  createAddress: companyProcedure.input(addressInput).mutation(async ({ ctx, input }) => {
    const created = await ctx.db.address.create({
      data: {
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        addressNo: input.addressNo,
        type: input.type,
        firmName: input.firmName,
        firstName: input.firstName,
        lastName: input.lastName,
        street: input.street,
        houseNo: input.houseNo,
        zipCode: input.zipCode,
        city: input.city,
        canton: input.canton,
        countryCode: input.countryCode,
        email: input.email,
        phone: input.phone
      },
      select: {
        id: true,
        addressNo: true,
        firmName: true,
        city: true,
        zipCode: true,
        type: true
      }
    });

    await ctx.db.auditLog.create({
      data: {
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.userId,
        tableName: 'Address',
        recordId: created.id,
        action: 'INSERT',
        newValues: created,
        changedFields: ['addressNo', 'firmName', 'city', 'zipCode', 'type']
      }
    });

    return created;
  }),

  plzAutocomplete: companyProcedure
    .input(z.object({ zipCode: z.string().min(2), limit: z.number().int().min(1).max(20).default(10) }))
    .query(async ({ ctx, input }) => {
      const suggestions = await ctx.db.plzDirectory.findMany({
        where: {
          zipCode: { startsWith: input.zipCode }
        },
        orderBy: [{ zipCode: 'asc' }, { city: 'asc' }],
        take: input.limit,
        select: {
          zipCode: true,
          city: true,
          canton: true
        }
      });

      return {
        zipCode: input.zipCode,
        suggestions
      };
    })
});
