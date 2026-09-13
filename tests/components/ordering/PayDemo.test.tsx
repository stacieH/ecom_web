import { fireEvent, screen, waitFor } from '@testing-library/react';
import PayDemo from '@/components/ordering/PayDemo';
import type { MockOrderingClient } from '@/lib/ordering/mock/MockOrderingClient';
import { fakeDateAt } from '../../helpers/fakeDate';
import { mockRouter, visit } from '../../helpers/navigation';
import { createGuestClient, renderGuest } from '../../helpers/renderGuest';

const FRIDAY_5PM = '2026-10-02T09:00:00Z';

async function openPayment(client: MockOrderingClient = createGuestClient()) {
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
  visit(placed.checkoutUrl as string);
  renderGuest(<PayDemo />, { client });
  await screen.findByRole('button', { name: 'Pay ₱360' });
  return { client, placed };
}

describe('PayDemo', () => {
  beforeEach(() => {
    fakeDateAt(FRIDAY_5PM);
    mockRouter().push.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('labels itself a demo and shows the order, amount, deadline, and methods', async () => {
    const { placed } = await openPayment();

    expect(screen.getByText('Demo payment. No money moves and no card details are collected.')).toBeInTheDocument();
    expect(screen.getByText('Order').nextSibling).toHaveTextContent(placed.order.reference);
    expect(screen.getByText('Amount').nextSibling).toHaveTextContent('₱360');
    expect(screen.getByText('Pay by').nextSibling).toHaveTextContent('5:15 PM');
    expect(screen.getByText('Methods').nextSibling).toHaveTextContent('GCash, Maya, Card, QR Ph');
  });

  it('pays and goes on to the confirmation page', async () => {
    const { client, placed } = await openPayment();

    fireEvent.click(screen.getByRole('button', { name: 'Pay ₱360' }));

    await waitFor(() =>
      expect(mockRouter().push).toHaveBeenCalledWith(`/order/paid?reference=${placed.order.reference}`),
    );
    await expect(client.trackOrder(placed.trackingToken)).resolves.toMatchObject({
      status: 'CONFIRMED',
      payment: { status: 'PAID' },
    });
  });

  it('cancels back to checkout, where the order is still held', async () => {
    const { placed } = await openPayment();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel payment' }));

    await waitFor(() =>
      expect(mockRouter().push).toHaveBeenCalledWith(
        `/order/checkout?reference=${placed.order.reference}&payment=cancelled`,
      ),
    );
  });

  it('simulates a failed payment and lets the guest try again', async () => {
    await openPayment();

    fireEvent.click(screen.getByRole('button', { name: 'Simulate payment failure' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Payment failed. Try again or choose another way to pay.',
    );
    expect(screen.getByRole('button', { name: 'Pay ₱360' })).toBeEnabled();
    expect(mockRouter().push).not.toHaveBeenCalled();
  });

  it('explains a payment link that does not exist', async () => {
    visit('/order/pay-demo?session=cs-missing');

    renderGuest(<PayDemo />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This payment link isn’t valid. Go back to your order to try again.',
    );
  });
});
