// One key per identical request. Resending the same key after a network failure
// lets the API answer with the order it already made instead of making another.
export function newIdempotencyKey(): string {
  const cryptoApi: Partial<Crypto> | undefined = globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  if (typeof cryptoApi?.getRandomValues === 'function') {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  throw new Error('Secure random numbers are unavailable');
}
