import type { QueryKey } from '@tanstack/react-query';
import { venue } from '@/content/venue';
import { ApiError } from '@/lib/api/client';
import type { FieldErrors } from '@/lib/forms/useValidatedForm';
import type { CheckoutValues } from './checkoutForm';
import { orderingKeys } from './queryKeys';
import type { Quote } from './types';
import { CHECKOUT_FIELD_ERRORS, lineFieldErrors, mapFieldErrors } from './validation/serverErrors';

export const CHECKOUT_FAILED = `We couldn’t place your order. Please try again, or call us on ${venue.phone}.`;

const QUOTES: QueryKey = ['ordering', 'quote'];

export type CheckoutNotice =
  | { kind: 'priceChanged'; quote: Quote }
  | { kind: 'belowMinimum'; message: string }
  | { kind: 'closed'; message: string };

export interface CheckoutErrorOutcome {
  fieldErrors: FieldErrors<CheckoutValues>;
  /** Messages for cart lines, by line index. */
  lineErrors: Record<number, string>;
  alert: string | null;
  notice: CheckoutNotice | null;
  /** Cached data the refusal has shown to be stale. */
  refetch: QueryKey[];
}

export function fixFieldsMessage(count: number): string {
  return `Please fix the ${count} highlighted ${count === 1 ? 'field' : 'fields'}.`;
}

/** What checkout shows for each refusal in the spec's "Error handling" table. */
export function checkoutErrorOutcome(error: unknown, values: CheckoutValues): CheckoutErrorOutcome {
  const none: CheckoutErrorOutcome = { fieldErrors: {}, lineErrors: {}, alert: null, notice: null, refetch: [] };
  if (!(error instanceof ApiError)) return { ...none, alert: CHECKOUT_FAILED };

  switch (error.errorCode) {
    case 'PRICE_CHANGED': {
      const quote = error.extras.quote as Quote | undefined;
      return quote
        ? { ...none, notice: { kind: 'priceChanged', quote }, refetch: [orderingKeys.menu] }
        : { ...none, alert: CHECKOUT_FAILED, refetch: [orderingKeys.menu, QUOTES] };
    }

    case 'ITEM_UNAVAILABLE': {
      const lineErrors: Record<number, string> = {};
      Object.keys(lineFieldErrors(error.fieldErrors)).forEach((index) => {
        lineErrors[Number(index)] = 'No longer available';
      });
      return {
        ...none,
        lineErrors,
        alert: 'Some items are no longer available. Remove them to continue.',
        refetch: [orderingKeys.menu, QUOTES],
      };
    }

    case 'SLOT_FULL': {
      const message = 'That time just filled up. Choose another.';
      return {
        ...none,
        fieldErrors: values.timeMode === 'SCHEDULED' ? { startsAt: message } : { timeMode: message },
        refetch: [orderingKeys.slotsRoot],
      };
    }

    case 'SLOT_NOT_OFFERED':
      return {
        ...none,
        fieldErrors: { startsAt: 'That time is no longer available' },
        refetch: [orderingKeys.slotsRoot],
      };

    case 'BELOW_MINIMUM_ORDER':
      return { ...none, notice: { kind: 'belowMinimum', message: error.message }, refetch: [QUOTES] };

    case 'PAYMENT_METHOD_NOT_ALLOWED': {
      const mapped = mapFieldErrors(error.fieldErrors, CHECKOUT_FIELD_ERRORS);
      return { ...none, fieldErrors: { paymentMethod: mapped.paymentMethod ?? error.message }, refetch: [QUOTES] };
    }

    case 'ORDERING_PAUSED':
    case 'ORDERING_CLOSED':
      return {
        ...none,
        notice: { kind: 'closed', message: error.message },
        refetch: [orderingKeys.status, orderingKeys.slotsRoot],
      };

    case 'PAYMENT_PROVIDER_UNAVAILABLE':
      return {
        ...none,
        alert: 'Online payment is unavailable right now. Choose another way to pay or try again.',
      };

    case 'VALIDATION_FAILED':
    case 'DELIVERY_AREA_UNAVAILABLE': {
      const fieldErrors = mapFieldErrors(error.fieldErrors, CHECKOUT_FIELD_ERRORS);
      const lineErrors = lineFieldErrors(error.fieldErrors);
      const count = Object.keys(fieldErrors).length + Object.keys(lineErrors).length;
      return { ...none, fieldErrors, lineErrors, alert: count > 0 ? fixFieldsMessage(count) : CHECKOUT_FAILED };
    }

    case 'RATE_LIMITED':
      return { ...none, alert: 'Too many attempts. Please wait a minute and try again.' };

    default:
      return { ...none, alert: CHECKOUT_FAILED };
  }
}
