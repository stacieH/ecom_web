// Field rules for the ordering portal. Every message is copied from the field
// tables in docs/superpowers/specs/2026-09-13-guest-ordering-portal-design.md.
import { isEmail } from '@/lib/email';
import { formatPeso } from '@/lib/money';
import { isReachablePhone } from '@/lib/phone';
import type { DeliveryArea, Fulfilment, MenuOptionGroup, PaymentMethod, Slot } from '../types';

export const LIMITS = {
  name: 80,
  street: 160,
  building: 120,
  landmark: 120,
  instructions: 200,
  notes: 500,
  addressLabel: 40,
  lineNote: 140,
  maxQuantity: 20,
  maxItems: 30,
} as const;

export function nameRule(value: string): string | undefined {
  const name = value.trim();
  if (!name) return 'Please tell us your name';
  if (name.length > LIMITS.name) return 'Keep your name under 80 characters';
  return undefined;
}

export function emailRule(value: string): string | undefined {
  return isEmail(value) ? undefined : 'Enter a valid email address';
}

export function phoneRule(value: string): string | undefined {
  return isReachablePhone(value) ? undefined : 'Enter a phone number we can reach you on';
}

export function consentRule(checked: boolean): string | undefined {
  return checked ? undefined : 'Please agree to the privacy notice';
}

export function fulfilmentRule(
  value: Fulfilment | '',
  enabled: { pickup: boolean; delivery: boolean },
): string | undefined {
  if (!value) return 'Choose pickup or delivery';
  if (value === 'PICKUP' && !enabled.pickup) return 'Choose pickup or delivery';
  if (value === 'DELIVERY' && !enabled.delivery) return 'Choose pickup or delivery';
  return undefined;
}

export function timeModeRule(mode: 'ASAP' | 'SCHEDULED' | ''): string | undefined {
  return mode ? undefined : 'Choose when you’d like your order';
}

export function scheduledTimeRule(
  startsAt: string | null,
  context: { mode: 'ASAP' | 'SCHEDULED' | ''; fulfilment: Fulfilment; slots: Slot[] | null },
): string | undefined {
  if (context.mode !== 'SCHEDULED') return undefined;
  if (!startsAt) {
    return context.fulfilment === 'DELIVERY' ? 'Choose a delivery time' : 'Choose a pickup time';
  }
  // Without a loaded slot list there is nothing to compare against yet.
  if (context.slots && !context.slots.some((slot) => slot.startsAt === startsAt && slot.available)) {
    return 'That time is no longer available';
  }
  return undefined;
}

export function addressLabelRule(value: string): string | undefined {
  const label = value.trim();
  if (!label) return 'Give this address a name';
  if (label.length > LIMITS.addressLabel) return 'Keep the name under 40 characters';
  return undefined;
}

export function areaRule(areaId: string, areas: DeliveryArea[] | null): string | undefined {
  if (!areaId) return 'Choose a delivery area';
  if (areas && !areas.some((area) => area.id === areaId)) return 'Choose a delivery area';
  return undefined;
}

export function streetRule(value: string): string | undefined {
  const street = value.trim();
  if (!street) return 'Enter your street address';
  if (street.length > LIMITS.street) return 'Keep the street address under 160 characters';
  return undefined;
}

export function buildingRule(value: string): string | undefined {
  return value.trim().length > LIMITS.building
    ? 'Keep the building details under 120 characters'
    : undefined;
}

export function landmarkRule(value: string): string | undefined {
  const landmark = value.trim();
  if (!landmark) return 'Add a landmark so our rider can find you';
  if (landmark.length > LIMITS.landmark) return 'Keep the landmark under 120 characters';
  return undefined;
}

export function instructionsRule(value: string): string | undefined {
  return value.trim().length > LIMITS.instructions
    ? 'Keep the instructions under 200 characters'
    : undefined;
}

export interface PaymentRuleContext {
  fulfilment: Fulfilment;
  totalCentavos: number;
  /** Methods the latest quote allows; null before the first quote. */
  allowed: PaymentMethod[] | null;
  cashOnDeliveryMaxCentavos: number;
}

export function paymentMethodRule(
  method: PaymentMethod | '',
  context: PaymentRuleContext,
): string | undefined {
  if (!method) return 'Choose how you’ll pay';
  if (method === 'PAY_AT_PICKUP' && context.fulfilment === 'DELIVERY') {
    return 'Pay at pickup is only for pickup orders';
  }
  if (
    method === 'CASH_ON_DELIVERY' &&
    context.fulfilment === 'DELIVERY' &&
    context.totalCentavos > context.cashOnDeliveryMaxCentavos
  ) {
    return `Cash on delivery is available for orders up to ${formatPeso(context.cashOnDeliveryMaxCentavos)}`;
  }
  if (context.allowed && !context.allowed.includes(method)) return 'Choose how you’ll pay';
  return undefined;
}

export function orderNotesRule(value: string): string | undefined {
  return value.length > LIMITS.notes ? 'Keep notes under 500 characters' : undefined;
}

export function optionGroupRule(group: MenuOptionGroup, selectedIds: string[]): string | undefined {
  const chosen = group.options.filter((option) => selectedIds.includes(option.id));
  const noun = group.name.toLowerCase();

  if (chosen.length < group.minSelect) {
    return group.minSelect === 1 ? `Choose a ${noun}` : `Choose at least ${group.minSelect} ${noun}`;
  }
  if (chosen.length > group.maxSelect) return `Choose up to ${group.maxSelect} ${noun}`;
  if (chosen.some((option) => option.soldOut)) return 'This option is sold out';
  return undefined;
}

export function quantityRule(quantity: number): string | undefined {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= LIMITS.maxQuantity
    ? undefined
    : 'Choose a quantity from 1 to 20';
}

export function lineNoteRule(note: string): string | undefined {
  return note.length > LIMITS.lineNote ? 'Keep the note under 140 characters' : undefined;
}

export function cartItemsRule(totalItems: number): string | undefined {
  if (totalItems < 1) return 'Your order is empty';
  if (totalItems > LIMITS.maxItems) return 'Orders are limited to 30 items';
  return undefined;
}

export function minimumOrderMessage(context: {
  areaName: string;
  subtotalCentavos: number;
  minimumOrderCentavos: number | null;
}): string | undefined {
  const { areaName, subtotalCentavos, minimumOrderCentavos } = context;
  if (minimumOrderCentavos === null || subtotalCentavos >= minimumOrderCentavos) return undefined;

  return `Add ${formatPeso(minimumOrderCentavos - subtotalCentavos)} more to reach ${areaName}’s ${formatPeso(minimumOrderCentavos)} minimum`;
}
