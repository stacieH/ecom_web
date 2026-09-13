// Demo customer accounts, following the 3A spec's "Customer accounts" rules.
// Async steps (password hashing) run before a store update, never inside one,
// because DemoStore.update is synchronous.
import { ApiError } from '@/lib/api/client';
import type { AddressInput, Customer, OrderPage, RegisterInput, SavedAddress } from '../types';
import { newPasswordRule } from '../validation/accountRules';
import {
  addressLabelRule,
  areaRule,
  buildingRule,
  emailRule,
  instructionsRule,
  landmarkRule,
  nameRule,
  phoneRule,
  streetRule,
} from '../validation/rules';
import { MockContext, newId, newToken, queueEmail } from './mockContext';
import { MOCK_DELIVERY_AREAS } from './mockData';
import { toSummary } from './mockOrders';
import type { DemoState, StoredCustomer, StoredOrder, StoredToken } from './mockStore';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const LOCK_AFTER_FAILURES = 10;
const LOCK_MINUTES = 15;
const MAX_ADDRESSES = 5;
const PAGE_SIZE = 10;

const normaliseEmail = (email: string) => email.trim().toLowerCase();

function fieldErrors(entries: [string, string | undefined][]): Record<string, string[]> {
  return Object.fromEntries(
    entries.filter((entry): entry is [string, string] => Boolean(entry[1])).map(([key, message]) => [key, [message]]),
  );
}

function throwIfInvalid(errors: Record<string, string[]>): void {
  if (Object.keys(errors).length > 0) {
    throw new ApiError(422, 'VALIDATION_FAILED', 'Please check the highlighted fields.', errors);
  }
}

export function toCustomer(stored: StoredCustomer): Customer {
  return {
    id: stored.id,
    name: stored.name,
    email: stored.email,
    phone: stored.phone,
    emailVerified: stored.emailVerifiedAt !== null,
  };
}

export function requireSession(state: DemoState): StoredCustomer {
  const customer = state.customers.find((candidate) => candidate.id === state.sessionCustomerId);
  if (!customer) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in.');
  }
  return customer;
}

export function customerOrder(state: DemoState, customerId: string, reference: string): StoredOrder {
  const order = state.orders.find(
    (candidate) => candidate.reference === reference && candidate.customer.accountId === customerId,
  );
  if (!order) {
    throw new ApiError(404, 'ORDER_NOT_FOUND', 'We couldn’t find that order.');
  }
  return order;
}

function issueToken(
  state: DemoState,
  ctx: MockContext,
  customer: StoredCustomer,
  type: StoredToken['type'],
): string {
  const token = newToken(ctx);
  const lifetime = type === 'VERIFY_EMAIL' ? 24 * HOUR : HOUR;
  state.tokens.push({
    token,
    customerId: customer.id,
    type,
    expiresAt: new Date(ctx.now().getTime() + lifetime).toISOString(),
    usedAt: null,
  });
  return token;
}

function sendVerification(state: DemoState, ctx: MockContext, customer: StoredCustomer): void {
  const token = issueToken(state, ctx, customer, 'VERIFY_EMAIL');
  queueEmail(state, ctx, {
    to: customer.email,
    subject: 'Verify your email',
    body: `Hi ${customer.name}, confirm your email to finish creating your Cinder & Salt account.`,
    links: [{ label: 'Verify your email', href: `/account/verify-email#token=${token}` }],
  });
}

function validToken(state: DemoState, ctx: MockContext, token: string, type: StoredToken['type']): StoredToken {
  const record = state.tokens.find((candidate) => candidate.token === token && candidate.type === type);
  if (!record || record.usedAt || Date.parse(record.expiresAt) <= ctx.now().getTime()) {
    throw new ApiError(400, 'INVALID_OR_EXPIRED_TOKEN', 'This link has expired or was already used.');
  }
  return record;
}

export async function register(ctx: MockContext, input: RegisterInput): Promise<void> {
  throwIfInvalid(
    fieldErrors([
      ['name', nameRule(input.name)],
      ['email', emailRule(input.email)],
      ['phone', phoneRule(input.phone)],
      ['password', newPasswordRule(input.password, input.email)],
    ]),
  );

  const salt = newToken(ctx);
  const passwordHash = await ctx.hashPassword(input.password, salt);
  const email = normaliseEmail(input.email);

  ctx.store.update((state) => {
    const existing = state.customers.find((candidate) => candidate.email === email);
    if (existing) {
      queueEmail(state, ctx, {
        to: email,
        subject: 'You already have a Cinder & Salt account',
        body: 'Someone tried to create an account with this email. If it was you, sign in or reset your password.',
        links: [
          { label: 'Sign in', href: '/account/sign-in' },
          { label: 'Reset your password', href: '/account/forgot-password' },
        ],
      });
      return;
    }

    const customer: StoredCustomer = {
      id: newId(ctx, 'cust'),
      name: input.name.trim(),
      email,
      phone: input.phone.trim(),
      passwordHash,
      salt,
      emailVerifiedAt: null,
      failedLogins: 0,
      lockedUntil: null,
      addresses: [],
      createdAt: ctx.now().toISOString(),
    };
    state.customers.push(customer);
    sendVerification(state, ctx, customer);
  });
}

export async function verifyEmail(ctx: MockContext, token: string): Promise<void> {
  ctx.store.update((state) => {
    const record = validToken(state, ctx, token, 'VERIFY_EMAIL');
    const customer = state.customers.find((candidate) => candidate.id === record.customerId);
    if (!customer) {
      throw new ApiError(400, 'INVALID_OR_EXPIRED_TOKEN', 'This link has expired or was already used.');
    }

    record.usedAt = ctx.now().toISOString();
    customer.emailVerifiedAt = ctx.now().toISOString();
    state.orders.forEach((order) => {
      if (order.customer.accountId === null && normaliseEmail(order.customer.email) === customer.email) {
        order.customer.accountId = customer.id;
      }
    });
  });
}

export async function resendVerification(ctx: MockContext, email: string): Promise<void> {
  ctx.store.update((state) => {
    const customer = state.customers.find((candidate) => candidate.email === normaliseEmail(email));
    if (customer && customer.emailVerifiedAt === null) {
      sendVerification(state, ctx, customer);
    }
  });
}

export async function signIn(ctx: MockContext, email: string, password: string): Promise<Customer> {
  const now = ctx.now().getTime();
  const snapshot = ctx.store.read();
  const found = snapshot.customers.find((candidate) => candidate.email === normaliseEmail(email));

  if (found?.lockedUntil && Date.parse(found.lockedUntil) > now) {
    throw new ApiError(423, 'ACCOUNT_LOCKED', 'Too many attempts.');
  }

  const attemptHash = found ? await ctx.hashPassword(password, found.salt) : null;

  // Failed attempts must be saved, so this update returns an outcome instead of
  // throwing (a throw would discard the counter).
  const outcome = ctx.store.update((state) => {
    const customer = found && state.customers.find((candidate) => candidate.id === found.id);
    if (!customer || attemptHash !== customer.passwordHash) {
      if (customer) {
        customer.failedLogins += 1;
        if (customer.failedLogins >= LOCK_AFTER_FAILURES) {
          customer.failedLogins = 0;
          customer.lockedUntil = new Date(now + LOCK_MINUTES * MINUTE).toISOString();
        }
      }
      return { kind: 'wrong' as const };
    }
    if (customer.emailVerifiedAt === null) {
      return { kind: 'unverified' as const };
    }

    customer.failedLogins = 0;
    customer.lockedUntil = null;
    state.sessionCustomerId = customer.id;
    return { kind: 'ok' as const, customer: toCustomer(customer) };
  });

  if (outcome.kind === 'wrong') {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Email or password is incorrect.');
  }
  if (outcome.kind === 'unverified') {
    throw new ApiError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email first.');
  }
  return outcome.customer;
}

export function getSession(ctx: MockContext): Customer | null {
  const state = ctx.store.read();
  const customer = state.customers.find((candidate) => candidate.id === state.sessionCustomerId);
  return customer ? toCustomer(customer) : null;
}

export function signOut(ctx: MockContext): void {
  ctx.store.update((state) => {
    state.sessionCustomerId = null;
  });
}

export async function forgotPassword(ctx: MockContext, email: string): Promise<void> {
  ctx.store.update((state) => {
    const customer = state.customers.find((candidate) => candidate.email === normaliseEmail(email));
    if (!customer) return;

    const token = issueToken(state, ctx, customer, 'RESET_PASSWORD');
    queueEmail(state, ctx, {
      to: customer.email,
      subject: 'Reset your password',
      body: 'Use this link within an hour to choose a new password.',
      links: [{ label: 'Reset your password', href: `/account/reset-password#token=${token}` }],
    });
  });
}

export async function resetPassword(ctx: MockContext, token: string, password: string): Promise<void> {
  const snapshot = ctx.store.read();
  const record = validToken(snapshot, ctx, token, 'RESET_PASSWORD');
  const customer = snapshot.customers.find((candidate) => candidate.id === record.customerId);
  if (!customer) {
    throw new ApiError(400, 'INVALID_OR_EXPIRED_TOKEN', 'This link has expired or was already used.');
  }

  throwIfInvalid(fieldErrors([['password', newPasswordRule(password, customer.email)]]));

  const salt = newToken(ctx);
  const passwordHash = await ctx.hashPassword(password, salt);

  ctx.store.update((state) => {
    const fresh = validToken(state, ctx, token, 'RESET_PASSWORD');
    const stored = state.customers.find((candidate) => candidate.id === fresh.customerId);
    if (!stored) return;

    fresh.usedAt = ctx.now().toISOString();
    stored.salt = salt;
    stored.passwordHash = passwordHash;
    stored.failedLogins = 0;
    stored.lockedUntil = null;
    if (state.sessionCustomerId === stored.id) state.sessionCustomerId = null;
  });
}

export function updateProfile(ctx: MockContext, changes: { name?: string; phone?: string }): Customer {
  throwIfInvalid(
    fieldErrors([
      ['name', changes.name === undefined ? undefined : nameRule(changes.name)],
      ['phone', changes.phone === undefined ? undefined : phoneRule(changes.phone)],
    ]),
  );

  return ctx.store.update((state) => {
    const customer = requireSession(state);
    if (changes.name !== undefined) customer.name = changes.name.trim();
    if (changes.phone !== undefined) customer.phone = changes.phone.trim();
    return toCustomer(customer);
  });
}

async function checkPassword(ctx: MockContext, password: string, field: string, message: string) {
  const customer = requireSession(ctx.store.read());
  const hash = await ctx.hashPassword(password, customer.salt);
  if (hash !== customer.passwordHash) {
    throw new ApiError(422, 'VALIDATION_FAILED', message, { [field]: [message] });
  }
  return customer;
}

export async function changePassword(
  ctx: MockContext,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const customer = await checkPassword(ctx, currentPassword, 'currentPassword', 'Your current password is incorrect');
  throwIfInvalid(fieldErrors([['password', newPasswordRule(newPassword, customer.email)]]));

  const salt = newToken(ctx);
  const passwordHash = await ctx.hashPassword(newPassword, salt);

  ctx.store.update((state) => {
    const stored = requireSession(state);
    stored.salt = salt;
    stored.passwordHash = passwordHash;
  });
}

export async function deleteAccount(ctx: MockContext, password: string): Promise<void> {
  const customer = await checkPassword(ctx, password, 'password', 'Your password is incorrect');

  ctx.store.update((state) => {
    state.customers = state.customers.filter((candidate) => candidate.id !== customer.id);
    state.tokens = state.tokens.filter((candidate) => candidate.customerId !== customer.id);
    state.orders.forEach((order) => {
      if (order.customer.accountId === customer.id) order.customer.accountId = null;
    });
    state.sessionCustomerId = null;
  });
}

function validateAddress(input: AddressInput): Record<string, string[]> {
  return fieldErrors([
    ['label', addressLabelRule(input.label)],
    ['areaId', areaRule(input.areaId, MOCK_DELIVERY_AREAS)],
    ['street', streetRule(input.street)],
    ['building', buildingRule(input.building)],
    ['landmark', landmarkRule(input.landmark)],
    ['instructions', instructionsRule(input.instructions)],
  ]);
}

const trimAddress = (input: AddressInput): AddressInput => ({
  label: input.label.trim(),
  areaId: input.areaId,
  street: input.street.trim(),
  building: input.building.trim(),
  landmark: input.landmark.trim(),
  instructions: input.instructions.trim(),
});

export function listAddresses(ctx: MockContext): SavedAddress[] {
  return requireSession(ctx.store.read()).addresses;
}

export function createAddress(ctx: MockContext, input: AddressInput): SavedAddress {
  throwIfInvalid(validateAddress(input));

  return ctx.store.update((state) => {
    const customer = requireSession(state);
    if (customer.addresses.length >= MAX_ADDRESSES) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'You can save up to 5 addresses.');
    }
    const saved: SavedAddress = { id: newId(ctx, 'addr'), ...trimAddress(input) };
    customer.addresses.push(saved);
    return saved;
  });
}

export function updateAddress(ctx: MockContext, id: string, changes: Partial<AddressInput>): SavedAddress {
  return ctx.store.update((state) => {
    const customer = requireSession(state);
    const index = customer.addresses.findIndex((candidate) => candidate.id === id);
    if (index === -1) {
      throw new ApiError(404, 'NOT_FOUND', 'That address no longer exists.');
    }

    const current = customer.addresses[index];
    const merged: AddressInput = {
      label: changes.label ?? current.label,
      areaId: changes.areaId ?? current.areaId,
      street: changes.street ?? current.street,
      building: changes.building ?? current.building,
      landmark: changes.landmark ?? current.landmark,
      instructions: changes.instructions ?? current.instructions,
    };
    throwIfInvalid(validateAddress(merged));

    customer.addresses[index] = { id, ...trimAddress(merged) };
    return customer.addresses[index];
  });
}

export function deleteAddress(ctx: MockContext, id: string): void {
  ctx.store.update((state) => {
    const customer = requireSession(state);
    const remaining = customer.addresses.filter((candidate) => candidate.id !== id);
    if (remaining.length === customer.addresses.length) {
      throw new ApiError(404, 'NOT_FOUND', 'That address no longer exists.');
    }
    customer.addresses = remaining;
  });
}

export function listOrders(ctx: MockContext, cursor: string | null): OrderPage {
  const state = ctx.store.read();
  const customer = requireSession(state);
  const mine = state.orders.filter((order) => order.customer.accountId === customer.id).reverse();
  const start = cursor ? Number(cursor) : 0;
  const end = start + PAGE_SIZE;

  return {
    orders: mine.slice(start, end).map((order) => toSummary(order, ctx.now())),
    nextCursor: end < mine.length ? String(end) : null,
  };
}
