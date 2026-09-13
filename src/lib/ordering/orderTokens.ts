import { useSyncExternalStore } from 'react';

// Keeps each order's tracking token for this tab, so /order/paid and a
// cancelled payment can find the order again. The token never goes into a
// query string, where it would reach server logs.
const PREFIX = 'cs-order-token:';

export function rememberOrderToken(reference: string, token: string): void {
  try {
    window.sessionStorage.setItem(`${PREFIX}${reference}`, token);
  } catch {
    // Storage is blocked: the confirmation email still carries the tracking link.
  }
}

export function recallOrderToken(reference: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(`${PREFIX}${reference}`);
  } catch {
    return null;
  }
}

const noSubscription = () => () => undefined;

/** The remembered token for `reference`; undefined until hydrated, null when there is none. */
export function useRememberedToken(reference: string | null): string | null | undefined {
  return useSyncExternalStore(
    noSubscription,
    () => (reference ? recallOrderToken(reference) : null),
    () => undefined,
  );
}
