import type { FieldRules } from '@/lib/forms/useValidatedForm';
import type {
  Customer,
  DeliveryArea,
  Fulfilment,
  OrderDraft,
  OrderingStatus,
  PaymentMethod,
  PlaceOrderRequest,
  Quote,
  Slot,
} from './types';
import {
  addressLabelRule,
  areaRule,
  buildingRule,
  consentRule,
  emailRule,
  fulfilmentRule,
  instructionsRule,
  landmarkRule,
  nameRule,
  orderNotesRule,
  paymentMethodRule,
  phoneRule,
  scheduledTimeRule,
  streetRule,
  timeModeRule,
} from './validation/rules';

/** The addressChoice value for typing a new address instead of picking a saved one. */
export const NEW_ADDRESS = 'new';

/** 3A's default payment hold. The order summary carries no hold time of its own. */
export const PAYMENT_HOLD_MINUTES = 15;

const MINUTE = 60_000;
const SLOT_MINUTES = 15;

export interface CheckoutValues {
  fulfilment: Fulfilment | '';
  timeMode: 'ASAP' | 'SCHEDULED' | '';
  startsAt: string;
  addressChoice: string;
  areaId: string;
  street: string;
  building: string;
  landmark: string;
  instructions: string;
  saveAddress: boolean;
  addressLabel: string;
  name: string;
  email: string;
  phone: string;
  paymentMethod: PaymentMethod | '';
  notes: string;
  consent: boolean;
}

export interface CheckoutContext {
  signedIn: boolean;
  status: OrderingStatus | undefined;
  /** Every slot offered today and tomorrow, or null while they load. */
  slots: Slot[] | null;
  areas: DeliveryArea[] | null;
  quote: Quote | undefined;
}

export function initialCheckoutValues({
  fulfilment,
  areaId,
  customer,
}: {
  fulfilment: Fulfilment;
  areaId: string | null;
  customer: Customer | null;
}): CheckoutValues {
  return {
    fulfilment,
    timeMode: '',
    startsAt: '',
    addressChoice: NEW_ADDRESS,
    areaId: areaId ?? '',
    street: '',
    building: '',
    landmark: '',
    instructions: '',
    saveAddress: false,
    addressLabel: '',
    name: customer?.name ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
    paymentMethod: '',
    notes: '',
    consent: false,
  };
}

/** Field rules in page order, so the first invalid field is the first on the page. */
export function checkoutRules(context: CheckoutContext): FieldRules<CheckoutValues> {
  const forDelivery =
    (rule: (value: string) => string | undefined) =>
    (value: string, values: CheckoutValues) =>
      values.fulfilment === 'DELIVERY' ? rule(value) : undefined;

  return {
    fulfilment: (value) =>
      fulfilmentRule(value, {
        pickup: context.status?.pickupEnabled ?? true,
        delivery: context.status?.deliveryEnabled ?? true,
      }),
    timeMode: (value) => timeModeRule(value),
    startsAt: (value, values) =>
      scheduledTimeRule(value || null, {
        mode: values.timeMode,
        fulfilment: values.fulfilment || 'PICKUP',
        slots: context.slots,
      }),
    areaId: forDelivery((value) => areaRule(value, context.areas)),
    street: forDelivery(streetRule),
    building: forDelivery(buildingRule),
    landmark: forDelivery(landmarkRule),
    instructions: forDelivery(instructionsRule),
    addressLabel: (value, values) =>
      context.signedIn &&
      values.fulfilment === 'DELIVERY' &&
      values.addressChoice === NEW_ADDRESS &&
      values.saveAddress
        ? addressLabelRule(value)
        : undefined,
    name: (value) => nameRule(value),
    email: (value) => emailRule(value),
    phone: (value) => phoneRule(value),
    paymentMethod: (value, values) =>
      paymentMethodRule(value, {
        fulfilment: values.fulfilment || 'PICKUP',
        totalCentavos: context.quote?.totalCentavos ?? 0,
        allowed: context.quote?.paymentMethods ?? null,
        cashOnDeliveryMaxCentavos: context.status?.cashOnDeliveryMaxCentavos ?? 0,
      }),
    notes: (value) => orderNotesRule(value),
    consent: (value) => (context.signedIn ? undefined : consentRule(value)),
  };
}

export function toPlaceOrderRequest(values: CheckoutValues, draft: OrderDraft, quote: Quote): PlaceOrderRequest {
  const delivery = values.fulfilment === 'DELIVERY';

  return {
    fulfilment: delivery ? 'DELIVERY' : 'PICKUP',
    delivery: delivery
      ? {
          areaId: values.areaId,
          street: values.street.trim(),
          building: values.building.trim(),
          landmark: values.landmark.trim(),
          instructions: values.instructions.trim(),
        }
      : null,
    lines: draft.lines,
    timing:
      values.timeMode === 'SCHEDULED' ? { mode: 'SCHEDULED', startsAt: values.startsAt } : { mode: 'ASAP' },
    customer: { name: values.name.trim(), email: values.email.trim(), phone: values.phone.trim() },
    paymentMethod: values.paymentMethod as PaymentMethod,
    expectedTotalCentavos: quote.totalCentavos,
    notes: values.notes.trim(),
  };
}

/** Pickup is promised at the slot start, delivery at its end (3A "Slots"). */
export function promisedTime(fulfilment: Fulfilment | '', slotStart: string): string {
  const start = Date.parse(slotStart);
  return new Date(fulfilment === 'DELIVERY' ? start + SLOT_MINUTES * MINUTE : start).toISOString();
}

export function holdEndsAt(createdAt: string): string {
  return new Date(Date.parse(createdAt) + PAYMENT_HOLD_MINUTES * MINUTE).toISOString();
}
