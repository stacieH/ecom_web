import type { DemoEmail } from '../types';
import type { DemoState } from './mockStore';

export interface MockContext {
  store: { read(): DemoState; update<T>(change: (state: DemoState) => T): T; reset(): void };
  now: () => Date;
  random: () => number;
  hashPassword: (password: string, salt: string) => Promise<string>;
}

// Crockford base32: no I, L, O, or U, so references read back over the phone.
const REFERENCE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const TOKEN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function randomString(random: () => number, length: number, alphabet: string): string {
  let result = '';
  for (let index = 0; index < length; index += 1) {
    result += alphabet[Math.min(alphabet.length - 1, Math.floor(random() * alphabet.length))];
  }
  return result;
}

export function newReference(ctx: MockContext): string {
  return `O-${randomString(ctx.random, 6, REFERENCE_ALPHABET)}`;
}

/** 43 characters, the length of 32 random bytes in base64url, like the API's tokens. */
export function newToken(ctx: MockContext): string {
  return randomString(ctx.random, 43, TOKEN_ALPHABET);
}

export function newId(ctx: MockContext, prefix: string): string {
  return `${prefix}-${randomString(ctx.random, 12, ID_ALPHABET)}`;
}

/** Demo password hashing. Browsers provide Web Crypto on https and localhost. */
export async function sha256Hash(password: string, salt: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof TextEncoder === 'undefined') {
    throw new Error('Demo accounts need a secure context (https or localhost)');
  }

  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${password}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function queueEmail(
  state: DemoState,
  ctx: MockContext,
  email: Omit<DemoEmail, 'id' | 'sentAt'>,
): void {
  state.outbox.unshift({ id: newId(ctx, 'mail'), sentAt: ctx.now().toISOString(), ...email });
}
