import { expect, test } from '@playwright/test';
import { addDish, goToCheckout, GUEST, openAt, trackedReference } from './support/ordering';

const PASSWORD = 'copper-lantern-42';

test('registers, verifies, saves an address at checkout, and cancels the order from history', async ({ page }) => {
  await openAt(page, '/account/register');
  await page.getByLabel('Name', { exact: true }).fill(GUEST.name);
  await page.getByLabel('Email', { exact: true }).fill(GUEST.email);
  await page.getByLabel('Phone', { exact: true }).fill(GUEST.phone);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('I agree to the privacy notice').check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Check your email to verify your account')).toBeVisible();

  await page.getByRole('link', { name: 'Open the demo outbox' }).click();
  await page
    .getByRole('region', { name: 'Emails the portal would send' })
    .getByRole('link', { name: 'Verify your email' })
    .click();
  await expect(page.getByText('Email verified. You can sign in now.')).toBeVisible();

  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill(GUEST.email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Your account' })).toBeVisible();

  await page.goto('/order');
  await page.getByRole('radio', { name: /^Delivery/ }).check();
  await page.getByLabel('Delivery area').selectOption({ label: 'Poblacion · ₱60 delivery · ₱800 minimum' });
  await addDish(page, 'Dry-Aged Ribeye', ['Medium']);
  await goToCheckout(page);

  await expect(page.getByLabel('Name', { exact: true })).toHaveValue(GUEST.name);
  await page.getByRole('radio', { name: /^As soon as possible/ }).check();
  await page.getByLabel('Street address').fill('12 Jupiter Street');
  await page.getByLabel('Landmark').fill('Beside the bakery');
  await page.getByLabel('Save this address to my account').check();
  await page.getByLabel('Name this address').fill('Home');
  await page.getByRole('radio', { name: /^Cash on delivery/ }).check();
  await page.getByRole('button', { name: 'Place order ₱2,040' }).click();
  const reference = await trackedReference(page);

  await page.goto('/account/addresses');
  await expect(page.getByText('Home', { exact: true })).toBeVisible();

  await page.goto('/account/orders');
  await page.getByRole('link', { name: reference }).click();
  await page.getByRole('button', { name: 'Cancel order' }).click();
  await page.getByRole('button', { name: 'Yes, cancel order' }).click();

  await expect(page.getByText('Your order has been cancelled. We’ve emailed you a confirmation.')).toBeVisible();
});
