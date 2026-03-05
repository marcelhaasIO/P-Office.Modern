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

const addressIdInput = z.object({
  id: z.string().min(1)
});

const addressUpdateInput = z.object({
  id: z.string().min(1),
  firmName: z.string().min(1),
  street: z.string().min(1),
  zipCode: z.string().min(4).max(10),
  city: z.string().min(1),
  canton: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional()
});

const contactInput = z.object({
  addressId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.string().optional(),
  isPrimary: z.boolean().default(false)
});

export const avRouter = createRouter({
  getAddress: companyProcedure.input(addressIdInput).query(async ({ ctx, input }) => {
    const address = await ctx.db.address.findFirst({
      where: {
        id: input.id,
        companyId: ctx.companyId
      },
      include: {
        contacts: {
          orderBy: [{ isPrimary: 'desc' }, { lastName: 'asc' }, { firstName: 'asc' }]
        }
      }
    });

    if (!address) {
      return null;
    }

    return address;
  }),

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

  updateAddress: companyProcedure.input(addressUpdateInput).mutation(async ({ ctx, input }) => {
    const updated = await ctx.db.address.update({
      where: { id: input.id },
      data: {
        firmName: input.firmName,
        street: input.street,
        zipCode: input.zipCode,
        city: input.city,
        canton: input.canton,
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
        recordId: updated.id,
        action: 'UPDATE',
        newValues: updated,
        changedFields: ['firmName', 'street', 'zipCode', 'city', 'canton', 'email', 'phone']
      }
    });

    return updated;
  }),

  addContact: companyProcedure.input(contactInput).mutation(async ({ ctx, input }) => {
    const targetAddress = await ctx.db.address.findFirst({
      where: {
        id: input.addressId,
        companyId: ctx.companyId
      },
      select: { id: true }
    });

    if (!targetAddress) {
      throw new Error('Address not found for current company context.');
    }

    if (input.isPrimary) {
      await ctx.db.contactPerson.updateMany({
        where: { addressId: input.addressId, isPrimary: true },
        data: { isPrimary: false }
      });
    }

    const created = await ctx.db.contactPerson.create({
      data: {
        addressId: input.addressId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        role: input.role,
        isPrimary: input.isPrimary
      }
    });

    await ctx.db.auditLog.create({
      data: {
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.userId,
        tableName: 'ContactPerson',
        recordId: created.id,
        action: 'INSERT',
        newValues: created,
        changedFields: ['addressId', 'firstName', 'lastName', 'email', 'phone', 'role', 'isPrimary']
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
