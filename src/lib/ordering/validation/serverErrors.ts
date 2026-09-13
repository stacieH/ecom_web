// Maps API fieldErrors keys (docs/superpowers/specs/2026-09-13-guest-ordering-portal-design.md,
// "Server fieldErrors mapping") onto form field names.
export const CHECKOUT_FIELD_ERRORS = {
  'customer.name': 'name',
  'customer.email': 'email',
  'customer.phone': 'phone',
  'delivery.areaId': 'areaId',
  'delivery.street': 'street',
  'delivery.building': 'building',
  'delivery.landmark': 'landmark',
  'delivery.instructions': 'instructions',
  'timing.startsAt': 'startsAt',
  paymentMethod: 'paymentMethod',
  notes: 'notes',
} as const;

export const ACCOUNT_FIELD_ERRORS = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  password: 'password',
  currentPassword: 'currentPassword',
  label: 'label',
  areaId: 'areaId',
  street: 'street',
  building: 'building',
  landmark: 'landmark',
  instructions: 'instructions',
} as const;

export function mapFieldErrors<Field extends string>(
  fieldErrors: Record<string, string[]>,
  table: Record<string, Field>,
): Partial<Record<Field, string>> {
  const mapped: Partial<Record<Field, string>> = {};

  Object.entries(fieldErrors).forEach(([key, messages]) => {
    const field = table[key];
    if (field && messages[0] && !mapped[field]) {
      mapped[field] = messages[0];
    }
  });

  return mapped;
}

const LINE_KEY = /^lines\.(\d+)\./;

/** The first message for each cart line, keyed by line index. */
export function lineFieldErrors(fieldErrors: Record<string, string[]>): Record<number, string> {
  const lines: Record<number, string> = {};

  Object.entries(fieldErrors).forEach(([key, messages]) => {
    const match = LINE_KEY.exec(key);
    if (match && messages[0]) {
      const index = Number(match[1]);
      lines[index] ??= messages[0];
    }
  });

  return lines;
}
