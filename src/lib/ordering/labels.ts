import { formatPeso } from '@/lib/money';
import type { DeliveryArea, Fulfilment, PaymentMethod, PaymentStatus, PricedLine } from './types';

export const FULFILMENT_LABELS: Record<Fulfilment, string> = {
  PICKUP: 'Pickup',
  DELIVERY: 'Delivery',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  ONLINE: 'Pay online',
  PAY_AT_PICKUP: 'Pay at pickup',
  CASH_ON_DELIVERY: 'Cash on delivery',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: 'Not paid yet',
  PENDING: 'Waiting for payment',
  PAID: 'Paid',
  REFUND_PENDING: 'Refund on its way',
  REFUNDED: 'Refunded',
  REFUND_FAILED: 'Refund delayed; we’ll contact you',
};

/** PayMongo method codes, as the demo payment page names them. */
export const ONLINE_METHOD_LABELS: Record<string, string> = {
  gcash: 'GCash',
  paymaya: 'Maya',
  card: 'Card',
  qrph: 'QR Ph',
};

export function areaOptionLabel(area: DeliveryArea): string {
  return `${area.name} · ${formatPeso(area.feeCentavos)} delivery · ${formatPeso(area.minOrderCentavos)} minimum`;
}

export function optionSummary(line: PricedLine): string {
  return line.options.map((option) => `${option.groupName}: ${option.optionName}`).join(', ');
}
