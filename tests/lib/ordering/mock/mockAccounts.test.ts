import type { MockOrderingClient } from '@/lib/ordering/mock/MockOrderingClient';
import type { PlaceOrderRequest } from '@/lib/ordering/types';
import {
  createTestClient,
  DEFAULT_CUSTOMER,
  registerVerifiedCustomer,
  tokenFromLink,
} from '../../../helpers/mockOrdering';

const address = {
  label: 'Home',
  areaId: 'area-poblacion',
  street: '12 Jupiter Street',
  building: 'Unit 3B',
  landmark: 'Beside the bakery',
  instructions: '',
};

const pickup = (email = DEFAULT_CUSTOMER.email): PlaceOrderRequest => ({
  fulfilment: 'PICKUP',
  delivery: null,
  lines: [{ dishId: 'dish-tiramisu', quantity: 1, optionIds: [], note: '' }],
  timing: { mode: 'ASAP' },
  customer: { name: 'Alex Rivera', email, phone: '+63 917 555 0142' },
  paymentMethod: 'PAY_AT_PICKUP',
  expectedTotalCentavos: 36000,
  notes: '',
});

async function rejection(promise: Promise<unknown>) {
  return promise.then(
    () => {
      throw new Error('Expected a rejection');
    },
    (error: unknown) => error,
  );
}

async function latestLink(client: MockOrderingClient) {
  const [email] = await client.demo.getOutbox();
  return email.links[0].href;
}

describe('registration and verification', () => {
  it('validates every registration field', async () => {
    const { client } = createTestClient();

    await expect(
      rejection(client.register({ name: '', email: 'alex@', phone: '12', password: 'short' })),
    ).resolves.toMatchObject({
      errorCode: 'VALIDATION_FAILED',
      fieldErrors: {
        name: ['Please tell us your name'],
        email: ['Enter a valid email address'],
        phone: ['Enter a phone number we can reach you on'],
        password: ['Use at least 10 characters'],
      },
    });
  });

  it('sends a verification link and refuses sign-in until it is opened', async () => {
    const { client } = createTestClient();

    await client.register(DEFAULT_CUSTOMER);

    const [email] = await client.demo.getOutbox();
    expect(email).toMatchObject({ to: 'alex@example.com', subject: 'Verify your email' });
    expect(email.links[0].href).toMatch(/^\/account\/verify-email#token=/);
    await expect(
      rejection(client.signIn(DEFAULT_CUSTOMER.email, DEFAULT_CUSTOMER.password)),
    ).resolves.toMatchObject({ errorCode: 'EMAIL_NOT_VERIFIED' });
  });

  it('never reveals an existing account, and emails its owner instead', async () => {
    const { client } = createTestClient();
    await client.register(DEFAULT_CUSTOMER);

    await expect(client.register({ ...DEFAULT_CUSTOMER, email: ' ALEX@example.com ' })).resolves.toBeUndefined();

    const [email] = await client.demo.getOutbox();
    expect(email.subject).toBe('You already have a Cinder & Salt account');
  });

  it('verifies once, signs in, and keeps the session', async () => {
    const { client } = createTestClient();
    await client.register(DEFAULT_CUSTOMER);
    const token = tokenFromLink(await latestLink(client));

    await client.verifyEmail(token);
    const customer = await client.signIn(' Alex@Example.com ', DEFAULT_CUSTOMER.password);

    expect(customer).toMatchObject({ name: 'Alex Rivera', email: 'alex@example.com', emailVerified: true });
    await expect(client.getSession()).resolves.toEqual(customer);
    await expect(rejection(client.verifyEmail(token))).resolves.toMatchObject({
      errorCode: 'INVALID_OR_EXPIRED_TOKEN',
    });
  });

  it('expires verification links after 24 hours and sends a new one on request', async () => {
    const { client, clock } = createTestClient();
    await client.register(DEFAULT_CUSTOMER);
    const oldToken = tokenFromLink(await latestLink(client));
    clock.advanceMinutes(24 * 60 + 1);

    await expect(rejection(client.verifyEmail(oldToken))).resolves.toMatchObject({
      errorCode: 'INVALID_OR_EXPIRED_TOKEN',
    });

    await client.resendVerification('alex@example.com');
    await expect(client.verifyEmail(tokenFromLink(await latestLink(client)))).resolves.toBeUndefined();
  });

  it('attaches earlier guest orders placed with the same email', async () => {
    const { client } = createTestClient();
    const guest = await client.placeOrder(pickup('ALEX@example.com'), 'guest-order');

    await registerVerifiedCustomer(client);

    const page = await client.listOrders(null);
    expect(page.orders.map((order) => order.reference)).toEqual([guest.order.reference]);
  });
});

describe('signing in and recovery', () => {
  it('rejects a wrong password, locks after 10 failures, and unlocks after 15 minutes', async () => {
    const { client, clock } = createTestClient();
    await registerVerifiedCustomer(client);
    await client.signOut();

    for (let attempt = 0; attempt < 9; attempt += 1) {
      await expect(rejection(client.signIn(DEFAULT_CUSTOMER.email, 'wrong password'))).resolves.toMatchObject({
        errorCode: 'UNAUTHENTICATED',
      });
    }
    await rejection(client.signIn(DEFAULT_CUSTOMER.email, 'wrong password'));

    await expect(
      rejection(client.signIn(DEFAULT_CUSTOMER.email, DEFAULT_CUSTOMER.password)),
    ).resolves.toMatchObject({ errorCode: 'ACCOUNT_LOCKED' });

    clock.advanceMinutes(15);
    await expect(client.signIn(DEFAULT_CUSTOMER.email, DEFAULT_CUSTOMER.password)).resolves.toMatchObject({
      email: 'alex@example.com',
    });
  });

  it('resets a password through a single-use link', async () => {
    const { client } = createTestClient();
    await registerVerifiedCustomer(client);

    const before = (await client.demo.getOutbox()).length;
    await client.forgotPassword('nobody@example.com');
    expect(await client.demo.getOutbox()).toHaveLength(before);

    await client.forgotPassword('alex@example.com');
    const href = await latestLink(client);
    expect(href).toMatch(/^\/account\/reset-password#token=/);
    const token = tokenFromLink(href);

    await expect(rejection(client.resetPassword(token, 'short'))).resolves.toMatchObject({
      errorCode: 'VALIDATION_FAILED',
      fieldErrors: { password: ['Use at least 10 characters'] },
    });

    await client.resetPassword(token, 'river-stone-new-pass');
    await expect(client.getSession()).resolves.toBeNull();
    await expect(rejection(client.signIn(DEFAULT_CUSTOMER.email, DEFAULT_CUSTOMER.password))).resolves.toMatchObject({
      errorCode: 'UNAUTHENTICATED',
    });
    await expect(client.signIn(DEFAULT_CUSTOMER.email, 'river-stone-new-pass')).resolves.toBeTruthy();
    await expect(rejection(client.resetPassword(token, 'another-new-pass'))).resolves.toMatchObject({
      errorCode: 'INVALID_OR_EXPIRED_TOKEN',
    });
  });
});

describe('profile, password, and deletion', () => {
  it('validates and saves profile changes, and needs a session', async () => {
    const { client } = createTestClient();
    await registerVerifiedCustomer(client);

    await expect(rejection(client.updateProfile({ phone: 'abc' }))).resolves.toMatchObject({
      fieldErrors: { phone: ['Enter a phone number we can reach you on'] },
    });
    await expect(client.updateProfile({ name: ' Alex R. ' })).resolves.toMatchObject({ name: 'Alex R.' });

    await client.signOut();
    await expect(rejection(client.updateProfile({ name: 'Nobody' }))).resolves.toMatchObject({
      errorCode: 'UNAUTHENTICATED',
    });
  });

  it('changes the password only with the current one', async () => {
    const { client } = createTestClient();
    await registerVerifiedCustomer(client);

    await expect(rejection(client.changePassword('wrong', 'another-new-pass'))).resolves.toMatchObject({
      fieldErrors: { currentPassword: ['Your current password is incorrect'] },
    });
    await expect(rejection(client.changePassword(DEFAULT_CUSTOMER.password, 'short'))).resolves.toMatchObject({
      fieldErrors: { password: ['Use at least 10 characters'] },
    });

    await client.changePassword(DEFAULT_CUSTOMER.password, 'another-new-pass');
    await client.signOut();
    await expect(client.signIn(DEFAULT_CUSTOMER.email, 'another-new-pass')).resolves.toBeTruthy();
  });

  it('deletes the account with the password and keeps its orders unattached', async () => {
    const { client } = createTestClient();
    await registerVerifiedCustomer(client);
    await client.placeOrder(pickup(), 'order-1');

    await expect(rejection(client.deleteAccount('wrong'))).resolves.toMatchObject({
      fieldErrors: { password: ['Your password is incorrect'] },
    });

    await client.deleteAccount(DEFAULT_CUSTOMER.password);

    await expect(client.getSession()).resolves.toBeNull();
    await expect(rejection(client.signIn(DEFAULT_CUSTOMER.email, DEFAULT_CUSTOMER.password))).resolves.toMatchObject({
      errorCode: 'UNAUTHENTICATED',
    });
    const [row] = await client.demo.listOrders();
    expect(row.customerName).toBe('Alex Rivera');
  });
});

describe('saved addresses', () => {
  it('validates each address field', async () => {
    const { client } = createTestClient();
    await registerVerifiedCustomer(client);

    await expect(
      rejection(client.createAddress({ ...address, label: '', areaId: 'area-nowhere', street: '', landmark: '' })),
    ).resolves.toMatchObject({
      errorCode: 'VALIDATION_FAILED',
      fieldErrors: {
        label: ['Give this address a name'],
        areaId: ['Choose a delivery area'],
        street: ['Enter your street address'],
        landmark: ['Add a landmark so our rider can find you'],
      },
    });
  });

  it('creates up to five, updates, and deletes addresses', async () => {
    const { client } = createTestClient();
    await registerVerifiedCustomer(client);

    const first = await client.createAddress(address);
    for (let count = 2; count <= 5; count += 1) {
      await client.createAddress({ ...address, label: `Address ${count}` });
    }
    await expect(rejection(client.createAddress({ ...address, label: 'Sixth' }))).resolves.toMatchObject({
      errorCode: 'VALIDATION_FAILED',
      message: 'You can save up to 5 addresses.',
    });

    await expect(client.updateAddress(first.id, { label: 'Condo' })).resolves.toMatchObject({
      id: first.id,
      label: 'Condo',
      street: '12 Jupiter Street',
    });
    await expect(rejection(client.updateAddress(first.id, { street: '' }))).resolves.toMatchObject({
      fieldErrors: { street: ['Enter your street address'] },
    });

    await client.deleteAddress(first.id);
    expect((await client.listAddresses()).map((saved) => saved.label)).toEqual([
      'Address 2',
      'Address 3',
      'Address 4',
      'Address 5',
    ]);
    await expect(rejection(client.deleteAddress(first.id))).resolves.toMatchObject({ errorCode: 'NOT_FOUND' });
  });
});

describe('order history', () => {
  it('pages the customer’s orders newest first and scopes single orders to the customer', async () => {
    const { client } = createTestClient();
    await registerVerifiedCustomer(client);
    const references: string[] = [];
    // ASAP orders spread across slots on their own once a slot reaches its cap.
    for (let count = 0; count < 12; count += 1) {
      const response = await client.placeOrder({ ...pickup(), notes: `Order ${count}` }, `order-${count}`);
      references.push(response.order.reference);
    }

    const firstPage = await client.listOrders(null);
    expect(firstPage.orders).toHaveLength(10);
    expect(firstPage.orders[0].reference).toBe(references[11]);
    expect(firstPage.nextCursor).toBe('10');

    const secondPage = await client.listOrders(firstPage.nextCursor);
    expect(secondPage.orders.map((order) => order.reference)).toEqual([references[1], references[0]]);
    expect(secondPage.nextCursor).toBeNull();

    await expect(client.getOrder(references[0])).resolves.toMatchObject({ reference: references[0] });
    await expect(client.cancelOrder(references[0])).resolves.toMatchObject({ status: 'CANCELLED' });

    await client.signOut();
    await registerVerifiedCustomer(client, { email: 'jo@example.com', name: 'Jo Tan' });
    await expect(rejection(client.getOrder(references[1]))).resolves.toMatchObject({
      errorCode: 'ORDER_NOT_FOUND',
    });
  });
});
