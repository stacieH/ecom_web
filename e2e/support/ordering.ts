import { expect, type Page } from '@playwright/test';

/** 5:00 PM on Friday 2 October 2026 in Manila: the kitchen is open and every slot is free. */
export const FRIDAY_5PM = new Date('2026-10-02T09:00:00Z');

export const GUEST = { name: 'Alex Rivera', email: 'alex@example.com', phone: '+63 917 555 0142' };

/** Fixes the page clock (timers keep running), then opens `path`. */
export async function openAt(page: Page, path: string) {
  await page.clock.setFixedTime(FRIDAY_5PM);
  await page.goto(path);
}

export async function openOrderFromHeader(page: Page) {
  await openAt(page, '/');

  // Below 720px the header links sit behind the menu button.
  const menuToggle = page.getByRole('button', { name: 'Navigation' });
  if (await menuToggle.isVisible()) {
    await menuToggle.click();
  }

  await page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link', { name: 'Order', exact: true })
    .click();
  await expect(page).toHaveURL(/\/order$/);
}

export async function addDish(page: Page, dishName: string, options: string[] = [], quantity = 1) {
  await page.getByRole('button', { name: `Add ${dishName}` }).click();
  const dialog = page.getByRole('dialog', { name: dishName });

  for (const option of options) {
    await dialog.getByRole('radio', { name: option, exact: true }).check();
  }
  for (let count = 1; count < quantity; count += 1) {
    await dialog.getByRole('button', { name: 'Increase quantity' }).click();
  }

  await dialog.getByRole('button', { name: /^Add to order/ }).click();
  await expect(dialog).toBeHidden();
}

/** Below 900px the cart is a bar that opens a sheet. */
export async function openCart(page: Page) {
  const bar = page.getByRole('button', { name: /^View order/ });
  if (await bar.isVisible()) {
    await bar.click();
  }
}

export async function goToCheckout(page: Page) {
  await openCart(page);
  await page.getByRole('link', { name: 'Checkout' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Checkout' })).toBeVisible();
}

export async function fillContact(page: Page) {
  await page.getByLabel('Name', { exact: true }).fill(GUEST.name);
  await page.getByLabel('Email', { exact: true }).fill(GUEST.email);
  await page.getByLabel('Phone', { exact: true }).fill(GUEST.phone);
}

/** The order reference on the tracking page. */
export async function trackedReference(page: Page): Promise<string> {
  await expect(page).toHaveURL(/\/order\/track#token=/);
  const heading = page.getByRole('heading', { level: 2, name: /^O-/ });
  await expect(heading).toBeVisible();
  return (await heading.textContent()) as string;
}

/** Moves an order through `statuses` (guest labels) on the demo console. */
export async function advanceOrder(
  page: Page,
  reference: string,
  statuses: string[],
  rider?: { name: string; phone: string },
) {
  await page.goto('/order/demo');
  const row = page
    .getByRole('region', { name: 'Orders' })
    .getByRole('listitem')
    .filter({ hasText: reference });

  for (const status of statuses) {
    await row.getByLabel(`Next status for ${reference}`).selectOption({ label: status });
    if (status === 'On the way' && rider) {
      await row.getByLabel('Rider name').fill(rider.name);
      await row.getByLabel('Rider phone').fill(rider.phone);
    }
    await row.getByRole('button', { name: `Advance status for ${reference}` }).click();
    await expect(row.getByText(new RegExp(`· ${status}$`))).toBeVisible();
  }
}
