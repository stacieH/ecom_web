const INSIDE_PORTAL = /^\/(order|account)([/?#]|$)/;

/**
 * Where sign-in returns to. Only a path inside the ordering or account pages
 * is followed, so a crafted link cannot send a guest to another site or loop
 * back to sign-in.
 */
export function safeNextPath(next: string | null): string {
  if (!next || !INSIDE_PORTAL.test(next) || next.startsWith('/account/sign-in')) {
    return '/account';
  }
  return next;
}
