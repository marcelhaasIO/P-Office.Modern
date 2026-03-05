import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { appRouter, createContext } from '@po/api';

export const dynamic = 'force-dynamic';

async function getCaller() {
  const ctx = await createContext();
  return appRouter.createCaller(ctx);
}

async function updateAddressAction(formData: FormData) {
  'use server';

  const id = String(formData.get('id') ?? '').trim();
  const firmName = String(formData.get('firmName') ?? '').trim();
  const street = String(formData.get('street') ?? '').trim();
  const zipCode = String(formData.get('zipCode') ?? '').trim();
  const city = String(formData.get('city') ?? '').trim();

  if (!id || !firmName || !street || !zipCode || !city) {
    throw new Error('Missing required fields for address update.');
  }

  const caller = await getCaller();

  await caller.av.updateAddress({
    id,
    firmName,
    street,
    zipCode,
    city,
    canton: String(formData.get('canton') ?? '').trim() || undefined,
    email: String(formData.get('email') ?? '').trim() || undefined,
    phone: String(formData.get('phone') ?? '').trim() || undefined
  });

  revalidatePath(`/av/addresses/${id}`);
  revalidatePath('/');
}

async function createContactAction(formData: FormData) {
  'use server';

  const addressId = String(formData.get('addressId') ?? '').trim();
  const firstName = String(formData.get('firstName') ?? '').trim();
  const lastName = String(formData.get('lastName') ?? '').trim();

  if (!addressId || !firstName || !lastName) {
    throw new Error('Missing required fields for contact creation.');
  }

  const caller = await getCaller();

  await caller.av.addContact({
    addressId,
    firstName,
    lastName,
    email: String(formData.get('email') ?? '').trim() || undefined,
    phone: String(formData.get('phone') ?? '').trim() || undefined,
    role: String(formData.get('role') ?? '').trim() || undefined,
    isPrimary: String(formData.get('isPrimary') ?? '') === 'on'
  });

  revalidatePath(`/av/addresses/${addressId}`);
}

async function updateContactAction(formData: FormData) {
  'use server';

  const id = String(formData.get('id') ?? '').trim();
  const addressId = String(formData.get('addressId') ?? '').trim();
  const firstName = String(formData.get('firstName') ?? '').trim();
  const lastName = String(formData.get('lastName') ?? '').trim();

  if (!id || !addressId || !firstName || !lastName) {
    throw new Error('Missing required fields for contact update.');
  }

  const caller = await getCaller();

  await caller.av.updateContact({
    id,
    addressId,
    firstName,
    lastName,
    email: String(formData.get('email') ?? '').trim() || undefined,
    phone: String(formData.get('phone') ?? '').trim() || undefined,
    role: String(formData.get('role') ?? '').trim() || undefined,
    isPrimary: String(formData.get('isPrimary') ?? '') === 'on'
  });

  revalidatePath(`/av/addresses/${addressId}`);
}

async function setPrimaryContactAction(formData: FormData) {
  'use server';

  const id = String(formData.get('id') ?? '').trim();
  const addressId = String(formData.get('addressId') ?? '').trim();

  if (!id || !addressId) {
    throw new Error('Missing required fields for set primary.');
  }

  const caller = await getCaller();
  await caller.av.setPrimaryContact({ id, addressId });

  revalidatePath(`/av/addresses/${addressId}`);
}

async function deleteContactAction(formData: FormData) {
  'use server';

  const id = String(formData.get('id') ?? '').trim();
  const addressId = String(formData.get('addressId') ?? '').trim();

  if (!id || !addressId) {
    throw new Error('Missing required fields for contact deletion.');
  }

  const caller = await getCaller();
  await caller.av.deleteContact({ id, addressId });

  revalidatePath(`/av/addresses/${addressId}`);
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AddressDetailPage({ params }: PageProps) {
  const { id } = await params;
  const caller = await getCaller();
  const address = await caller.av.getAddress({ id });

  if (!address) {
    return (
      <main>
        <section className="container">
          <h1>Adresse nicht gefunden</h1>
          <p>Diese Adresse ist im aktuellen Firmenkontext nicht verfügbar.</p>
          <Link href="/">Zurück zur Übersicht</Link>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="container">
        <p>
          <Link href="/">← Zurück</Link>
        </p>
        <h1>
          {address.addressNo} — {address.firmName}
        </h1>
        <p>
          {address.zipCode} {address.city} · {address.type}
        </p>

        <h2>Adressdaten bearbeiten</h2>
        <form action={updateAddressAction} style={{ display: 'grid', gap: '0.6rem', marginBottom: '1.2rem' }}>
          <input type="hidden" name="id" value={address.id} />
          <input name="firmName" defaultValue={address.firmName} required />
          <input name="street" defaultValue={address.street} required />
          <input name="zipCode" defaultValue={address.zipCode} required />
          <input name="city" defaultValue={address.city} required />
          <input name="canton" defaultValue={address.canton ?? ''} placeholder="Kanton" />
          <input name="email" defaultValue={address.email ?? ''} placeholder="E-Mail" />
          <input name="phone" defaultValue={address.phone ?? ''} placeholder="Telefon" />
          <button type="submit">Adresse speichern</button>
        </form>

        <h2>Kontaktperson hinzufügen</h2>
        <form action={createContactAction} style={{ display: 'grid', gap: '0.6rem', marginBottom: '1.2rem' }}>
          <input type="hidden" name="addressId" value={address.id} />
          <input name="firstName" placeholder="Vorname" required />
          <input name="lastName" placeholder="Nachname" required />
          <input name="role" placeholder="Funktion" />
          <input name="email" placeholder="E-Mail" />
          <input name="phone" placeholder="Telefon" />
          <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <input name="isPrimary" type="checkbox" />
            Primärer Kontakt
          </label>
          <button type="submit">Kontakt speichern</button>
        </form>

        <h2>Kontaktpersonen</h2>
        <ul>
          {address.contacts.map((contact) => (
            <li key={contact.id}>
              <form action={updateContactAction} style={{ display: 'grid', gap: '0.4rem', marginBottom: '0.8rem' }}>
                <input type="hidden" name="id" value={contact.id} />
                <input type="hidden" name="addressId" value={address.id} />
                <input name="firstName" defaultValue={contact.firstName} required />
                <input name="lastName" defaultValue={contact.lastName} required />
                <input name="role" defaultValue={contact.role ?? ''} placeholder="Funktion" />
                <input name="email" defaultValue={contact.email ?? ''} placeholder="E-Mail" />
                <input name="phone" defaultValue={contact.phone ?? ''} placeholder="Telefon" />
                <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <input name="isPrimary" type="checkbox" defaultChecked={contact.isPrimary} />
                  Primärer Kontakt
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit">Kontakt aktualisieren</button>
                </div>
              </form>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                {!contact.isPrimary ? (
                  <form action={setPrimaryContactAction}>
                    <input type="hidden" name="id" value={contact.id} />
                    <input type="hidden" name="addressId" value={address.id} />
                    <button type="submit">Als Primär setzen</button>
                  </form>
                ) : (
                  <span>Primärkontakt</span>
                )}
                <form action={deleteContactAction}>
                  <input type="hidden" name="id" value={contact.id} />
                  <input type="hidden" name="addressId" value={address.id} />
                  <button type="submit">Kontakt löschen</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
