// The demo's whole state as one JSON document in localStorage. Every operation
// loads it, changes a copy, and saves the copy, so two tabs never overwrite each
// other's older snapshot.
import type {
  CustomerDetails,
  DeliveryDetailsInput,
  DemoEmail,
  DemoScenarios,
  Fulfilment,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PlaceOrderResponse,
  PricedLine,
  SavedAddress,
} from '../types';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface StoredOrder {
  id: string;
  reference: string;
  trackingToken: string;
  status: OrderStatus;
  fulfilment: Fulfilment;
  timingMode: 'ASAP' | 'SCHEDULED';
  slotStart: string;
  promisedAt: string;
  customer: CustomerDetails & { accountId: string | null };
  delivery:
    | (DeliveryDetailsInput & { areaName: string; riderName: string | null; riderPhone: string | null })
    | null;
  lines: PricedLine[];
  notes: string;
  subtotalCentavos: number;
  deliveryFeeCentavos: number;
  totalCentavos: number;
  payment: {
    method: PaymentMethod;
    status: PaymentStatus;
    checkoutSessionId: string | null;
    holdExpiresAt: string | null;
  };
  statusHistory: { status: OrderStatus; at: string }[];
  createdAt: string;
}

export interface StoredCheckoutSession {
  id: string;
  orderId: string;
  status: 'OPEN' | 'PAID' | 'CANCELLED' | 'EXPIRED';
}

export interface StoredCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  salt: string;
  emailVerifiedAt: string | null;
  failedLogins: number;
  lockedUntil: string | null;
  addresses: SavedAddress[];
  createdAt: string;
}

export interface StoredToken {
  token: string;
  customerId: string;
  type: 'VERIFY_EMAIL' | 'RESET_PASSWORD';
  expiresAt: string;
  usedAt: string | null;
}

export interface StoredIdempotency {
  key: string;
  requestHash: string;
  response: PlaceOrderResponse;
}

export interface DemoState {
  version: 1;
  orders: StoredOrder[];
  checkoutSessions: StoredCheckoutSession[];
  customers: StoredCustomer[];
  tokens: StoredToken[];
  sessionCustomerId: string | null;
  outbox: DemoEmail[];
  scenarios: DemoScenarios;
  idempotency: StoredIdempotency[];
}

export const DEMO_STORAGE_KEY = 'cs-ordering-demo-v1';

export const DEFAULT_SCENARIOS: DemoScenarios = {
  nextSlotFull: false,
  soldOutDishSlugs: [],
  priceIncreasePercent: 0,
  failOnlinePayments: false,
  failNextRequest: false,
};

export function emptyDemoState(): DemoState {
  return {
    version: 1,
    orders: [],
    checkoutSessions: [],
    customers: [],
    tokens: [],
    sessionCustomerId: null,
    outbox: [],
    scenarios: { ...DEFAULT_SCENARIOS, soldOutDishSlugs: [] },
    idempotency: [],
  };
}

/** localStorage when the browser allows it; null on the server or when blocked. */
export function browserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    const storage = window.localStorage;
    const probe = 'cs-ordering-probe';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

const copy = (state: DemoState): DemoState => JSON.parse(JSON.stringify(state)) as DemoState;

export class DemoStore {
  private memory: DemoState;

  constructor(private readonly storage: StorageLike | null) {
    this.memory = this.load();
  }

  private load(): DemoState {
    if (!this.storage) return copy(this.memory ?? emptyDemoState());

    try {
      const raw = this.storage.getItem(DEMO_STORAGE_KEY);
      if (!raw) return this.memory ? copy(this.memory) : emptyDemoState();

      const parsed = JSON.parse(raw) as Partial<DemoState>;
      if (parsed.version !== 1) return emptyDemoState();

      return {
        ...emptyDemoState(),
        ...parsed,
        scenarios: { ...DEFAULT_SCENARIOS, ...parsed.scenarios },
      } as DemoState;
    } catch {
      return this.memory ? copy(this.memory) : emptyDemoState();
    }
  }

  read(): DemoState {
    return copy(this.load());
  }

  update<T>(change: (state: DemoState) => T): T {
    const next = this.load();
    const result = change(next);
    this.memory = next;

    try {
      this.storage?.setItem(DEMO_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage is full or blocked: the demo keeps running in memory.
    }

    return result;
  }

  reset(): void {
    this.memory = emptyDemoState();
    try {
      this.storage?.removeItem(DEMO_STORAGE_KEY);
    } catch {
      // Nothing stored to remove.
    }
  }
}
