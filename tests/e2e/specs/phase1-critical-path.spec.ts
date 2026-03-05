import { expect, test } from '@playwright/test';

const requiresApp = !process.env.BASE_URL;

test.describe('Phase 1 critical path', () => {
  test.skip(requiresApp, 'Set BASE_URL to run full browser E2E against a running app.');

  test('login -> company switch -> create address -> verify audit', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('admin@muster.ch');
    await page.getByLabel(/password/i).fill('ChangeMe!123');
    await page.getByRole('button', { name: /anmelden|login/i }).click();

    await page.getByRole('button', { name: /firma wechseln|switch company/i }).click();
    await page.getByRole('menuitem', { name: /Muster AG/i }).click();

    await page.goto('/av/addresses/new');
    await page.getByLabel(/Adressnummer/i).fill('A-10001');
    await page.getByLabel(/Firma/i).fill('Zimmerei Demo GmbH');
    await page.getByLabel(/Strasse/i).fill('Werkstrasse');
    await page.getByLabel(/PLZ/i).fill('6003');
    await page.getByLabel(/Ort/i).fill('Luzern');
    await page.getByRole('button', { name: /Speichern/i }).click();

    await expect(page.getByText(/Zimmerei Demo GmbH/i)).toBeVisible();

    await page.goto('/admin/audit-log');
    await page.getByPlaceholder(/Suche/i).fill('A-10001');
    await page.keyboard.press('Enter');

    await expect(page.getByText(/INSERT|CREATE/i)).toBeVisible();
    await expect(page.getByText(/Address/i)).toBeVisible();
  });
});
