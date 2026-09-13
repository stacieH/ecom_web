import { TextEncoder as NodeTextEncoder } from 'util';
import {
  MockContext,
  newId,
  newReference,
  newToken,
  queueEmail,
  randomString,
  sha256Hash,
} from '@/lib/ordering/mock/mockContext';
import { DemoStore, emptyDemoState } from '@/lib/ordering/mock/mockStore';

function sequence(values: number[]) {
  let index = 0;
  return () => values[index++ % values.length];
}

const context = (random = sequence([0.1, 0.5, 0.9])): MockContext => ({
  store: new DemoStore(null),
  now: () => new Date('2026-10-02T09:00:00Z'),
  random,
  hashPassword: async (password, salt) => `${salt}:${password}`,
});

describe('mock context', () => {
  it('builds random strings from the given alphabet', () => {
    expect(randomString(sequence([0, 0.5, 0.99]), 3, 'ABCD')).toBe('ACD');
  });

  it('makes order references, tokens, and ids in their formats', () => {
    const ctx = context(Math.random);

    expect(newReference(ctx)).toMatch(/^O-[0-9A-HJKMNP-TV-Z]{6}$/);
    expect(newToken(ctx)).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newId(ctx, 'order')).toMatch(/^order-[a-z0-9]{12}$/);
  });

  it('adds demo emails newest first', () => {
    const ctx = context(Math.random);
    const state = emptyDemoState();

    queueEmail(state, ctx, { to: 'a@example.com', subject: 'First', body: '', links: [] });
    queueEmail(state, ctx, { to: 'a@example.com', subject: 'Second', body: '', links: [] });

    expect(state.outbox.map((email) => email.subject)).toEqual(['Second', 'First']);
    expect(state.outbox[0].sentAt).toBe('2026-10-02T09:00:00.000Z');
  });

  describe('sha256Hash', () => {
    const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    const encoderDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'TextEncoder');

    afterEach(() => {
      if (cryptoDescriptor) Object.defineProperty(globalThis, 'crypto', cryptoDescriptor);
      if (encoderDescriptor) {
        Object.defineProperty(globalThis, 'TextEncoder', encoderDescriptor);
      } else {
        delete (globalThis as { TextEncoder?: unknown }).TextEncoder;
      }
    });

    it('hashes the salted password with Web Crypto as hex', async () => {
      const digest = jest.fn(async () => new Uint8Array([0, 171, 255]).buffer);
      Object.defineProperty(globalThis, 'crypto', {
        value: { subtle: { digest } },
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, 'TextEncoder', {
        value: NodeTextEncoder,
        configurable: true,
        writable: true,
      });

      await expect(sha256Hash('secret', 'salt')).resolves.toBe('00abff');
      expect(digest).toHaveBeenCalledWith('SHA-256', expect.anything());
    });

    it('explains that demo accounts need a secure context', async () => {
      Object.defineProperty(globalThis, 'crypto', {
        value: {},
        configurable: true,
        writable: true,
      });

      await expect(sha256Hash('secret', 'salt')).rejects.toThrow(
        'Demo accounts need a secure context (https or localhost)',
      );
    });
  });
});
