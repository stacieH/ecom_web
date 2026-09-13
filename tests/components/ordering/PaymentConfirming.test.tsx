import { act, screen, waitFor } from '@testing-library/react';
import PaymentConfirming from '@/components/ordering/PaymentConfirming';
import { rememberOrderToken } from '@/lib/ordering/orderTokens';
import type { MockOrderingClient } from '@/lib/ordering/mock/MockOrderingClient';
import { fakeDateAt } from '../../helpers/fakeDate';
import { mockRouter, visit } from '../../helpers/navigation';
import { createGuestClient, renderGuest } from '../../helpers/renderGuest';

const FRIDAY_5PM = '2026-10-02T09:00:00Z';

async function placeOnlineOrder(client: MockOrderingClient) {
  const placed = await client.placeOrder(
    {
      fulfilment: 'PICKUP',
      delivery: null,
      lines: [{ dishId: 'dish-tiramisu', quantity: 1, optionIds: [], note: '' }],
      timing: { mode: 'ASAP' },
      customer: { name: 'Alex Rivera', email: 'alex@example.com', phone: '+63 917 555 0142' },
      paymentMethod: 'ONLINE',
      expectedTotalCentavos: 36000,
      notes: '',
    },
    'online-1',
  );
  rememberOrderToken(placed.order.reference, placed.trackingToken);
  visit(`/order/paid?reference=${placed.order.reference}`);
  return placed;
}

describe('PaymentConfirming', () => {
  beforeEach(() => {
    mockRouter().replace.mockClear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens tracking once the payment is confirmed', async () => {
    fakeDateAt(FRIDAY_5PM);
    const client = createGuestClient();
    const placed = await placeOnlineOrder(client);
    const sessionId = new URLSearchParams((placed.checkoutUrl as string).split('?')[1]).get('session') as string;
    await client.demo.completeCheckout(sessionId, 'PAID');

    renderGuest(<PaymentConfirming />, { client });

    await waitFor(() =>
      expect(mockRouter().replace).toHaveBeenCalledWith(
        `/order/track#token=${encodeURIComponent(placed.trackingToken)}`,
      ),
    );
  });

  it('asks for the email link when this tab has no token for the order', async () => {
    fakeDateAt(FRIDAY_5PM);
    visit('/order/paid?reference=O-NOPE12');

    renderGuest(<PaymentConfirming />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Open the link in your confirmation email to see your order.',
    );
  });

  it('keeps confirming for 60 seconds, then promises an email', async () => {
    jest.useFakeTimers({ now: new Date(FRIDAY_5PM) });
    const client = createGuestClient();
    const placed = await placeOnlineOrder(client);

    renderGuest(<PaymentConfirming />, { client });
    expect(await screen.findByText('Confirming your payment…')).toBeInTheDocument();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(62_000);
    });

    expect(
      screen.getByText('We’re still confirming your payment. We’ll email you as soon as it’s through.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View order' })).toHaveAttribute(
      'href',
      `/order/track#token=${encodeURIComponent(placed.trackingToken)}`,
    );
    expect(mockRouter().replace).not.toHaveBeenCalled();
  });
});
