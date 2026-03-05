import { z } from 'zod';
import { createRouter, companyProcedure } from '../trpc';

const allowedAddressTypes = new Set(['CUSTOMER', 'SUPPLIER', 'EMPLOYEE', 'LEAD', 'PARTNER', 'OTHER']);

const defaultCsvHeaders = ['addressNo', 'firmName', 'street', 'zipCode', 'city', 'type', 'email', 'phone'];

function parseCsvLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function normalizeHeader(header: string) {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function mapHeaderToField(header: string) {
  const normalized = normalizeHeader(header);

  if (['addressno', 'nummer', 'adrnr', 'adresseno'].includes(normalized)) return 'addressNo';
  if (['firmname', 'firma', 'name', 'company'].includes(normalized)) return 'firmName';
  if (['street', 'strasse', 'strase', 'adresse'].includes(normalized)) return 'street';
  if (['zipcode', 'plz', 'zip'].includes(normalized)) return 'zipCode';
  if (['city', 'ort'].includes(normalized)) return 'city';
  if (['type', 'typ', 'art'].includes(normalized)) return 'type';
  if (['email', 'mail', 'e-mail'].includes(normalized)) return 'email';
  if (['phone', 'telefon', 'tel'].includes(normalized)) return 'phone';

  return null;
}

type ParsedAddressCsvRow = {
  lineNo: number;
  addressNo: string;
  firmName: string;
  street: string;
  zipCode: string;
  city: string;
  type: string;
  email?: string;
  phone?: string;
  errors: string[];
};

function parseAddressCsv(csv: string, delimiter: string) {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return {
      rows: [] as ParsedAddressCsvRow[],
      hasHeader: false
    };
  }

  const firstLineCells = parseCsvLine(lines[0], delimiter);
  const mappedHeaders = firstLineCells.map((header) => mapHeaderToField(header));
  const hasHeader = mappedHeaders.includes('addressNo') || mappedHeaders.includes('firmName');

  const headers = hasHeader
    ? mappedHeaders.map((header, index) => header ?? defaultCsvHeaders[index] ?? null)
    : defaultCsvHeaders;

  const startIndex = hasHeader ? 1 : 0;
  const rows: ParsedAddressCsvRow[] = [];

  for (let index = startIndex; index < lines.length; index += 1) {
    const cells = parseCsvLine(lines[index], delimiter);
    const mapped: Record<string, string> = {};

    headers.forEach((header, cellIndex) => {
      if (!header) return;
      mapped[header] = cells[cellIndex]?.trim() ?? '';
    });

    const rawType = (mapped.type ?? 'CUSTOMER').toUpperCase();
    const row: ParsedAddressCsvRow = {
      lineNo: index + 1,
      addressNo: mapped.addressNo ?? '',
      firmName: mapped.firmName ?? '',
      street: mapped.street ?? '',
      zipCode: mapped.zipCode ?? '',
      city: mapped.city ?? '',
      type: rawType || 'CUSTOMER',
      email: mapped.email || undefined,
      phone: mapped.phone || undefined,
      errors: []
    };

    if (!row.addressNo) row.errors.push('Address number is required');
    if (!row.firmName) row.errors.push('Firm name is required');
    if (!row.street) row.errors.push('Street is required');
    if (!row.zipCode || row.zipCode.length < 4) row.errors.push('ZIP code must have at least 4 chars');
    if (!row.city) row.errors.push('City is required');
    if (!allowedAddressTypes.has(row.type)) row.errors.push(`Invalid type: ${row.type}`);

    rows.push(row);
  }

  return {
    rows,
    hasHeader
  };
}

function buildAuditSummary(log: {
  tableName: string;
  action: string;
  recordId: string;
  newValues: unknown;
  changedFields: string[];
}) {
  if (log.tableName === 'Address') {
    const values = (log.newValues ?? {}) as { firmName?: string; addressNo?: string };
    const firmName = values.firmName ?? 'Address';
    const addressNo = values.addressNo ? ` (${values.addressNo})` : '';
    return `${log.action} ${firmName}${addressNo}`;
  }

  if (log.tableName === 'ContactPerson') {
    const values = (log.newValues ?? {}) as { firstName?: string; lastName?: string };
    const fullName = [values.firstName, values.lastName].filter(Boolean).join(' ').trim();
    const label = fullName || log.recordId;
    return `${log.action} contact ${label}`;
  }

  return `${log.action} ${log.tableName}`;
}

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

const contactUpdateInput = z.object({
  id: z.string().min(1),
  addressId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.string().optional(),
  isPrimary: z.boolean().default(false)
});

const contactDeleteInput = z.object({
  id: z.string().min(1),
  addressId: z.string().min(1)
});

const setPrimaryContactInput = z.object({
  id: z.string().min(1),
  addressId: z.string().min(1)
});

const timelineInput = z.object({
  id: z.string().min(1),
  limit: z.number().int().min(1).max(100).default(25)
});

const csvImportInput = z.object({
  csv: z.string().min(1),
  delimiter: z.enum([';', ',', '\t']).default(';')
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

  getAddressTimeline: companyProcedure.input(timelineInput).query(async ({ ctx, input }) => {
    const address = await ctx.db.address.findFirst({
      where: {
        id: input.id,
        companyId: ctx.companyId
      },
      select: { id: true }
    });

    if (!address) {
      throw new Error('Address not found for current company context.');
    }

    const contacts = await ctx.db.contactPerson.findMany({
      where: { addressId: input.id },
      select: { id: true }
    });
    const contactIds = new Set(contacts.map((contact) => contact.id));

    const logs = await ctx.db.auditLog.findMany({
      where: {
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        tableName: { in: ['Address', 'ContactPerson'] }
      },
      orderBy: [{ createdAt: 'desc' }],
      take: Math.min(input.limit * 5, 300),
      select: {
        id: true,
        tableName: true,
        recordId: true,
        action: true,
        newValues: true,
        oldValues: true,
        changedFields: true,
        createdAt: true
      }
    });

    const filtered = logs
      .filter((log) => {
        if (log.tableName === 'Address') {
          return log.recordId === input.id;
        }

        if (log.tableName === 'ContactPerson') {
          const newAddressId = ((log.newValues ?? {}) as { addressId?: string }).addressId;
          const oldAddressId = ((log.oldValues ?? {}) as { addressId?: string }).addressId;
          return contactIds.has(log.recordId) || newAddressId === input.id || oldAddressId === input.id;
        }

        return false;
      })
      .slice(0, input.limit)
      .map((log) => ({
        id: log.id,
        tableName: log.tableName,
        recordId: log.recordId,
        action: log.action,
        changedFields: log.changedFields,
        createdAt: log.createdAt,
        summary: buildAuditSummary(log)
      }));

    return {
      addressId: input.id,
      items: filtered
    };
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

  previewAddressCsvImport: companyProcedure.input(csvImportInput).query(async ({ input }) => {
    const parsed = parseAddressCsv(input.csv, input.delimiter);
    const valid = parsed.rows.filter((row) => row.errors.length === 0).length;
    const invalid = parsed.rows.length - valid;

    return {
      hasHeader: parsed.hasHeader,
      totalRows: parsed.rows.length,
      validRows: valid,
      invalidRows: invalid,
      rows: parsed.rows.map((row) => ({
        lineNo: row.lineNo,
        addressNo: row.addressNo,
        firmName: row.firmName,
        street: row.street,
        zipCode: row.zipCode,
        city: row.city,
        type: row.type,
        status: row.errors.length === 0 ? 'READY' : 'ERROR',
        error: row.errors.join('; ') || null
      }))
    };
  }),

  importAddressCsv: companyProcedure.input(csvImportInput).mutation(async ({ ctx, input }) => {
    const parsed = parseAddressCsv(input.csv, input.delimiter);
    let created = 0;
    let skipped = 0;
    let failed = 0;

    const issues: Array<{ lineNo: number; addressNo: string; message: string }> = [];

    for (const row of parsed.rows) {
      if (row.errors.length > 0) {
        failed += 1;
        issues.push({
          lineNo: row.lineNo,
          addressNo: row.addressNo,
          message: row.errors.join('; ')
        });
        continue;
      }

      const exists = await ctx.db.address.findFirst({
        where: {
          companyId: ctx.companyId,
          addressNo: row.addressNo
        },
        select: { id: true }
      });

      if (exists) {
        skipped += 1;
        issues.push({
          lineNo: row.lineNo,
          addressNo: row.addressNo,
          message: 'Duplicate address number in company context'
        });
        continue;
      }

      const createdAddress = await ctx.db.address.create({
        data: {
          tenantId: ctx.tenantId,
          companyId: ctx.companyId,
          addressNo: row.addressNo,
          type: row.type as 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE' | 'LEAD' | 'PARTNER' | 'OTHER',
          firmName: row.firmName,
          street: row.street,
          zipCode: row.zipCode,
          city: row.city,
          countryCode: 'CH',
          email: row.email,
          phone: row.phone
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

      created += 1;

      await ctx.db.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          companyId: ctx.companyId,
          actorUserId: ctx.userId,
          tableName: 'Address',
          recordId: createdAddress.id,
          action: 'IMPORT',
          newValues: createdAddress,
          changedFields: ['addressNo', 'firmName', 'city', 'zipCode', 'type']
        }
      });
    }

    return {
      totalRows: parsed.rows.length,
      created,
      skipped,
      failed,
      issues
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

  updateContact: companyProcedure.input(contactUpdateInput).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.contactPerson.findFirst({
      where: {
        id: input.id,
        addressId: input.addressId,
        address: {
          companyId: ctx.companyId
        }
      },
      select: { id: true }
    });

    if (!existing) {
      throw new Error('Contact not found for current company context.');
    }

    if (input.isPrimary) {
      await ctx.db.contactPerson.updateMany({
        where: {
          addressId: input.addressId,
          isPrimary: true,
          id: { not: input.id }
        },
        data: { isPrimary: false }
      });
    }

    const updated = await ctx.db.contactPerson.update({
      where: { id: input.id },
      data: {
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
        recordId: updated.id,
        action: 'UPDATE',
        newValues: updated,
        changedFields: ['firstName', 'lastName', 'email', 'phone', 'role', 'isPrimary']
      }
    });

    return updated;
  }),

  setPrimaryContact: companyProcedure.input(setPrimaryContactInput).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.contactPerson.findFirst({
      where: {
        id: input.id,
        addressId: input.addressId,
        address: {
          companyId: ctx.companyId
        }
      },
      select: { id: true }
    });

    if (!existing) {
      throw new Error('Contact not found for current company context.');
    }

    await ctx.db.contactPerson.updateMany({
      where: {
        addressId: input.addressId,
        isPrimary: true,
        id: { not: input.id }
      },
      data: { isPrimary: false }
    });

    const updated = await ctx.db.contactPerson.update({
      where: { id: input.id },
      data: { isPrimary: true }
    });

    await ctx.db.auditLog.create({
      data: {
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.userId,
        tableName: 'ContactPerson',
        recordId: updated.id,
        action: 'UPDATE',
        newValues: updated,
        changedFields: ['isPrimary']
      }
    });

    return updated;
  }),

  deleteContact: companyProcedure.input(contactDeleteInput).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.contactPerson.findFirst({
      where: {
        id: input.id,
        addressId: input.addressId,
        address: {
          companyId: ctx.companyId
        }
      },
      select: { id: true }
    });

    if (!existing) {
      throw new Error('Contact not found for current company context.');
    }

    await ctx.db.contactPerson.delete({
      where: { id: input.id }
    });

    await ctx.db.auditLog.create({
      data: {
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.userId,
        tableName: 'ContactPerson',
        recordId: input.id,
        action: 'DELETE',
        changedFields: ['id']
      }
    });

    return { deleted: true, id: input.id };
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
