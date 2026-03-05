import { PrismaClient, AddressType, CompanyStatus, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { code: 'muster' },
    update: { name: 'Muster Holding' },
    create: {
      code: 'muster',
      name: 'Muster Holding',
      status: CompanyStatus.ACTIVE
    }
  });

  const company = await prisma.company.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'MUSTER-AG' } },
    update: { name: 'Muster AG', currency: 'CHF' },
    create: {
      tenantId: tenant.id,
      code: 'MUSTER-AG',
      name: 'Muster AG',
      currency: 'CHF',
      status: CompanyStatus.ACTIVE,
      vatNumber: 'CHE-123.456.789 MWST',
      uidNumber: 'CHE-123.456.789'
    }
  });

  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@muster.ch' } },
    update: { firstName: 'Muster', lastName: 'Admin' },
    create: {
      tenantId: tenant.id,
      email: 'admin@muster.ch',
      firstName: 'Muster',
      lastName: 'Admin',
      status: UserStatus.ACTIVE
    }
  });

  await prisma.userCompany.upsert({
    where: { userId_companyId: { userId: admin.id, companyId: company.id } },
    update: { isDefault: true },
    create: { userId: admin.id, companyId: company.id, isDefault: true }
  });

  const ownerRole = await prisma.role.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'owner' } },
    update: { name: 'Owner' },
    create: { tenantId: tenant.id, code: 'owner', name: 'Owner' }
  });

  const permissions = [
    ['av.read', 'Read addresses'],
    ['av.write', 'Write addresses'],
    ['foundation.search', 'Use global search'],
    ['foundation.switchCompany', 'Switch active company'],
    ['settings.manage', 'Manage company settings']
  ] as const;

  for (const [code, description] of permissions) {
    const permission = await prisma.permission.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code } },
      update: { description },
      create: { tenantId: tenant.id, code, description }
    });

    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: ownerRole.id, permissionId: permission.id }
    });
  }

  await prisma.userRole.upsert({
    where: { userId_roleId_companyId: { userId: admin.id, roleId: ownerRole.id, companyId: company.id } },
    update: {},
    create: { userId: admin.id, roleId: ownerRole.id, companyId: company.id }
  });

  await prisma.address.upsert({
    where: { companyId_addressNo: { companyId: company.id, addressNo: 'A-10000' } },
    update: {},
    create: {
      tenantId: tenant.id,
      companyId: company.id,
      addressNo: 'A-10000',
      type: AddressType.CUSTOMER,
      firmName: 'Bauherr Beispiel AG',
      street: 'Bahnhofstrasse',
      houseNo: '10',
      zipCode: '8001',
      city: 'Zürich',
      canton: 'ZH',
      countryCode: 'CH',
      email: 'info@bauherr-beispiel.ch'
    }
  });

  const customerAddress = await prisma.address.findFirstOrThrow({
    where: { companyId: company.id, addressNo: 'A-10000' }
  });

  const existingContact = await prisma.contactPerson.findFirst({
    where: { addressId: customerAddress.id, email: 'einkauf@bauherr-beispiel.ch' }
  });

  if (!existingContact) {
    await prisma.contactPerson.create({
      data: {
        addressId: customerAddress.id,
        firstName: 'Anna',
        lastName: 'Bau',
        role: 'Einkauf',
        email: 'einkauf@bauherr-beispiel.ch',
        isPrimary: true
      }
    });
  }

  await prisma.numberSequence.upsert({
    where: { companyId_key_year: { companyId: company.id, key: 'AB.OFFER', year: 2026 } },
    update: {},
    create: {
      companyId: company.id,
      key: 'AB.OFFER',
      prefix: 'OF-2026-',
      year: 2026,
      lastNumber: 1000,
      padding: 6
    }
  });

  const fy2026 = await prisma.fiscalYear.upsert({
    where: { companyId_year: { companyId: company.id, year: 2026 } },
    update: {},
    create: {
      companyId: company.id,
      year: 2026,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T23:59:59.999Z')
    }
  });

  for (let periodNo = 1; periodNo <= 12; periodNo += 1) {
    const start = new Date(Date.UTC(2026, periodNo - 1, 1));
    const end = new Date(Date.UTC(2026, periodNo, 0, 23, 59, 59, 999));

    await prisma.fiscalPeriod.upsert({
      where: { fiscalYearId_periodNo: { fiscalYearId: fy2026.id, periodNo } },
      update: {},
      create: {
        fiscalYearId: fy2026.id,
        periodNo,
        startDate: start,
        endDate: end
      }
    });
  }

  const accounts = [
    ['1020', 'Bank', 'ASSET', false],
    ['1100', 'Debitoren', 'ASSET', false],
    ['1170', 'Vorsteuer', 'ASSET', true],
    ['1400', 'Vorräte', 'ASSET', false],
    ['2000', 'Kreditoren', 'LIABILITY', false],
    ['2201', 'Geschuldete MWST', 'LIABILITY', true],
    ['3200', 'Erlöse', 'REVENUE', false],
    ['5200', 'Lohnaufwand', 'EXPENSE', false],
    ['6800', 'Abschreibungen', 'EXPENSE', false]
  ] as const;

  for (const [accountNo, name, type, vatRelevant] of accounts) {
    await prisma.account.upsert({
      where: { companyId_accountNo: { companyId: company.id, accountNo } },
      update: { name, type, vatRelevant },
      create: {
        companyId: company.id,
        accountNo,
        name,
        type,
        vatRelevant
      }
    });
  }

  await prisma.vatCode.upsert({
    where: { companyId_code_activeFrom: { companyId: company.id, code: 'N81', activeFrom: new Date('2024-01-01T00:00:00.000Z') } },
    update: {},
    create: {
      companyId: company.id,
      code: 'N81',
      ratePct: 8.1,
      method: 'AGREED',
      inputAccountNo: '1170',
      outputAccountNo: '2201',
      activeFrom: new Date('2024-01-01T00:00:00.000Z')
    }
  });

  const plzRows = [
    ['8001', 'Zürich', 'ZH'],
    ['3001', 'Bern', 'BE'],
    ['6003', 'Luzern', 'LU'],
    ['4001', 'Basel', 'BS']
  ] as const;

  for (const [zipCode, city, canton] of plzRows) {
    await prisma.plzDirectory.upsert({
      where: { zipCode_city_countryCode: { zipCode, city, countryCode: 'CH' } },
      update: { canton },
      create: { zipCode, city, canton, countryCode: 'CH' }
    });
  }

  const existingLayout = await prisma.printLayout.findFirst({
    where: {
      tenantId: tenant.id,
      companyId: company.id,
      moduleCode: 'AB',
      documentType: 'OFFER',
      name: 'Standard Offerte'
    }
  });

  const layout =
    existingLayout ??
    (await prisma.printLayout.create({
      data: {
        tenantId: tenant.id,
        companyId: company.id,
        moduleCode: 'AB',
        documentType: 'OFFER',
        name: 'Standard Offerte',
        isDefault: true
      }
    }));

  await prisma.printLayoutVersion.upsert({
    where: { layoutId_versionNo: { layoutId: layout.id, versionNo: 1 } },
    update: {},
    create: {
      layoutId: layout.id,
      versionNo: 1,
      schemaJson: { version: 1, page: 'A4', elements: [] },
      rendererJson: { engine: 'react-pdf' },
      isPublished: true,
      checksumSha256: 'seed-v1'
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      companyId: company.id,
      actorUserId: admin.id,
      tableName: 'Seed',
      recordId: 'phase1',
      action: 'SEED_APPLIED',
      newValues: { companyCode: company.code },
      changedFields: ['tenant', 'company', 'admin', 'address', 'fiscal', 'accounts', 'vat', 'permissions']
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
