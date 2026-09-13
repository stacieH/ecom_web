import { MockOrderingClient } from '@/lib/ordering/mock/MockOrderingClient';
import type { StorageLike } from '@/lib/ordering/mock/mockStore';
import type { RegisterInput } from '@/lib/ordering/types';

export class MemoryStorage implements StorageLike {
  items = new Map<string, string>();
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
}

/** Friday 2 October 2026, 5:00 PM in Manila: the venue opens at 5:30 PM. */
export const FRIDAY_5PM = new Date('2026-10-02T09:00:00Z');

// jsdom has no Web Crypto; the demo hash only has to be deterministic here.
export const testHash = (password: string, salt: string) => Promise.resolve(`${salt}:${password}`);

export function createTestClient(options: { storage?: StorageLike; start?: Date } = {}) {
  let current = options.start ?? FRIDAY_5PM;
  const clock = {
    now: () => current,
    set: (date: Date) => {
      current = date;
    },
    advanceMinutes: (minutes: number) => {
      current = new Date(current.getTime() + minutes * 60_000);
    },
  };

  const client = new MockOrderingClient({
    storage: options.storage ?? new MemoryStorage(),
    now: clock.now,
    delayMs: () => 0,
    hashPassword: testHash,
  });

  return { client, clock };
}

export function tokenFromLink(href: string): string {
  return new URLSearchParams(href.split('#')[1] ?? '').get('token') ?? '';
}

export const DEFAULT_CUSTOMER: RegisterInput = {
  name: 'Alex Rivera',
  email: 'alex@example.com',
  phone: '+63 917 555 0142',
  password: 'copper-lantern-42',
};

/** Registers, opens the verification link from the demo outbox, and signs in. */
export async function registerVerifiedCustomer(
  client: MockOrderingClient,
  overrides: Partial<RegisterInput> = {},
) {
  const input = { ...DEFAULT_CUSTOMER, ...overrides };
  await client.register(input);
  const [email] = await client.demo.getOutbox();
  await client.verifyEmail(tokenFromLink(email.links[0].href));
  const customer = await client.signIn(input.email, input.password);
  return { input, customer };
}
