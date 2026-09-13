import { useSyncExternalStore } from 'react';

/**
 * Reads `token` from a "#token=…" fragment. The fragment never reaches the
 * site's server, its logs, or a Referer header.
 */
export function readFragmentToken(hash: string): string | null {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
  const token = new URLSearchParams(fragment).get('token')?.trim();
  return token ? token : null;
}

function subscribeToLocation(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  window.addEventListener('popstate', onChange);
  return () => {
    window.removeEventListener('hashchange', onChange);
    window.removeEventListener('popstate', onChange);
  };
}

const serverSnapshot = () => null;

/** window.location.hash; null during the server render and hydration. */
export function useLocationHash(): string | null {
  return useSyncExternalStore(subscribeToLocation, () => window.location.hash, serverSnapshot);
}

/**
 * window.location.search; null during the server render and hydration. Used
 * instead of useSearchParams, which would force a Suspense boundary on every
 * statically rendered page that reads it.
 */
export function useLocationSearch(): string | null {
  return useSyncExternalStore(subscribeToLocation, () => window.location.search, serverSnapshot);
}
