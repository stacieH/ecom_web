import { expect, test, type Page } from '@playwright/test';
import {
  addDish,
  advanceOrder,
  fillContact,
  goToCheckout,
  openAt,
  openCart,
  openOrderFromHeader,
  trackedReference,
} from './support/ordering';

async function payOnlineForTiramisu(page: Page) {
  await addDish(page, 'Classic Tiramisu');
  await goToCheckout(page);
  await page.getByRole('radio', { name: /^As soon as possible/ }).check();
  await fillContact(page);
  await page.getByRole('radio', { name: 'Pay online (GCash, Maya, card, QR Ph)' }).check();
  await page.getByLabel('I agree to the privacy notice').check();
  await page.getByRole('button', { name: 'Place order ₱360' }).click();
  await expect(page).toHaveURL(/\/order\/pay-demo\?session=/);
}

test('orders a ribeye for pickup from the header link and follows it to ready', async ({ page }) => {
  await openOrderFromHeader(page);
  await addDish(page, 'Dry-Aged Ribeye', ['Medium rare']);
  await goToCheckout(page);

  await page.getByRole('radio', { name: /^As soon as possible/ }).check();
  await fillContact(page);
  await page.getByRole('radio', { name: /^Pay at pickup/ }).check();
  await page.getByLabel('I agree to the privacy notice').check();
  await page.getByRole('button', { name: 'Place order ₱1,980' }).click();

  const reference = await trackedReference(page);
  const trackUrl = page.url();
  await expect(page.getByRole('status').filter({ hasText: 'Order received' })).toBeVisible();

  await advanceOrder(page, reference, ['Preparing', 'Ready for pickup']);
  await page.goto(trackUrl);

  await expect(page.getByRole('status').filter({ hasText: 'Ready for pickup' })).toBeVisible();
});

test('refuses cash on delivery over ₱3,000 until the order is smaller, then delivers it', async ({ page }) => {
  await openAt(page, '/order');
  await page.getByRole('radio', { name: /^Delivery/ }).check();
  await page.getByLabel('Delivery area').selectOption({ label: 'Poblacion · ₱60 delivery · ₱800 minimum' });
  await addDish(page, 'Dry-Aged Ribeye', ['Medium'], 2);
  await goToCheckout(page);

  await expect(page.getByRole('radio', { name: /^Cash on delivery/ })).toBeDisabled();
  await expect(page.getByText('Available for orders up to ₱3,000')).toBeVisible();

  await page.getByRole('link', { name: 'Edit order' }).click();
  await openCart(page);
  await page.getByRole('button', { name: 'Decrease Dry-Aged Ribeye quantity' }).click();
  await goToCheckout(page);

  await page.getByRole('radio', { name: /^As soon as possible/ }).check();
  await page.getByLabel('Street address').fill('12 Jupiter Street');
  await page.getByLabel('Landmark').fill('Beside the bakery');
  await fillContact(page);
  await page.getByRole('radio', { name: /^Cash on delivery/ }).check();
  await page.getByLabel('I agree to the privacy notice').check();
  await page.getByRole('button', { name: 'Place order ₱2,040' }).click();

  const reference = await trackedReference(page);
  const trackUrl = page.url();

  await advanceOrder(page, reference, ['Preparing', 'Ready for dispatch', 'On the way', 'Delivered'], {
    name: 'Nico',
    phone: '+63 917 555 0100',
  });
  await page.goto(trackUrl);

  await expect(page.getByRole('status').filter({ hasText: 'Delivered' })).toBeVisible();
  await expect(page.getByText('Cash on delivery · Paid')).toBeVisible();
});

test('pays online on the demo page, and retries after a failed payment', async ({ page }) => {
  await openAt(page, '/order');
  await payOnlineForTiramisu(page);

  await expect(page.getByText('Demo payment. No money moves and no card details are collected.')).toBeVisible();
  await page.getByRole('button', { name: 'Pay ₱360' }).click();
  await trackedReference(page);
  await expect(page.getByText('Pay online · Paid')).toBeVisible();

  await page.goto('/order');
  await payOnlineForTiramisu(page);
  await page.getByRole('button', { name: 'Simulate payment failure' }).click();
  await expect(page.getByText('Payment failed. Try again or choose another way to pay.')).toBeVisible();

  await page.getByRole('button', { name: 'Pay ₱360' }).click();
  await trackedReference(page);
  await expect(page.getByText('Pay online · Paid')).toBeVisible();
});

test('shows every required checkout message and focuses the first field', async ({ page }) => {
  await openAt(page, '/order');
  await addDish(page, 'Classic Tiramisu');
  await goToCheckout(page);
  await expect(page.getByRole('radio', { name: /^As soon as possible/ })).toBeEnabled();

  await page.getByRole('button', { name: 'Place order ₱360' }).click();

  await expect(page.getByText('Please fix the 6 highlighted fields.')).toBeVisible();
  for (const message of [
    'Choose when you’d like your order',
    'Please tell us your name',
    'Enter a valid email address',
    'Enter a phone number we can reach you on',
    'Choose how you’ll pay',
    'Please agree to the privacy notice',
  ]) {
    await expect(page.getByText(message, { exact: true })).toBeVisible();
  }
  await expect(page.locator('#checkout-time-ASAP')).toBeFocused();
});
