import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { appRouter, createContext } from '@po/api';

export const dynamic = 'force-dynamic';

async function getCaller() {
  const ctx = await createContext();
  return appRouter.createCaller(ctx);
}

async function importCsvAction(formData: FormData) {
  'use server';

  const csv = String(formData.get('csv') ?? '');
  const delimiter = String(formData.get('delimiter') ?? ';') as ';' | ',' | '\t';

  if (!csv.trim()) {
    throw new Error('CSV content is required for import.');
  }

  const caller = await getCaller();
  const result = await caller.av.importAddressCsv({ csv, delimiter });

  revalidatePath('/');
  revalidatePath('/av/import');

  redirect(`/av/import?imported=${result.created}&skipped=${result.skipped}&failed=${result.failed}`);
}

type PageProps = {
  searchParams: Promise<{
    csv?: string;
    delimiter?: string;
    imported?: string;
    skipped?: string;
    failed?: string;
  }>;
};

export default async function AvImportPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const csv = params.csv ?? '';
  const delimiter = params.delimiter === ',' ? ',' : params.delimiter === '\t' ? '\t' : ';';

  const caller = await getCaller();
  const preview = csv.trim()
    ? await caller.av.previewAddressCsvImport({
        csv,
        delimiter
      })
    : null;

  return (
    <main>
      <section className="container">
        <p>
          <Link href="/">← Zurück</Link>
        </p>
        <h1>AV CSV/TwixTel Import</h1>
        <p>Spalten: addressNo;firmName;street;zipCode;city;type;email;phone</p>

        {params.imported !== undefined ? (
          <p>
            Import abgeschlossen · erstellt: {params.imported} · übersprungen: {params.skipped ?? 0} · fehlerhaft:{' '}
            {params.failed ?? 0}
          </p>
        ) : null}

        <h2>1) Vorschau prüfen</h2>
        <form action="/av/import" method="get" style={{ display: 'grid', gap: '0.6rem', marginBottom: '1rem' }}>
          <select name="delimiter" defaultValue={delimiter}>
            <option value=";">Semikolon (;)</option>
            <option value=",">Komma (,)</option>
            <option value="\t">Tab</option>
          </select>
          <textarea
            name="csv"
            defaultValue={csv}
            rows={12}
            placeholder="addressNo;firmName;street;zipCode;city;type;email;phone"
          />
          <button type="submit">Vorschau laden</button>
        </form>

        {preview ? (
          <>
            <p>
              Zeilen: {preview.totalRows} · bereit: {preview.validRows} · fehlerhaft: {preview.invalidRows}
            </p>

            <h2>2) Import ausführen</h2>
            <form action={importCsvAction} style={{ marginBottom: '1rem' }}>
              <input type="hidden" name="delimiter" value={delimiter} />
              <textarea name="csv" defaultValue={csv} rows={1} style={{ display: 'none' }} readOnly />
              <button type="submit" disabled={preview.validRows === 0}>
                Jetzt importieren
              </button>
            </form>

            <h2>Vorschau Details</h2>
            <ul>
              {preview.rows.slice(0, 200).map((row) => (
                <li key={`${row.lineNo}-${row.addressNo}`}>
                  #{row.lineNo} {row.addressNo || '—'} · {row.firmName || '—'} · {row.city || '—'} · {row.status}
                  {row.error ? ` (${row.error})` : ''}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
    </main>
  );
}
