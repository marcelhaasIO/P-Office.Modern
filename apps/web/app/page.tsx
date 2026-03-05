import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { appRouter, createContext } from '@po/api';

export const dynamic = 'force-dynamic';

async function getCaller() {
  const ctx = await createContext();
  return appRouter.createCaller(ctx);
}

async function createAddressAction(formData: FormData) {
  'use server';

  const addressNo = String(formData.get('addressNo') ?? '').trim();
  const firmName = String(formData.get('firmName') ?? '').trim();
  const street = String(formData.get('street') ?? '').trim();
  const zipCode = String(formData.get('zipCode') ?? '').trim();
  const city = String(formData.get('city') ?? '').trim();

  if (!addressNo || !firmName || !street || !zipCode || !city) {
    throw new Error('Missing required fields for address creation.');
  }

  const caller = await getCaller();

  await caller.av.createAddress({
    addressNo,
    type: 'CUSTOMER',
    firmName,
    street,
    zipCode,
    city,
    countryCode: 'CH'
  });

  revalidatePath('/');
}

export default async function HomePage() {
  let health:
    | {
        ok: boolean;
        tenantId: string;
        companyId: string;
        at: string;
        stats: { addressCount: number; userCount: number };
      }
    | null = null;
  let addresses:
    | {
        total: number;
        items: Array<{
          id: string;
          addressNo: string;
          firmName: string;
          city: string;
          zipCode: string;
          type: string;
        }>;
        query: string | null;
      }
    | null = null;
  let errorMessage: string | null = null;

  try {
    const caller = await getCaller();
    [health, addresses] = await Promise.all([
      caller.foundation.health(),
      caller.av.listAddresses({ limit: 10 })
    ]);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
  }

  return (
    <main>
      <section className="container">
        <h1>P-Office Modern</h1>
        {errorMessage ? (
          <p>Initialization pending: {errorMessage}</p>
        ) : (
          <>
            <p>
              Health: {health?.ok ? 'OK' : 'FAIL'} · Company: {health?.companyId}
            </p>
            <p>Addresses in DB: {health?.stats.addressCount ?? 0}</p>
          </>
        )}

        <h2>Create AV Address</h2>
        <form action={createAddressAction} style={{ display: 'grid', gap: '0.6rem', marginBottom: '1rem' }}>
          <input name="addressNo" placeholder="Address No (e.g. A-10001)" required />
          <input name="firmName" placeholder="Firma" required />
          <input name="street" placeholder="Strasse" required />
          <input name="zipCode" placeholder="PLZ" required />
          <input name="city" placeholder="Ort" required />
          <button type="submit">Save Address</button>
        </form>

        <h2>Latest Addresses</h2>
        <ul>
          {(addresses?.items ?? []).map((item) => (
            <li key={item.id}>
              <Link href={`/av/addresses/${item.id}`}>
                {item.addressNo} — {item.firmName} ({item.zipCode} {item.city})
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
