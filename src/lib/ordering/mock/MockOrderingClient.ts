import { ApiError } from '@/lib/api/client';
import type {
  AddressInput,
  Customer,
  DeliveryArea,
  DemoControls,
  Fulfilment,
  Menu,
  OrderDraft,
  OrderingClient,
  OrderingStatus,
  OrderPage,
  OrderSummary,
  PlaceOrderRequest,
  PlaceOrderResponse,
  Quote,
  RegisterInput,
  SavedAddress,
  SlotList,
} from '../types';
import * as accounts from './mockAccounts';
import { MockContext, sha256Hash } from './mockContext';
import { MOCK_DELIVERY_AREAS } from './mockData';
import * as orders from './mockOrders';
import { browserStorage, DemoStore, StorageLike } from './mockStore';

export interface MockClientOptions {
  /** Defaults to localStorage in the browser; null keeps the demo in memory. */
  storage?: StorageLike | null;
  now?: () => Date;
  /** Simulated network latency per call. Tests pass () => 0. */
  delayMs?: () => number;
  random?: () => number;
  hashPassword?: MockContext['hashPassword'];
}

/**
 * Serves the ordering portal from dummy data until the ordering API exists.
 * Every method fails with the same ApiError codes the API documents.
 */
export class MockOrderingClient implements OrderingClient {
  readonly demo: DemoControls;
  private readonly ctx: MockContext;
  private readonly delayMs: () => number;

  constructor(options: MockClientOptions = {}) {
    this.ctx = {
      store: new DemoStore(options.storage === undefined ? browserStorage() : options.storage),
      now: options.now ?? (() => new Date()),
      random: options.random ?? Math.random,
      hashPassword: options.hashPassword ?? sha256Hash,
    };
    this.delayMs = options.delayMs ?? (() => 250 + Math.floor(Math.random() * 350));

    const ctx = this.ctx;
    const demoRun = <T>(operation: () => T | Promise<T>) => this.run(operation, true);

    this.demo = {
      getOutbox: () => demoRun(() => ctx.store.read().outbox),
      getScenarios: () => demoRun(() => ctx.store.read().scenarios),
      setScenarios: (changes) =>
        demoRun(() =>
          ctx.store.update((state) => {
            state.scenarios = { ...state.scenarios, ...changes };
            return state.scenarios;
          }),
        ),
      listOrders: () => demoRun(() => [...ctx.store.read().orders].reverse().map(orders.toDemoRow)),
      advanceOrder: (reference, to, rider) =>
        demoRun(() => ctx.store.update((state) => orders.advanceOrder(state, ctx, reference, to, rider))),
      getCheckoutSession: (sessionId) =>
        demoRun(() => orders.checkoutSessionView(ctx.store.read(), sessionId)),
      completeCheckout: (sessionId, outcome) =>
        demoRun(() => ctx.store.update((state) => orders.completeCheckout(state, ctx, sessionId, outcome))),
      reset: () => demoRun(() => ctx.store.reset()),
    };
  }

  private async run<T>(operation: () => T | Promise<T>, demo = false): Promise<T> {
    const delay = this.delayMs();
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.ctx.store.update((state) => orders.expireHolds(state, this.ctx));

    if (!demo) {
      const failNow = this.ctx.store.update((state) => {
        if (!state.scenarios.failNextRequest) return false;
        state.scenarios.failNextRequest = false;
        return true;
      });
      if (failNow) {
        throw new ApiError(0, 'NETWORK_ERROR', 'We could not reach the Cinder & Salt service.');
      }
    }

    return operation();
  }

  getMenu(): Promise<Menu> {
    return this.run(() => orders.currentMenu(this.ctx.store.read()));
  }

  getOrderingStatus(): Promise<OrderingStatus> {
    return this.run(() => orders.orderingStatus());
  }

  getDeliveryAreas(): Promise<DeliveryArea[]> {
    return this.run(() => MOCK_DELIVERY_AREAS);
  }

  getSlots(params: { fulfilment: Fulfilment; date: string; areaId?: string }): Promise<SlotList> {
    return this.run(() => orders.slotsFor(this.ctx.store.read(), this.ctx.now(), params));
  }

  quote(draft: OrderDraft): Promise<Quote> {
    return this.run(() => orders.quoteDraft(this.ctx.store.read(), draft));
  }

  placeOrder(request: PlaceOrderRequest, idempotencyKey: string): Promise<PlaceOrderResponse> {
    return this.run(() =>
      this.ctx.store.update((state) => orders.placeOrder(state, this.ctx, request, idempotencyKey)),
    );
  }

  trackOrder(token: string): Promise<OrderSummary> {
    return this.run(() =>
      orders.toSummary(orders.findOrderByToken(this.ctx.store.read(), token), this.ctx.now()),
    );
  }

  cancelTrackedOrder(token: string): Promise<OrderSummary> {
    return this.run(() =>
      this.ctx.store.update((state) =>
        orders.toSummary(
          orders.cancelOrderRecord(state, this.ctx, orders.findOrderByToken(state, token)),
          this.ctx.now(),
        ),
      ),
    );
  }

  resumeTrackedPayment(token: string): Promise<{ checkoutUrl: string }> {
    return this.run(() =>
      orders.resumePayment(this.ctx.now(), orders.findOrderByToken(this.ctx.store.read(), token)),
    );
  }

  register(input: RegisterInput): Promise<void> {
    return this.run(() => accounts.register(this.ctx, input));
  }

  verifyEmail(token: string): Promise<void> {
    return this.run(() => accounts.verifyEmail(this.ctx, token));
  }

  resendVerification(email: string): Promise<void> {
    return this.run(() => accounts.resendVerification(this.ctx, email));
  }

  signIn(email: string, password: string): Promise<Customer> {
    return this.run(() => accounts.signIn(this.ctx, email, password));
  }

  getSession(): Promise<Customer | null> {
    return this.run(() => accounts.getSession(this.ctx));
  }

  signOut(): Promise<void> {
    return this.run(() => accounts.signOut(this.ctx));
  }

  forgotPassword(email: string): Promise<void> {
    return this.run(() => accounts.forgotPassword(this.ctx, email));
  }

  resetPassword(token: string, password: string): Promise<void> {
    return this.run(() => accounts.resetPassword(this.ctx, token, password));
  }

  updateProfile(changes: { name?: string; phone?: string }): Promise<Customer> {
    return this.run(() => accounts.updateProfile(this.ctx, changes));
  }

  changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return this.run(() => accounts.changePassword(this.ctx, currentPassword, newPassword));
  }

  deleteAccount(password: string): Promise<void> {
    return this.run(() => accounts.deleteAccount(this.ctx, password));
  }

  listAddresses(): Promise<SavedAddress[]> {
    return this.run(() => accounts.listAddresses(this.ctx));
  }

  createAddress(input: AddressInput): Promise<SavedAddress> {
    return this.run(() => accounts.createAddress(this.ctx, input));
  }

  updateAddress(id: string, changes: Partial<AddressInput>): Promise<SavedAddress> {
    return this.run(() => accounts.updateAddress(this.ctx, id, changes));
  }

  deleteAddress(id: string): Promise<void> {
    return this.run(() => accounts.deleteAddress(this.ctx, id));
  }

  listOrders(cursor: string | null): Promise<OrderPage> {
    return this.run(() => accounts.listOrders(this.ctx, cursor));
  }

  getOrder(reference: string): Promise<OrderSummary> {
    return this.run(() => {
      const state = this.ctx.store.read();
      const customer = accounts.requireSession(state);
      return orders.toSummary(accounts.customerOrder(state, customer.id, reference), this.ctx.now());
    });
  }

  cancelOrder(reference: string): Promise<OrderSummary> {
    return this.run(() =>
      this.ctx.store.update((state) => {
        const customer = accounts.requireSession(state);
        const order = accounts.customerOrder(state, customer.id, reference);
        return orders.toSummary(orders.cancelOrderRecord(state, this.ctx, order), this.ctx.now());
      }),
    );
  }

  resumeOrderPayment(reference: string): Promise<{ checkoutUrl: string }> {
    return this.run(() => {
      const state = this.ctx.store.read();
      const customer = accounts.requireSession(state);
      return orders.resumePayment(this.ctx.now(), accounts.customerOrder(state, customer.id, reference));
    });
  }
}
