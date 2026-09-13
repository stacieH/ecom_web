import { newIdempotencyKey } from '@/lib/api/idempotency';

describe('newIdempotencyKey', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  function stubCrypto(value: unknown) {
    Object.defineProperty(globalThis, 'crypto', { value, configurable: true, writable: true });
  }

  afterEach(() => {
    if (descriptor) {
      Object.defineProperty(globalThis, 'crypto', descriptor);
    } else {
      delete (globalThis as { crypto?: Crypto }).crypto;
    }
  });

  it('uses randomUUID when the browser has it', () => {
    stubCrypto({ randomUUID: () => '3b241101-e2bb-4255-8caf-4136c566a962' });
    expect(newIdempotencyKey()).toBe('3b241101-e2bb-4255-8caf-4136c566a962');
  });

  it('falls back to 32 random hex characters from getRandomValues', () => {
    stubCrypto({
      getRandomValues: (array: Uint8Array) => {
        array.fill(171);
        return array;
      },
    });
    expect(newIdempotencyKey()).toBe('ab'.repeat(16));
  });

  it('fails loudly without a secure random source', () => {
    stubCrypto({});
    expect(() => newIdempotencyKey()).toThrow('Secure random numbers are unavailable');
  });
});
