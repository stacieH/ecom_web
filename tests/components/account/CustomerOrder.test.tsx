import { act, fireEvent, screen } from '@testing-library/react';
import CustomerOrder from '@/components/account/CustomerOrder';
import { fakeDateAt } from '../../helpers/fakeDate';
import { registerVerifiedCustomer } from '../../helpers/mockOrdering';
import { createGuestClient, renderGuest } from '../../helpers/renderGuest';

const FRIDAY_5PM = '2026-10-02T09:00:00Z';

describe('CustomerOrder', () => {
  beforeEach(() => {
    fakeDateAt(FRIDAY_5PM);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the customer’s order and cancels it', async () => {
    const client = createGuestClient();
    await registerVerifiedCustomer(client);
    const { order } = await client.placeOrder(
      {
        fulfilment: 'PICKUP',
        delivery: null,
        lines: [{ dishId: 'dish-tiramisu', quantity: 1, optionIds: [], note: '' }],
        timing: { mode: 'ASAP' },
        customer: { name: 'Alex Rivera', email: 'alex@example.com', phone: '+63 917 555 0142' },
        paymentMethod: 'PAY_AT_PICKUP',
        expectedTotalCentavos: 36000,
        notes: '',
      },
      'order-1',
    );

    renderGuest(<CustomerOrder reference={order.reference} />, { client });

    expect(await screen.findByRole('heading', { level: 2, name: order.reference })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to your orders' })).toHaveAttribute('href', '/account/orders');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel order' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, cancel order' }));

    expect(
      await screen.findByText('Your order has been cancelled. We’ve emailed you a confirmation.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    await expect(client.getOrder(order.reference)).resolves.toMatchObject({ status: 'CANCELLED' });
  });

  it('refreshes the order status every 20 seconds until it is terminal', async () => {
    jest.useFakeTimers({ now: new Date(FRIDAY_5PM) });
    const client = createGuestClient();
    await registerVerifiedCustomer(client);
    const { order } = await client.placeOrder(
      {
        fulfilment: 'PICKUP',
        delivery: null,
        lines: [{ dishId: 'dish-tiramisu', quantity: 1, optionIds: [], note: '' }],
        timing: { mode: 'ASAP' },
        customer: { name: 'Alex Rivera', email: 'alex@example.com', phone: '+63 917 555 0142' },
        paymentMethod: 'PAY_AT_PICKUP',
        expectedTotalCentavos: 36000,
        notes: '',
      },
      'order-1',
    );

    renderGuest(<CustomerOrder reference={order.reference} />, { client });

    expect(await screen.findByRole('heading', { level: 2, name: order.reference })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Order received');

    await client.demo.advanceOrder(order.reference, 'ACCEPTED');
    await act(async () => {
      await jest.advanceTimersByTimeAsync(20_000);
    });

    expect(screen.getByRole('status')).toHaveTextContent('Preparing');
  });

  it('says when an order is not theirs', async () => {
    const client = createGuestClient();
    await registerVerifiedCustomer(client);

    renderGuest(<CustomerOrder reference="O-NOPE12" />, { client });

    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t find that order.');
    expect(screen.getByRole('link', { name: 'Back to your orders' })).toBeInTheDocument();
  });
});
