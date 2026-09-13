// Demo ordering operations over DemoState, following the 3A spec's lifecycle,
// capacity, and pricing rules. Callers run these inside DemoStore.update so a
// thrown ApiError leaves the stored state untouched.
import { ApiError } from '@/lib/api/client';
import { formatDateTime } from '@/lib/booking/time';
import { formatPeso } from '@/lib/money';
import type {
  DemoCheckoutSession,
  DemoOrderRow,
  DemoPaymentOutcome,
  Fulfilment,
  Menu,
  OrderDraft,
  OrderingStatus,
  OrderStatus,
  OrderSummary,
  PlaceOrderRequest,
  PlaceOrderResponse,
  Quote,
  Slot,
  SlotList,
} from '../types';
import {
  buildingRule,
  emailRule,
  instructionsRule,
  landmarkRule,
  nameRule,
  orderNotesRule,
  paymentMethodRule,
  phoneRule,
  streetRule,
} from '../validation/rules';
import { MockContext, newId, newReference, newToken, queueEmail } from './mockContext';
import { buildMockMenu, MOCK_DELIVERY_AREAS, MOCK_SERVICE_DAYS, MOCK_SETTINGS } from './mockData';
import { priceDraft } from './mockPricing';
import { isoInstant, offeredDates, planSlots, promisedAt } from './mockSlots';
import type { DemoState, StoredOrder } from './mockStore';

const MINUTE = 60_000;
const PAYMENT_METHODS = ['ONLINE', 'PAY_AT_PICKUP', 'CASH_ON_DELIVERY'];

const holdsCapacity = (status: OrderStatus) => status !== 'CANCELLED' && status !== 'EXPIRED';

export function currentMenu(state: DemoState): Menu {
  return buildMockMenu({
    soldOutDishSlugs: state.scenarios.soldOutDishSlugs,
    priceIncreasePercent: state.scenarios.priceIncreasePercent,
  });
}

export function orderingStatus(): OrderingStatus {
  const settings = MOCK_SETTINGS;
  return {
    acceptingOrders: settings.acceptingOrders,
    message: settings.pauseMessage,
    pickupEnabled: settings.pickupEnabled,
    deliveryEnabled: settings.deliveryEnabled,
    payAtPickup: settings.payAtPickupEnabled,
    cashOnDelivery: settings.cashOnDeliveryEnabled,
    cashOnDeliveryMaxCentavos: settings.cashOnDeliveryMaxCentavos,
    onlinePaymentMethods: settings.onlinePaymentMethods,
  };
}

function usedCount(state: DemoState) {
  return (fulfilment: Fulfilment, startsAt: string) =>
    state.orders.filter(
      (order) =>
        holdsCapacity(order.status) && order.fulfilment === fulfilment && order.slotStart === startsAt,
    ).length;
}

export function slotsFor(
  state: DemoState,
  now: Date,
  params: { fulfilment: Fulfilment; date: string; areaId?: string },
): SlotList {
  const area = MOCK_DELIVERY_AREAS.find((candidate) => candidate.id === params.areaId);

  if (params.fulfilment === 'DELIVERY' && !area) {
    throw new ApiError(422, 'DELIVERY_AREA_UNAVAILABLE', 'We don’t deliver to that area.', {
      'delivery.areaId': ['Choose a delivery area'],
    });
  }

  return planSlots({
    now,
    date: params.date,
    fulfilment: params.fulfilment,
    settings: MOCK_SETTINGS,
    serviceDays: MOCK_SERVICE_DAYS,
    extraMinutes: params.fulfilment === 'DELIVERY' && area ? area.extraMinutes : 0,
    usedCount: usedCount(state),
    nextSlotFull: state.scenarios.nextSlotFull,
  });
}

export function quoteDraft(state: DemoState, draft: OrderDraft): Quote {
  return priceDraft({
    draft,
    menu: currentMenu(state),
    areas: MOCK_DELIVERY_AREAS,
    settings: MOCK_SETTINGS,
  });
}

function pushStatus(order: StoredOrder, status: OrderStatus, now: Date): void {
  order.status = status;
  order.statusHistory.push({ status, at: isoInstant(now.getTime()) });
}

function emailOrder(
  state: DemoState,
  ctx: MockContext,
  order: StoredOrder,
  subject: string,
  body: string,
): void {
  queueEmail(state, ctx, {
    to: order.customer.email,
    subject,
    body,
    links: [{ label: 'Track your order', href: `/order/track#token=${order.trackingToken}` }],
  });
}

export function toSummary(order: StoredOrder, now: Date): OrderSummary {
  const holdOpen =
    order.payment.holdExpiresAt !== null && Date.parse(order.payment.holdExpiresAt) > now.getTime();

  return {
    reference: order.reference,
    status: order.status,
    fulfilment: order.fulfilment,
    timingMode: order.timingMode,
    promisedAt: order.promisedAt,
    customerName: order.customer.name,
    lines: order.lines,
    notes: order.notes,
    subtotalCentavos: order.subtotalCentavos,
    deliveryFeeCentavos: order.deliveryFeeCentavos,
    totalCentavos: order.totalCentavos,
    payment: { method: order.payment.method, status: order.payment.status },
    delivery: order.delivery
      ? {
          areaName: order.delivery.areaName,
          street: order.delivery.street,
          building: order.delivery.building,
          landmark: order.delivery.landmark,
          instructions: order.delivery.instructions,
          riderName: order.delivery.riderName,
          riderPhone: order.status === 'OUT_FOR_DELIVERY' ? order.delivery.riderPhone : null,
        }
      : null,
    canCancel: order.status === 'CONFIRMED' || order.status === 'AWAITING_PAYMENT',
    canResumePayment:
      order.status === 'AWAITING_PAYMENT' && order.payment.method === 'ONLINE' && holdOpen,
    statusHistory: order.statusHistory,
    createdAt: order.createdAt,
  };
}

function validateRequest(request: PlaceOrderRequest): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const add = (key: string, message: string | undefined) => {
    if (message) errors[key] = [message];
  };

  add('customer.name', nameRule(request.customer.name));
  add('customer.email', emailRule(request.customer.email));
  add('customer.phone', phoneRule(request.customer.phone));

  if (request.fulfilment === 'DELIVERY') {
    const delivery = request.delivery;
    add('delivery.areaId', delivery?.areaId ? undefined : 'Choose a delivery area');
    add('delivery.street', streetRule(delivery?.street ?? ''));
    add('delivery.building', buildingRule(delivery?.building ?? ''));
    add('delivery.landmark', landmarkRule(delivery?.landmark ?? ''));
    add('delivery.instructions', instructionsRule(delivery?.instructions ?? ''));
  }

  add('notes', orderNotesRule(request.notes));
  add('paymentMethod', PAYMENT_METHODS.includes(request.paymentMethod) ? undefined : 'Choose how you’ll pay');

  if (request.timing.mode === 'SCHEDULED' && !request.timing.startsAt) {
    add(
      'timing.startsAt',
      request.fulfilment === 'DELIVERY' ? 'Choose a delivery time' : 'Choose a pickup time',
    );
  }

  return errors;
}

// A slot after midnight belongs to the service day it opened on, so look in
// every offered day's list rather than the calendar date of the instant.
function findSlot(
  state: DemoState,
  now: Date,
  fulfilment: Fulfilment,
  areaId: string | undefined,
  startsAt: string,
): Slot | undefined {
  for (const date of offeredDates(now, MOCK_SETTINGS)) {
    const list = slotsFor(state, now, { fulfilment, date, areaId });
    const slot = list.slots.find((candidate) => candidate.startsAt === startsAt);
    if (slot) return slot;
  }
  return undefined;
}

export function placeOrder(
  state: DemoState,
  ctx: MockContext,
  request: PlaceOrderRequest,
  idempotencyKey: string,
): PlaceOrderResponse {
  const now = ctx.now();
  const requestHash = JSON.stringify(request);

  const previous = state.idempotency.find((entry) => entry.key === idempotencyKey);
  if (previous) {
    if (previous.requestHash === requestHash) return previous.response;
    throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'This request was already used for a different order.');
  }

  const fieldErrors = validateRequest(request);
  if (Object.keys(fieldErrors).length > 0) {
    throw new ApiError(422, 'VALIDATION_FAILED', 'Please check the highlighted details.', fieldErrors);
  }

  const quote = quoteDraft(state, request);
  const area = MOCK_DELIVERY_AREAS.find((candidate) => candidate.id === request.delivery?.areaId);

  if (quote.minimumOrderCentavos !== null && quote.subtotalCentavos < quote.minimumOrderCentavos) {
    throw new ApiError(
      422,
      'BELOW_MINIMUM_ORDER',
      `Add ${formatPeso(quote.minimumOrderCentavos - quote.subtotalCentavos)} more to reach ${area?.name ?? 'the area'}’s ${formatPeso(quote.minimumOrderCentavos)} minimum.`,
    );
  }

  if (quote.totalCentavos !== request.expectedTotalCentavos) {
    throw new ApiError(409, 'PRICE_CHANGED', 'Prices have changed since your quote.', {}, { quote });
  }

  const paymentError = paymentMethodRule(request.paymentMethod, {
    fulfilment: request.fulfilment,
    totalCentavos: quote.totalCentavos,
    allowed: quote.paymentMethods,
    cashOnDeliveryMaxCentavos: MOCK_SETTINGS.cashOnDeliveryMaxCentavos,
  });
  if (paymentError) {
    throw new ApiError(422, 'PAYMENT_METHOD_NOT_ALLOWED', `${paymentError}.`, {
      paymentMethod: [paymentError],
    });
  }

  let slotStart: string;
  const areaId = request.fulfilment === 'DELIVERY' ? request.delivery?.areaId : undefined;

  if (request.timing.mode === 'ASAP') {
    const today = offeredDates(now, MOCK_SETTINGS)[0];
    const list = slotsFor(state, now, { fulfilment: request.fulfilment, date: today, areaId });
    if (list.slots.length === 0) {
      throw new ApiError(409, 'ORDERING_CLOSED', 'Online ordering is closed right now.');
    }
    if (!list.asapStartsAt) {
      throw new ApiError(409, 'SLOT_FULL', 'Every time today is full.');
    }
    slotStart = list.asapStartsAt;
  } else {
    const slot = findSlot(state, now, request.fulfilment, areaId, request.timing.startsAt);
    if (!slot) {
      throw new ApiError(422, 'SLOT_NOT_OFFERED', 'That time is no longer available.', {
        'timing.startsAt': ['That time is no longer available'],
      });
    }
    if (!slot.available) {
      throw new ApiError(409, 'SLOT_FULL', 'That time just filled up.', {
        'timing.startsAt': ['That time just filled up. Choose another.'],
      });
    }
    slotStart = slot.startsAt;
  }

  const online = request.paymentMethod === 'ONLINE';
  if (online && state.scenarios.failOnlinePayments) {
    throw new ApiError(502, 'PAYMENT_PROVIDER_UNAVAILABLE', 'Online payment is unavailable right now.');
  }

  const status: OrderStatus = online ? 'AWAITING_PAYMENT' : 'CONFIRMED';
  const createdAt = isoInstant(now.getTime());
  const order: StoredOrder = {
    id: newId(ctx, 'order'),
    reference: newReference(ctx),
    trackingToken: newToken(ctx),
    status,
    fulfilment: request.fulfilment,
    timingMode: request.timing.mode,
    slotStart,
    promisedAt: promisedAt(request.fulfilment, slotStart),
    customer: {
      name: request.customer.name.trim(),
      email: request.customer.email.trim(),
      phone: request.customer.phone.trim(),
      accountId: state.sessionCustomerId,
    },
    delivery:
      request.fulfilment === 'DELIVERY' && request.delivery && area
        ? {
            areaId: area.id,
            areaName: area.name,
            street: request.delivery.street.trim(),
            building: request.delivery.building.trim(),
            landmark: request.delivery.landmark.trim(),
            instructions: request.delivery.instructions.trim(),
            riderName: null,
            riderPhone: null,
          }
        : null,
    lines: quote.lines,
    notes: request.notes.trim(),
    subtotalCentavos: quote.subtotalCentavos,
    deliveryFeeCentavos: quote.deliveryFeeCentavos,
    totalCentavos: quote.totalCentavos,
    payment: {
      method: request.paymentMethod,
      status: online ? 'PENDING' : 'UNPAID',
      checkoutSessionId: online ? newId(ctx, 'cs') : null,
      holdExpiresAt: online
        ? isoInstant(now.getTime() + MOCK_SETTINGS.paymentHoldMinutes * MINUTE)
        : null,
    },
    statusHistory: [{ status, at: createdAt }],
    createdAt,
  };

  state.orders.push(order);

  if (order.payment.checkoutSessionId) {
    state.checkoutSessions.push({ id: order.payment.checkoutSessionId, orderId: order.id, status: 'OPEN' });
  } else {
    emailOrder(
      state,
      ctx,
      order,
      `Order ${order.reference} received`,
      `Thanks, ${order.customer.name}. Your order will be ready around ${formatDateTime(order.promisedAt)}.`,
    );
  }

  const response: PlaceOrderResponse = {
    order: toSummary(order, now),
    trackingToken: order.trackingToken,
    checkoutUrl: order.payment.checkoutSessionId
      ? `/order/pay-demo?session=${order.payment.checkoutSessionId}`
      : null,
  };
  state.idempotency.push({ key: idempotencyKey, requestHash, response });
  return response;
}

/** Runs before every client operation, standing in for the API's expiry job. */
export function expireHolds(state: DemoState, ctx: MockContext): void {
  const now = ctx.now();

  state.orders.forEach((order) => {
    const expired =
      order.status === 'AWAITING_PAYMENT' &&
      order.payment.holdExpiresAt !== null &&
      Date.parse(order.payment.holdExpiresAt) <= now.getTime();
    if (!expired) return;

    pushStatus(order, 'EXPIRED', now);
    const session = state.checkoutSessions.find((candidate) => candidate.orderId === order.id);
    if (session?.status === 'OPEN') session.status = 'EXPIRED';

    queueEmail(state, ctx, {
      to: order.customer.email,
      subject: `Payment not completed for ${order.reference}`,
      body: 'Your order was not placed because payment wasn’t completed in time. You can order again from the menu.',
      links: [{ label: 'Order again', href: '/order' }],
    });
  });
}

export function findOrderByToken(state: DemoState, token: string): StoredOrder {
  const order = state.orders.find((candidate) => candidate.trackingToken === token);
  if (!order) {
    throw new ApiError(404, 'ORDER_NOT_FOUND', 'We couldn’t find that order.');
  }
  return order;
}

export function cancelOrderRecord(state: DemoState, ctx: MockContext, order: StoredOrder): StoredOrder {
  if (order.status !== 'CONFIRMED' && order.status !== 'AWAITING_PAYMENT') {
    throw new ApiError(409, 'ORDER_NOT_CANCELLABLE', 'This order can no longer be cancelled.');
  }

  const now = ctx.now();
  pushStatus(order, 'CANCELLED', now);

  const session = state.checkoutSessions.find((candidate) => candidate.orderId === order.id);
  if (session?.status === 'OPEN') session.status = 'CANCELLED';

  const refunded = order.payment.status === 'PAID';
  if (refunded) order.payment.status = 'REFUND_PENDING';

  emailOrder(
    state,
    ctx,
    order,
    `Order ${order.reference} cancelled`,
    refunded
      ? 'Your order was cancelled and a full refund is on its way.'
      : 'Your order was cancelled.',
  );

  return order;
}

export function resumePayment(now: Date, order: StoredOrder): { checkoutUrl: string } {
  const summary = toSummary(order, now);
  if (!summary.canResumePayment || !order.payment.checkoutSessionId) {
    throw new ApiError(409, 'ORDER_STATE_CHANGED', 'This order is no longer waiting for payment.');
  }
  return { checkoutUrl: `/order/pay-demo?session=${order.payment.checkoutSessionId}` };
}

export function nextStatuses(order: StoredOrder): OrderStatus[] {
  switch (order.status) {
    case 'CONFIRMED':
      return ['ACCEPTED', 'CANCELLED'];
    case 'ACCEPTED':
      return ['READY'];
    case 'READY':
      return order.fulfilment === 'PICKUP' ? ['COMPLETED'] : ['OUT_FOR_DELIVERY'];
    case 'OUT_FOR_DELIVERY':
      return ['DELIVERED', 'DELIVERY_FAILED'];
    case 'DELIVERY_FAILED':
      return ['OUT_FOR_DELIVERY', 'CANCELLED'];
    default:
      return [];
  }
}

export function toDemoRow(order: StoredOrder): DemoOrderRow {
  return {
    reference: order.reference,
    status: order.status,
    fulfilment: order.fulfilment,
    customerName: order.customer.name,
    totalCentavos: order.totalCentavos,
    paymentMethod: order.payment.method,
    createdAt: order.createdAt,
    nextStatuses: nextStatuses(order),
  };
}

export function advanceOrder(
  state: DemoState,
  ctx: MockContext,
  reference: string,
  to: OrderStatus,
  rider?: { name: string; phone: string },
): DemoOrderRow {
  const order = state.orders.find((candidate) => candidate.reference === reference);
  if (!order) {
    throw new ApiError(404, 'ORDER_NOT_FOUND', 'We couldn’t find that order.');
  }
  if (!nextStatuses(order).includes(to)) {
    throw new ApiError(409, 'ORDER_STATE_CHANGED', 'That status change isn’t allowed.');
  }

  if (to === 'OUT_FOR_DELIVERY') {
    const errors: Record<string, string[]> = {};
    if (!rider?.name.trim()) errors.riderName = ['Enter the rider’s name'];
    if (!rider?.phone.trim()) errors.riderPhone = ['Enter the rider’s phone'];
    if (Object.keys(errors).length > 0) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Rider details are required.', errors);
    }
    if (order.delivery && rider) {
      order.delivery.riderName = rider.name.trim();
      order.delivery.riderPhone = rider.phone.trim();
    }
  }

  const now = ctx.now();
  pushStatus(order, to, now);

  if ((to === 'COMPLETED' || to === 'DELIVERED') && order.payment.status === 'UNPAID') {
    order.payment.status = 'PAID';
  }
  if (to === 'CANCELLED' && order.payment.status === 'PAID') {
    order.payment.status = 'REFUND_PENDING';
  }

  if (to === 'READY' && order.fulfilment === 'PICKUP') {
    emailOrder(state, ctx, order, `Order ${order.reference} is ready for pickup`, 'Your order is ready at 27 Cinderwood Lane, Poblacion.');
  }
  if (to === 'OUT_FOR_DELIVERY') {
    emailOrder(state, ctx, order, `Order ${order.reference} is on the way`, `${order.delivery?.riderName} is bringing your order.`);
  }
  if (to === 'CANCELLED') {
    emailOrder(state, ctx, order, `Order ${order.reference} cancelled`, 'Your order was cancelled.');
  }

  return toDemoRow(order);
}

function findSession(state: DemoState, sessionId: string) {
  const session = state.checkoutSessions.find((candidate) => candidate.id === sessionId);
  const order = session && state.orders.find((candidate) => candidate.id === session.orderId);
  if (!session || !order) {
    throw new ApiError(404, 'NOT_FOUND', 'That demo payment session doesn’t exist.');
  }
  return { session, order };
}

export function checkoutSessionView(state: DemoState, sessionId: string): DemoCheckoutSession {
  const { session, order } = findSession(state, sessionId);

  return {
    id: session.id,
    reference: order.reference,
    status: session.status,
    lines: order.lines,
    deliveryFeeCentavos: order.deliveryFeeCentavos,
    totalCentavos: order.totalCentavos,
    methods: MOCK_SETTINGS.onlinePaymentMethods,
    holdExpiresAt: order.payment.holdExpiresAt ?? order.createdAt,
  };
}

export function completeCheckout(
  state: DemoState,
  ctx: MockContext,
  sessionId: string,
  outcome: DemoPaymentOutcome,
): { redirectTo: string | null } {
  const { session, order } = findSession(state, sessionId);

  if (session.status !== 'OPEN' || order.status !== 'AWAITING_PAYMENT') {
    throw new ApiError(409, 'ORDER_STATE_CHANGED', 'This payment session has already ended.');
  }

  if (outcome === 'FAILED') return { redirectTo: null };
  if (outcome === 'CANCELLED') {
    return { redirectTo: `/order/checkout?reference=${order.reference}&payment=cancelled` };
  }

  session.status = 'PAID';
  order.payment.status = 'PAID';
  pushStatus(order, 'CONFIRMED', ctx.now());
  emailOrder(
    state,
    ctx,
    order,
    `Payment received for ${order.reference}`,
    `Thanks, ${order.customer.name}. We received ${formatPeso(order.totalCentavos)}. Your order will be ready around ${formatDateTime(order.promisedAt)}.`,
  );

  return { redirectTo: `/order/paid?reference=${order.reference}` };
}
