import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import OrderTracker from '@/components/ordering/OrderTracker';
import type { MockOrderingClient } from '@/lib/ordering/mock/MockOrderingClient';
import type { PaymentMethod } from '@/lib/ordering/types';
import { fakeDateAt } from '../../helpers/fakeDate';
import { mockRouter, visit } from '../../helpers/navigation';
import { createGuestClient, renderGuest } from '../../helpers/renderGuest';

const FRIDAY_5PM = '2026-10-02T09:00:00Z';

async function trackNewOrder(client: MockOrderingClient, paymentMethod: PaymentMethod = 'PAY_AT_PICKUP') {
  const placed = await client.placeOrder(
    {
      fulfilment: 'PICKUP',
      delivery: null,
      lines: [{ dishId: 'dish-tiramisu', quantity: 1, optionIds: [], note: '' }],
      timing: { mode: 'ASAP' },
      customer: { name: 'Alex Rivera', email: 'alex@example.com', phone: '+63 917 555 0142' },
      paymentMethod,
      expectedTotalCentavos: 36000,
      notes: '',
    },
    `order-${paymentMethod}`,
  );
  visit(`/order/track#token=${placed.trackingToken}`);
  return placed;
}

describe('OrderTracker', () => {
  beforeEach(() => {
    mockRouter().push.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('asks for the emailed link when the page has no token', async () => {
    fakeDateAt(FRIDAY_5PM);
    visit('/order/track');

    renderGuest(<OrderTracker />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This page needs the link from your confirmation email. Call us on +63 2 8123 4567 if you can’t find it.',
    );
  });

  it('says an unknown link is not valid', async () => {
    fakeDateAt(FRIDAY_5PM);
    visit('/order/track#token=not-a-real-token');

    renderGuest(<OrderTracker />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This link has expired or isn’t valid. Call us on +63 2 8123 4567 and we’ll help.',
    );
  });

  it('shows the order and refreshes its status every 20 seconds', async () => {
    jest.useFakeTimers({ now: new Date(FRIDAY_5PM) });
    const client = createGuestClient();
    const placed = await trackNewOrder(client);

    renderGuest(<OrderTracker />, { client });

    expect(await screen.findByRole('heading', { level: 2, name: placed.order.reference })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Order received');

    await client.demo.advanceOrder(placed.order.reference, 'ACCEPTED');
    await act(async () => {
      await jest.advanceTimersByTimeAsync(20_000);
    });

    expect(screen.getByRole('status')).toHaveTextContent('Preparing');
  });

  it('cancels a paid order after confirmation, promising the refund', async () => {
    fakeDateAt(FRIDAY_5PM);
    const client = createGuestClient();
    const placed = await trackNewOrder(client, 'ONLINE');
    const sessionId = new URLSearchParams((placed.checkoutUrl as string).split('?')[1]).get('session') as string;
    await client.demo.completeCheckout(sessionId, 'PAID');

    renderGuest(<OrderTracker />, { client });

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel order' }));
    expect(
      screen.getByText(
        'You’ll get a full refund. GCash and Maya refunds arrive within 24 hours; cards can take up to 30 days.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Yes, cancel order' }));

    expect(
      await screen.findByText('Your order has been cancelled. We’ve emailed you a confirmation.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Payment').nextSibling).toHaveTextContent('Pay online · Refund on its way');
    expect(screen.queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument();
  });

  it('reopens payment for an online order that is still held', async () => {
    fakeDateAt(FRIDAY_5PM);
    const client = createGuestClient();
    const placed = await trackNewOrder(client, 'ONLINE');

    renderGuest(<OrderTracker />, { client });

    fireEvent.click(await screen.findByRole('button', { name: 'Complete payment' }));

    await waitFor(() => expect(mockRouter().push).toHaveBeenCalledWith(placed.checkoutUrl));
  });
});
