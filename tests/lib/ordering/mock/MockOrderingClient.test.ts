import { MockOrderingClient } from '@/lib/ordering/mock/MockOrderingClient';
import type { PlaceOrderRequest } from '@/lib/ordering/types';
import { createTestClient, MemoryStorage } from '../../../helpers/mockOrdering';

const request = (overrides: Partial<PlaceOrderRequest> = {}): PlaceOrderRequest => ({
  fulfilment: 'PICKUP',
  delivery: null,
  lines: [{ dishId: 'dish-tiramisu', quantity: 1, optionIds: [], note: '' }],
  timing: { mode: 'ASAP' },
  customer: { name: 'Alex Rivera', email: 'alex@example.com', phone: '+63 917 555 0142' },
  paymentMethod: 'ONLINE',
  expectedTotalCentavos: 36000,
  notes: '',
  ...overrides,
});

describe('MockOrderingClient', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('waits the configured delay before answering', async () => {
    jest.useFakeTimers();
    const client = new MockOrderingClient({ storage: new MemoryStorage(), delayMs: () => 400 });
    let settled = false;

    const menu = client.getMenu().then((result) => {
      settled = true;
      return result;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    jest.advanceTimersByTime(400);

    await expect(menu).resolves.toMatchObject({ categories: expect.any(Array) });
  });

  it('fails the next request once when the network scenario is on, without affecting demo calls', async () => {
    const { client } = createTestClient();
    await client.demo.setScenarios({ failNextRequest: true });

    await expect(client.demo.getScenarios()).resolves.toMatchObject({ failNextRequest: true });
    await expect(client.getOrderingStatus()).rejects.toMatchObject({ errorCode: 'NETWORK_ERROR' });
    await expect(client.getOrderingStatus()).resolves.toMatchObject({ acceptingOrders: true });
  });

  it('applies scenario changes to the menu and slots', async () => {
    const { client } = createTestClient();

    await client.demo.setScenarios({ soldOutDishSlugs: ['ribeye'], nextSlotFull: true });

    const menu = await client.getMenu();
    const ribeye = menu.categories.flatMap((category) => category.dishes).find((dish) => dish.slug === 'ribeye');
    expect(ribeye?.soldOut).toBe(true);
    const slots = await client.getSlots({ fulfilment: 'PICKUP', date: '2026-10-02' });
    expect(slots.slots[0].available).toBe(false);
  });

  it('takes an online order through demo payment to a confirmed, paid order', async () => {
    const { client } = createTestClient();

    const placed = await client.placeOrder(request(), 'key-1');
    const sessionId = new URL(placed.checkoutUrl as string, 'http://site.test').searchParams.get('session') as string;
    await expect(client.demo.getCheckoutSession(sessionId)).resolves.toMatchObject({ status: 'OPEN' });

    await expect(client.demo.completeCheckout(sessionId, 'PAID')).resolves.toEqual({
      redirectTo: `/order/paid?reference=${placed.order.reference}`,
    });
    await expect(client.trackOrder(placed.trackingToken)).resolves.toMatchObject({
      status: 'CONFIRMED',
      payment: { status: 'PAID' },
    });
  });

  it('expires unpaid holds before any later request', async () => {
    const { client, clock } = createTestClient();
    const placed = await client.placeOrder(request(), 'key-1');

    clock.advanceMinutes(15);

    await expect(client.trackOrder(placed.trackingToken)).resolves.toMatchObject({
      status: 'EXPIRED',
      canResumePayment: false,
    });
  });

  it('keeps orders across a page reload that shares storage', async () => {
    const storage = new MemoryStorage();
    const first = createTestClient({ storage }).client;
    const placed = await first.placeOrder(request({ paymentMethod: 'PAY_AT_PICKUP' }), 'key-1');

    const afterReload = createTestClient({ storage }).client;

    await expect(afterReload.trackOrder(placed.trackingToken)).resolves.toMatchObject({
      reference: placed.order.reference,
    });
    await expect(afterReload.cancelTrackedOrder(placed.trackingToken)).resolves.toMatchObject({
      status: 'CANCELLED',
    });
  });

  it('lists demo orders newest first, advances them, and resets everything', async () => {
    const { client } = createTestClient();
    const older = await client.placeOrder(request({ paymentMethod: 'PAY_AT_PICKUP' }), 'key-1');
    const newer = await client.placeOrder(request({ paymentMethod: 'PAY_AT_PICKUP', notes: 'Second' }), 'key-2');

    expect((await client.demo.listOrders()).map((row) => row.reference)).toEqual([
      newer.order.reference,
      older.order.reference,
    ]);
    await expect(client.demo.advanceOrder(older.order.reference, 'ACCEPTED')).resolves.toMatchObject({
      status: 'ACCEPTED',
      nextStatuses: ['READY'],
    });

    await client.demo.reset();

    await expect(client.demo.listOrders()).resolves.toEqual([]);
    await expect(client.trackOrder(older.trackingToken)).rejects.toMatchObject({ errorCode: 'ORDER_NOT_FOUND' });
  });

  it('resumes payment for a tracked order while it is held', async () => {
    const { client } = createTestClient();
    const placed = await client.placeOrder(request(), 'key-1');

    await expect(client.resumeTrackedPayment(placed.trackingToken)).resolves.toEqual({
      checkoutUrl: placed.checkoutUrl,
    });
  });
});
