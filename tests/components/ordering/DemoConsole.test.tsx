import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import DemoConsole from '@/components/ordering/DemoConsole';
import { orderingKeys } from '@/lib/ordering/queryKeys';
import type { PlaceOrderRequest } from '@/lib/ordering/types';
import { fakeDateAt } from '../../helpers/fakeDate';
import { DEFAULT_CUSTOMER, registerVerifiedCustomer } from '../../helpers/mockOrdering';
import { cartLine, createGuestClient, renderGuest } from '../../helpers/renderGuest';

const FRIDAY_5PM = '2026-10-02T09:00:00Z';

const pickup: PlaceOrderRequest = {
  fulfilment: 'PICKUP',
  delivery: null,
  lines: [{ dishId: 'dish-tiramisu', quantity: 1, optionIds: [], note: '' }],
  timing: { mode: 'ASAP' },
  customer: { name: 'Alex Rivera', email: 'alex@example.com', phone: '+63 917 555 0142' },
  paymentMethod: 'PAY_AT_PICKUP',
  expectedTotalCentavos: 36000,
  notes: '',
};

const delivery: PlaceOrderRequest = {
  ...pickup,
  fulfilment: 'DELIVERY',
  delivery: {
    areaId: 'area-poblacion',
    street: '12 Jupiter Street',
    building: '',
    landmark: 'Beside the bakery',
    instructions: '',
  },
  lines: [{ dishId: 'dish-ribeye', quantity: 1, optionIds: ['ribeye-doneness-medium'], note: '' }],
  paymentMethod: 'CASH_ON_DELIVERY',
  expectedTotalCentavos: 204000,
};

describe('DemoConsole', () => {
  beforeEach(() => {
    fakeDateAt(FRIDAY_5PM);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lists the emails the portal would send, newest first, with their links', async () => {
    const client = createGuestClient();
    await client.register(DEFAULT_CUSTOMER);
    const placed = await client.placeOrder(pickup, 'order-1');

    renderGuest(<DemoConsole />, { client });

    const outbox = await screen.findByRole('region', { name: 'Emails the portal would send' });
    await within(outbox).findByText(`Order ${placed.order.reference} received`);
    const subjects = within(outbox)
      .getAllByRole('listitem')
      .map((item) => item.querySelector('p')?.textContent);
    expect(subjects).toEqual([`Order ${placed.order.reference} received`, 'Verify your email']);
    expect(within(outbox).getByRole('link', { name: 'Track your order' })).toHaveAttribute(
      'href',
      `/order/track#token=${placed.trackingToken}`,
    );
    expect(within(outbox).getByRole('link', { name: 'Verify your email' }).getAttribute('href')).toMatch(
      /^\/account\/verify-email#token=/,
    );
  });

  it('switches a scenario on and off', async () => {
    const client = createGuestClient();
    renderGuest(<DemoConsole />, { client });

    const soldOut = await screen.findByLabelText('Ribeye sold out');
    expect(screen.getByLabelText('Next slot is full')).not.toBeChecked();
    expect(screen.getByLabelText('Prices up 10%')).toBeInTheDocument();
    expect(screen.getByLabelText('Online payments fail')).toBeInTheDocument();
    expect(screen.getByLabelText('Network error on next request')).toBeInTheDocument();

    fireEvent.click(soldOut);

    await waitFor(() => expect(screen.getByLabelText('Ribeye sold out')).toBeChecked());
    await expect(client.demo.getScenarios()).resolves.toMatchObject({ soldOutDishSlugs: ['ribeye'] });
  });

  it('advances an order and asks for rider details before dispatch', async () => {
    const client = createGuestClient();
    const { order } = await client.placeOrder(delivery, 'order-1');
    renderGuest(<DemoConsole />, { client });

    const advance = async (expectedStatus: string) => {
      fireEvent.click(await screen.findByRole('button', { name: `Advance status for ${order.reference}` }));
      expect(await screen.findByText(new RegExp(`· ${expectedStatus}$`))).toBeInTheDocument();
    };

    await advance('Preparing');
    await advance('Ready for dispatch');

    expect(screen.getByLabelText(`Next status for ${order.reference}`)).toHaveValue('OUT_FOR_DELIVERY');
    fireEvent.click(screen.getByRole('button', { name: `Advance status for ${order.reference}` }));
    expect(await screen.findByText('Enter the rider’s name')).toBeInTheDocument();
    expect(screen.getByText('Enter the rider’s phone')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Rider name'), { target: { value: 'Nico' } });
    fireEvent.change(screen.getByLabelText('Rider phone'), { target: { value: '+63 917 555 0100' } });
    await advance('On the way');
  });

  it('invalidates the customer order caches after advancing an order, without resetting the session', async () => {
    const client = createGuestClient();
    const { customer } = await registerVerifiedCustomer(client);
    const { order } = await client.placeOrder(pickup, 'order-1');
    const { queryClient } = renderGuest(<DemoConsole />, { client });
    queryClient.setQueryData(orderingKeys.orders, []);
    queryClient.setQueryData(orderingKeys.order(order.reference), {});
    await waitFor(() =>
      expect(queryClient.getQueryData(orderingKeys.session)).toMatchObject({ email: customer.email }),
    );
    const sessionUpdatedAt = queryClient.getQueryState(orderingKeys.session)?.dataUpdatedAt;
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    fireEvent.click(await screen.findByRole('button', { name: `Advance status for ${order.reference}` }));
    await screen.findByText(/· Preparing$/);

    expect(queryClient.getQueryState(orderingKeys.orders)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(orderingKeys.order(order.reference))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(orderingKeys.session)?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(orderingKeys.session)?.dataUpdatedAt).toBe(sessionUpdatedAt);
    expect(invalidate).not.toHaveBeenCalledWith(expect.objectContaining({ queryKey: orderingKeys.session }));
  });

  it('resets every demo record and the cart', async () => {
    const client = createGuestClient();
    await client.placeOrder(pickup, 'order-1');
    const { cartStore } = renderGuest(<DemoConsole />, { client, cart: { lines: [cartLine('dish-tiramisu')] } });
    await screen.findByRole('button', { name: /^Advance status for / });

    fireEvent.click(screen.getByRole('button', { name: 'Reset demo data' }));

    expect(await screen.findByText('Demo data cleared.')).toBeInTheDocument();
    expect(await screen.findByText('No orders yet.')).toBeInTheDocument();
    await expect(client.demo.listOrders()).resolves.toEqual([]);
    expect(cartStore.getSnapshot().lines).toEqual([]);
  });

  it('explains that the console needs demo data', async () => {
    const client = createGuestClient();
    Object.defineProperty(client, 'demo', { value: null });

    renderGuest(<DemoConsole />, { client });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The demo console is only available with demo data.',
    );
  });
});
