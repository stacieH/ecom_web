import { fireEvent, screen, waitFor } from '@testing-library/react';
import CheckoutPage from '@/components/ordering/CheckoutPage';
import { ApiError } from '@/lib/api/client';
import type { CartState } from '@/lib/ordering/cart/cartReducer';
import type { MockOrderingClient } from '@/lib/ordering/mock/MockOrderingClient';
import { rememberOrderToken } from '@/lib/ordering/orderTokens';
import { orderingKeys } from '@/lib/ordering/queryKeys';
import type { PlaceOrderRequest } from '@/lib/ordering/types';
import { fakeDateAt } from '../../helpers/fakeDate';
import { registerVerifiedCustomer } from '../../helpers/mockOrdering';
import { mockRouter, visit } from '../../helpers/navigation';
import { cartLine, createGuestClient, renderGuest } from '../../helpers/renderGuest';

// 5:00 PM on Friday 2 October 2026 in Manila.
const FRIDAY_5PM = '2026-10-02T09:00:00Z';
const GUEST = { name: 'Alex Rivera', email: 'alex@example.com', phone: '+63 917 555 0142' };

function tiramisuOrder(overrides: Partial<PlaceOrderRequest> = {}): PlaceOrderRequest {
  return {
    fulfilment: 'PICKUP',
    delivery: null,
    lines: [{ dishId: 'dish-tiramisu', quantity: 1, optionIds: [], note: '' }],
    timing: { mode: 'ASAP' },
    customer: GUEST,
    paymentMethod: 'PAY_AT_PICKUP',
    expectedTotalCentavos: 36000,
    notes: '',
    ...overrides,
  };
}

async function openCheckout(
  total: string,
  options: { client?: MockOrderingClient; cart?: Partial<CartState> } = {},
) {
  const view = renderGuest(<CheckoutPage />, {
    client: options.client ?? createGuestClient(),
    cart: options.cart ?? { lines: [cartLine('dish-tiramisu')] },
  });
  await screen.findByRole('button', { name: `Place order ${total}` });
  return view;
}

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

async function chooseAsap(estimate: string) {
  await screen.findByText(estimate);
  fireEvent.click(screen.getByRole('radio', { name: /^As soon as possible/ }));
}

function fillContact() {
  type('Name', GUEST.name);
  type('Email', GUEST.email);
  type('Phone', GUEST.phone);
}

async function fillPickupDetails() {
  await chooseAsap('Ready around 5:30 PM');
  fillContact();
  fireEvent.click(screen.getByRole('radio', { name: /^Pay at pickup/ }));
  fireEvent.click(screen.getByLabelText('I agree to the privacy notice'));
}

const placeOrderButton = (total = '₱360') => screen.getByRole('button', { name: `Place order ${total}` });

describe('CheckoutPage', () => {
  beforeEach(() => {
    fakeDateAt(FRIDAY_5PM);
    visit('/order/checkout');
    mockRouter().push.mockClear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stays quiet while typing, checks a field on blur, and clears the message once fixed', async () => {
    await openCheckout('₱360');
    const email = screen.getByLabelText('Email');

    fireEvent.change(email, { target: { value: 'alex@' } });
    expect(screen.queryByText('Enter a valid email address')).not.toBeInTheDocument();

    fireEvent.blur(email);
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();

    fireEvent.change(email, { target: { value: 'alex@example.com' } });
    expect(screen.queryByText('Enter a valid email address')).not.toBeInTheDocument();
  });

  it('checks every field on submit, focuses the first problem, and places nothing', async () => {
    const client = createGuestClient();
    const place = jest.spyOn(client, 'placeOrder');
    await openCheckout('₱360', { client });
    await screen.findByText('Ready around 5:30 PM');

    fireEvent.click(placeOrderButton());

    expect(screen.getByText('Please fix the 6 highlighted fields.')).toBeInTheDocument();
    expect(screen.getByText('Choose when you’d like your order')).toBeInTheDocument();
    expect(screen.getByText('Please agree to the privacy notice')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^As soon as possible/ })).toHaveFocus();
    expect(place).not.toHaveBeenCalled();
  });

  it('places a pay-at-pickup order, remembers its token, clears the cart, and opens tracking', async () => {
    const client = createGuestClient();
    const place = jest.spyOn(client, 'placeOrder');
    const { cartStore, queryClient } = await openCheckout('₱360', { client });
    queryClient.setQueryData(orderingKeys.slotsRoot, []);

    await fillPickupDetails();
    fireEvent.click(placeOrderButton());

    await waitFor(() => expect(mockRouter().push).toHaveBeenCalled());
    const { order, trackingToken } = await place.mock.results[0].value;
    expect(mockRouter().push).toHaveBeenCalledWith(`/order/track#token=${encodeURIComponent(trackingToken)}`);
    expect(window.sessionStorage.getItem(`cs-order-token:${order.reference}`)).toBe(trackingToken);
    expect(cartStore.getSnapshot().lines).toEqual([]);
    expect(screen.getByText('Taking you to your order…')).toBeInTheDocument();
    expect(queryClient.getQueryState(orderingKeys.slotsRoot)?.isInvalidated).toBe(true);
  });

  it('sends an online order to the demo payment page', async () => {
    await openCheckout('₱360');

    await chooseAsap('Ready around 5:30 PM');
    fillContact();
    fireEvent.click(screen.getByRole('radio', { name: 'Pay online (GCash, Maya, card, QR Ph)' }));
    fireEvent.click(screen.getByLabelText('I agree to the privacy notice'));
    fireEvent.click(placeOrderButton());

    await waitFor(() =>
      expect(mockRouter().push).toHaveBeenCalledWith(expect.stringMatching(/^\/order\/pay-demo\?session=cs-[a-z0-9]{12}$/)),
    );
  });

  it('prefills a signed-in customer and saves the new delivery address after ordering', async () => {
    const client = createGuestClient();
    await registerVerifiedCustomer(client);
    await openCheckout('₱2,040', {
      client,
      cart: {
        fulfilment: 'DELIVERY',
        areaId: 'area-poblacion',
        lines: [cartLine('dish-ribeye', ['ribeye-doneness-medium'])],
      },
    });

    expect(screen.getByLabelText('Name')).toHaveValue('Alex Rivera');
    expect(screen.queryByLabelText('I agree to the privacy notice')).not.toBeInTheDocument();

    await chooseAsap('Arriving around 6:00 PM');
    type('Street address', '12 Jupiter Street');
    type('Landmark', 'Beside the bakery');
    fireEvent.click(screen.getByLabelText('Save this address to my account'));
    type('Name this address', 'Home');
    fireEvent.click(screen.getByRole('radio', { name: /^Cash on delivery/ }));
    fireEvent.click(placeOrderButton('₱2,040'));

    await waitFor(() => expect(mockRouter().push).toHaveBeenCalled());
    await expect(client.listAddresses()).resolves.toEqual([
      expect.objectContaining({ label: 'Home', street: '12 Jupiter Street', areaId: 'area-poblacion' }),
    ]);
  });

  it('keeps the idempotency key for a retry of the same order and renews it after an edit', async () => {
    const client = createGuestClient();
    const place = jest
      .spyOn(client, 'placeOrder')
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Offline'))
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Offline'));
    await openCheckout('₱360', { client });
    await fillPickupDetails();

    fireEvent.click(placeOrderButton());
    expect(
      await screen.findByText('We couldn’t place your order. Please try again, or call us on +63 2 8123 4567.'),
    ).toBeInTheDocument();

    await waitFor(() => expect(placeOrderButton()).toBeEnabled());
    fireEvent.click(placeOrderButton());
    await waitFor(() => expect(place).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(placeOrderButton()).toBeEnabled());

    type('Order notes (optional)', 'Extra napkins');
    fireEvent.click(placeOrderButton());
    await waitFor(() => expect(mockRouter().push).toHaveBeenCalled());

    const keys = place.mock.calls.map(([, key]) => key);
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).not.toBe(keys[1]);
  });

  it('shows the new prices when they changed and keeps everything typed', async () => {
    const client = createGuestClient();
    await openCheckout('₱360', { client });
    await fillPickupDetails();
    await client.demo.setScenarios({ priceIncreasePercent: 10 });

    fireEvent.click(placeOrderButton());

    expect(await screen.findByText('Prices have changed. Your new total is ₱400.')).toBeInTheDocument();
    expect(screen.getByText('Classic Tiramisu: ₱400 each')).toBeInTheDocument();
    expect(placeOrderButton('₱400')).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Review order' }));

    expect(screen.queryByText('Prices have changed. Your new total is ₱400.')).not.toBeInTheDocument();
    expect(placeOrderButton('₱400')).toBeEnabled();
    expect(screen.getByLabelText('Name')).toHaveValue('Alex Rivera');
  });

  it('marks lines that are no longer available and lets the guest remove them', async () => {
    const client = createGuestClient();
    const { cartStore } = await openCheckout('₱2,340', {
      client,
      cart: { lines: [cartLine('dish-ribeye', ['ribeye-doneness-medium']), cartLine('dish-tiramisu')] },
    });
    await fillPickupDetails();
    await client.demo.setScenarios({ soldOutDishSlugs: ['ribeye'] });

    fireEvent.click(placeOrderButton('₱2,340'));

    expect(
      await screen.findByText('Some items are no longer available. Remove them to continue.'),
    ).toBeInTheDocument();
    expect(screen.getByText('No longer available')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Dry-Aged Ribeye' }));
    expect(cartStore.getSnapshot().lines.map((line) => line.dishId)).toEqual(['dish-tiramisu']);
  });

  it('asks for another time when the chosen slot just filled up', async () => {
    const client = createGuestClient();
    await openCheckout('₱360', { client });

    fireEvent.click(screen.getByRole('radio', { name: /^Schedule/ }));
    fireEvent.click(await screen.findByRole('radio', { name: '5:30 PM' }));
    fillContact();
    fireEvent.click(screen.getByRole('radio', { name: /^Pay at pickup/ }));
    fireEvent.click(screen.getByLabelText('I agree to the privacy notice'));

    for (let count = 0; count < 6; count += 1) {
      await client.placeOrder(
        tiramisuOrder({ timing: { mode: 'SCHEDULED', startsAt: '2026-10-02T09:30:00Z' } }),
        `other-guest-${count}`,
      );
    }

    fireEvent.click(placeOrderButton());

    expect(await screen.findByText('That time just filled up. Choose another.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('radio', { name: /^5:30 PM/ })).toBeDisabled());
  });

  it('explains a delivery below the area minimum with a way back to the menu', async () => {
    await openCheckout('₱420', {
      cart: { fulfilment: 'DELIVERY', areaId: 'area-poblacion', lines: [cartLine('dish-tiramisu')] },
    });

    await chooseAsap('Arriving around 6:00 PM');
    type('Street address', '12 Jupiter Street');
    type('Landmark', 'Beside the bakery');
    fillContact();
    fireEvent.click(screen.getByRole('radio', { name: /^Cash on delivery/ }));
    fireEvent.click(screen.getByLabelText('I agree to the privacy notice'));
    fireEvent.click(placeOrderButton('₱420'));

    expect(await screen.findByText('Add ₱440 more to reach Poblacion’s ₱800 minimum.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the menu' })).toHaveAttribute('href', '/order');
  });

  it('shows other refusals on the payment field, as a message, or as a closed banner', async () => {
    const client = createGuestClient();
    jest
      .spyOn(client, 'placeOrder')
      .mockRejectedValueOnce(
        new ApiError(422, 'PAYMENT_METHOD_NOT_ALLOWED', 'Not allowed.', {
          paymentMethod: ['Pay at pickup is paused today'],
        }),
      )
      .mockRejectedValueOnce(new ApiError(502, 'PAYMENT_PROVIDER_UNAVAILABLE', 'Unavailable'))
      .mockRejectedValueOnce(new ApiError(409, 'ORDERING_CLOSED', 'Online ordering is closed right now.'));
    await openCheckout('₱360', { client });
    await fillPickupDetails();

    fireEvent.click(placeOrderButton());
    expect(await screen.findByText('Pay at pickup is paused today')).toBeInTheDocument();

    await waitFor(() => expect(placeOrderButton()).toBeEnabled());
    fireEvent.click(placeOrderButton());
    expect(
      await screen.findByText('Online payment is unavailable right now. Choose another way to pay or try again.'),
    ).toBeInTheDocument();

    await waitFor(() => expect(placeOrderButton()).toBeEnabled());
    fireEvent.click(placeOrderButton());
    expect(await screen.findByText('Online ordering is closed right now.')).toBeInTheDocument();
    expect(placeOrderButton()).toBeDisabled();
  });

  it('offers a way to retry when the quote fails to load with no cached price', async () => {
    const client = createGuestClient();
    jest.spyOn(client, 'quote').mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Offline'));
    renderGuest(<CheckoutPage />, { client, cart: { lines: [cartLine('dish-tiramisu')] } });

    expect(await screen.findByText('We couldn’t price your order.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Place order' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('button', { name: 'Place order ₱360' })).toBeInTheDocument();
  });

  it('shows the held order after a cancelled payment and reopens payment', async () => {
    const client = createGuestClient();
    const placed = await client.placeOrder(tiramisuOrder({ paymentMethod: 'ONLINE' }), 'online-1');
    rememberOrderToken(placed.order.reference, placed.trackingToken);
    visit(`/order/checkout?reference=${placed.order.reference}&payment=cancelled`);

    renderGuest(<CheckoutPage />, { client });

    expect(
      await screen.findByText('Payment was cancelled. Your order is held until 5:15 PM'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try payment again' }));
    await waitFor(() => expect(mockRouter().push).toHaveBeenCalledWith(placed.checkoutUrl));
  });
});
