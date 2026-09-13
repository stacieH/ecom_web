// Contract types from docs/superpowers/specs/2026-09-12-online-ordering-api-design.md
// (3A), plus the client interface the portal talks to. Keep them in step with
// the spec: a field added here and not there is contract drift.

export type Fulfilment = 'PICKUP' | 'DELIVERY';
export type PaymentMethod = 'ONLINE' | 'PAY_AT_PICKUP' | 'CASH_ON_DELIVERY';
export type PaymentStatus =
  | 'UNPAID'
  | 'PENDING'
  | 'PAID'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'REFUND_FAILED';
export type OrderStatus =
  | 'AWAITING_PAYMENT'
  | 'CONFIRMED'
  | 'ACCEPTED'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERY_FAILED'
  | 'COMPLETED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface MenuOption {
  id: string;
  name: string;
  priceDeltaCentavos: number;
  soldOut: boolean;
}

export interface MenuOptionGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: MenuOption[];
}

export interface MenuDish {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCentavos: number;
  imageUrl: string;
  signature: boolean;
  orderable: boolean;
  soldOut: boolean;
  optionGroups: MenuOptionGroup[];
}

export interface MenuCategory {
  slug: string;
  name: string;
  dishes: MenuDish[];
}

export interface Menu {
  version: string;
  categories: MenuCategory[];
}

export interface OrderingStatus {
  acceptingOrders: boolean;
  message: string | null;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  payAtPickup: boolean;
  cashOnDelivery: boolean;
  cashOnDeliveryMaxCentavos: number;
  onlinePaymentMethods: string[];
}

export interface DeliveryArea {
  id: string;
  name: string;
  feeCentavos: number;
  minOrderCentavos: number;
  extraMinutes: number;
}

export interface Slot {
  startsAt: string;
  available: boolean;
}

export interface SlotList {
  date: string;
  fulfilment: Fulfilment;
  asapStartsAt: string | null;
  slots: Slot[];
}

export interface CartLineInput {
  dishId: string;
  quantity: number;
  optionIds: string[];
  note: string;
}

export interface DeliveryDetailsInput {
  areaId: string;
  street: string;
  building: string;
  landmark: string;
  instructions: string;
}

export interface OrderDraft {
  fulfilment: Fulfilment;
  delivery: DeliveryDetailsInput | null;
  lines: CartLineInput[];
}

export interface PricedLineOption {
  groupName: string;
  optionName: string;
  priceDeltaCentavos: number;
}

export interface PricedLine {
  dishId: string;
  name: string;
  quantity: number;
  unitPriceCentavos: number;
  options: PricedLineOption[];
  note: string;
  lineTotalCentavos: number;
}

export interface Quote {
  lines: PricedLine[];
  subtotalCentavos: number;
  deliveryFeeCentavos: number;
  totalCentavos: number;
  minimumOrderCentavos: number | null;
  paymentMethods: PaymentMethod[];
}

export type OrderTiming = { mode: 'ASAP' } | { mode: 'SCHEDULED'; startsAt: string };

export interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
}

export interface PlaceOrderRequest extends OrderDraft {
  timing: OrderTiming;
  customer: CustomerDetails;
  paymentMethod: PaymentMethod;
  expectedTotalCentavos: number;
  notes: string;
}

export interface OrderDelivery {
  areaName: string;
  street: string | null;
  building: string | null;
  landmark: string | null;
  instructions: string | null;
  riderName: string | null;
  riderPhone: string | null;
}

export interface OrderSummary {
  reference: string;
  status: OrderStatus;
  fulfilment: Fulfilment;
  timingMode: 'ASAP' | 'SCHEDULED';
  promisedAt: string;
  customerName: string;
  lines: PricedLine[];
  notes: string;
  subtotalCentavos: number;
  deliveryFeeCentavos: number;
  totalCentavos: number;
  payment: { method: PaymentMethod; status: PaymentStatus };
  delivery: OrderDelivery | null;
  canCancel: boolean;
  canResumePayment: boolean;
  statusHistory: { status: OrderStatus; at: string }[];
  createdAt: string;
}

export interface PlaceOrderResponse {
  order: OrderSummary;
  trackingToken: string;
  checkoutUrl: string | null;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  emailVerified: boolean;
}

export interface SavedAddress extends DeliveryDetailsInput {
  id: string;
  label: string;
}

export type AddressInput = Omit<SavedAddress, 'id'>;

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface OrderPage {
  orders: OrderSummary[];
  nextCursor: string | null;
}

// Demo-only surfaces. The real API client returns `demo: null`.
export interface DemoEmailLink {
  label: string;
  href: string;
}

export interface DemoEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  links: DemoEmailLink[];
  sentAt: string;
}

export interface DemoScenarios {
  nextSlotFull: boolean;
  soldOutDishSlugs: string[];
  priceIncreasePercent: 0 | 10;
  failOnlinePayments: boolean;
  failNextRequest: boolean;
}

export interface DemoOrderRow {
  reference: string;
  status: OrderStatus;
  fulfilment: Fulfilment;
  customerName: string;
  totalCentavos: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
  nextStatuses: OrderStatus[];
}

export interface DemoCheckoutSession {
  id: string;
  reference: string;
  status: 'OPEN' | 'PAID' | 'CANCELLED' | 'EXPIRED';
  lines: PricedLine[];
  deliveryFeeCentavos: number;
  totalCentavos: number;
  methods: string[];
  holdExpiresAt: string;
}

export type DemoPaymentOutcome = 'PAID' | 'CANCELLED' | 'FAILED';

export interface DemoControls {
  getOutbox(): Promise<DemoEmail[]>;
  getScenarios(): Promise<DemoScenarios>;
  setScenarios(changes: Partial<DemoScenarios>): Promise<DemoScenarios>;
  listOrders(): Promise<DemoOrderRow[]>;
  advanceOrder(
    reference: string,
    to: OrderStatus,
    rider?: { name: string; phone: string },
  ): Promise<DemoOrderRow>;
  getCheckoutSession(sessionId: string): Promise<DemoCheckoutSession>;
  /** Returns where the payment page should send the guest; null when the payment failed. */
  completeCheckout(sessionId: string, outcome: DemoPaymentOutcome): Promise<{ redirectTo: string | null }>;
  reset(): Promise<void>;
}

export interface OrderingClient {
  readonly demo: DemoControls | null;

  getMenu(): Promise<Menu>;
  getOrderingStatus(): Promise<OrderingStatus>;
  getDeliveryAreas(): Promise<DeliveryArea[]>;
  getSlots(params: { fulfilment: Fulfilment; date: string; areaId?: string }): Promise<SlotList>;
  quote(draft: OrderDraft): Promise<Quote>;
  placeOrder(request: PlaceOrderRequest, idempotencyKey: string): Promise<PlaceOrderResponse>;
  trackOrder(token: string): Promise<OrderSummary>;
  cancelTrackedOrder(token: string): Promise<OrderSummary>;
  resumeTrackedPayment(token: string): Promise<{ checkoutUrl: string }>;

  register(input: RegisterInput): Promise<void>;
  verifyEmail(token: string): Promise<void>;
  resendVerification(email: string): Promise<void>;
  signIn(email: string, password: string): Promise<Customer>;
  getSession(): Promise<Customer | null>;
  signOut(): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, password: string): Promise<void>;
  updateProfile(changes: { name?: string; phone?: string }): Promise<Customer>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  deleteAccount(password: string): Promise<void>;
  listAddresses(): Promise<SavedAddress[]>;
  createAddress(input: AddressInput): Promise<SavedAddress>;
  updateAddress(id: string, changes: Partial<AddressInput>): Promise<SavedAddress>;
  deleteAddress(id: string): Promise<void>;
  listOrders(cursor: string | null): Promise<OrderPage>;
  getOrder(reference: string): Promise<OrderSummary>;
  cancelOrder(reference: string): Promise<OrderSummary>;
  resumeOrderPayment(reference: string): Promise<{ checkoutUrl: string }>;
}
