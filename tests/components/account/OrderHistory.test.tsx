import { fireEvent, screen } from '@testing-library/react';
import OrderHistory from '@/components/account/OrderHistory';
import type { PlaceOrderRequest } from '@/lib/ordering/types';
import { fakeDateAt } from '../../helpers/fakeDate';
import { registerVerifiedCustomer } from '../../helpers/mockOrdering';
import { createGuestClient, renderGuest } from '../../helpers/renderGuest';

const FRIDAY_5PM = '2026-10-02T09:00:00Z';

function tiramisuOrder(notes: string): PlaceOrderRequest {
  return {
    fulfilment: 'PICKUP',
    delivery: null,
    lines: [{ dishId: 'dish-tiramisu', quantity: 1, optionIds: [], note: '' }],
    timing: { mode: 'ASAP' },
    customer: { name: 'Alex Rivera', email: 'alex@example.com', phone: '+63 917 555 0142' },
    paymentMethod: 'PAY_AT_PICKUP',
    expectedTotalCentavos: 36000,
    notes,
  };
}

describe('OrderHistory', () => {
  beforeEach(() => {
    fakeDateAt(FRIDAY_5PM);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lists orders newest first, ten at a time', async () => {
    const client = createGuestClient();
    await registerVerifiedCustomer(client);
    const references: string[] = [];
    for (let count = 0; count < 12; count += 1) {
      const { order } = await client.placeOrder(tiramisuOrder(`Order ${count}`), `order-${count}`);
      references.push(order.reference);
    }

    renderGuest(<OrderHistory />, { client });

    expect(await screen.findByRole('link', { name: references[11] })).toHaveAttribute(
      'href',
      `/account/orders/${references[11]}`,
    );
    expect(screen.getAllByRole('link', { name: /^O-/ })).toHaveLength(10);
    expect(screen.getAllByText('Friday 2 October 2026 · 5:00 PM · Pickup · ₱360 · Order received')).toHaveLength(10);

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));

    expect(await screen.findByRole('link', { name: references[0] })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /^O-/ })).toHaveLength(12);
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('invites a first order when there are none', async () => {
    const client = createGuestClient();
    await registerVerifiedCustomer(client);

    renderGuest(<OrderHistory />, { client });

    expect(await screen.findByText('You haven’t ordered yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Order online' })).toHaveAttribute('href', '/order');
  });
});
