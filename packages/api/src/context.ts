import { prisma } from '@po/db';

export type TrpcContext = {
  tenantId: string;
  companyId: string;
  userId: string;
  roles: string[];
  db: typeof prisma;
};

export async function createContext(): Promise<TrpcContext> {
  const tenantCode = process.env.APP_TENANT_CODE ?? 'muster';
  const companyCode = process.env.APP_COMPANY_CODE ?? 'MUSTER-AG';
  const userEmail = process.env.APP_USER_EMAIL ?? 'admin@muster.ch';

  const tenant = await prisma.tenant.findUnique({
    where: { code: tenantCode },
    select: { id: true }
  });

  if (!tenant) {
    throw new Error(`Tenant not found for code '${tenantCode}'.`);
  }

  const company = await prisma.company.findUnique({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: companyCode
      }
    },
    select: { id: true }
  });

  if (!company) {
    throw new Error(`Company not found for code '${companyCode}'.`);
  }

  const user = await prisma.user.findUnique({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: userEmail
      }
    },
    select: { id: true }
  });

  if (!user) {
    throw new Error(`User not found for email '${userEmail}'.`);
  }

  return {
    tenantId: tenant.id,
    companyId: company.id,
    userId: user.id,
    roles: ['owner'],
    db: prisma
  };
}
