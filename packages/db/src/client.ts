import { PrismaClient } from '@prisma/client';

declare global {
  var __po_prisma__: PrismaClient | undefined;
}

export const prisma = globalThis.__po_prisma__ ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__po_prisma__ = prisma;
}
