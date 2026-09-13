'use client';
import { FormEvent, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PrivacyNotice from '@/components/account/PrivacyNotice';
import { CheckboxField, FormAlert, RadioGroupField, TextAreaField, TextField } from '@/components/forms/fields';
import formStyles from '@/components/forms/form.module.css';
import { newIdempotencyKey } from '@/lib/api/idempotency';
import { useValidatedForm } from '@/lib/forms/useValidatedForm';
import { formatPeso } from '@/lib/money';
import { CheckoutNotice, checkoutErrorOutcome, fixFieldsMessage } from '@/lib/ordering/checkoutErrors';
import {
  checkoutRules,
  CheckoutValues,
  initialCheckoutValues,
  NEW_ADDRESS,
  toPlaceOrderRequest,
} from '@/lib/ordering/checkoutForm';
import { useOrderingClient } from '@/lib/ordering/clientContext';
import { optionSummary } from '@/lib/ordering/labels';
import { rememberOrderToken } from '@/lib/ordering/orderTokens';
import { useSlotDays } from '@/lib/ordering/queries';
import { orderingKeys } from '@/lib/ordering/queryKeys';
import type { Customer, DeliveryArea, Fulfilment, Menu, OrderingStatus } from '@/lib/ordering/types';
import { useCartQuote } from '@/lib/ordering/useCartQuote';
import { lineFieldErrors } from '@/lib/ordering/validation/serverErrors';
import AddressFields, { AddressField } from './AddressFields';
import { useCart } from './CartProvider';
import PaymentFields from './PaymentFields';
import TimingFields from './TimingFields';
import styles from './ordering.module.css';

/** Focuses the first enabled control inside the first listed field wrapper that has one. */
function focusFirstField(names: (keyof CheckoutValues)[]): void {
  for (const name of names) {
    const scope = `[data-field="${name}"]`;
    const target = document.querySelector<HTMLElement>(
      `${scope} input:not(:disabled), ${scope} select:not(:disabled), ${scope} textarea:not(:disabled)`,
    );
    if (target) {
      target.focus();
      return;
    }
  }
}

export default function CheckoutForm({
  customer,
  status,
  areas,
  menu,
  onPlaced,
}: {
  customer: Customer | null;
  status: OrderingStatus;
  areas: DeliveryArea[];
  menu: Menu;
  onPlaced: () => void;
}) {
  const client = useOrderingClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { cart, itemCount, dispatch } = useCart();
  const { draft, quote, error: quoteError, isUpdating, needsArea } = useCartQuote(cart);
  const days = useSlotDays(cart.fulfilment, cart.areaId);
  const savedAddresses = useQuery({
    queryKey: orderingKeys.addresses,
    queryFn: () => client.listAddresses(),
    enabled: customer !== null,
  });

  const form = useValidatedForm<CheckoutValues>({
    initialValues: initialCheckoutValues({ fulfilment: cart.fulfilment, areaId: cart.areaId, customer }),
    rules: checkoutRules({
      signedIn: customer !== null,
      status,
      slots: days.data ? days.data.flatMap((day) => day.slots) : null,
      areas,
      quote,
    }),
  });
  const { values, errors } = form;

  const attempt = useRef<{ signature: string; key: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formAlert, setFormAlert] = useState<string | null>(null);
  const [notice, setNotice] = useState<CheckoutNotice | null>(null);
  const [lineErrors, setLineErrors] = useState<Record<number, string>>({});

  // Fulfilment and area also live in the cart, so the quote and slots follow them.
  const setFulfilment = (fulfilment: Fulfilment) => {
    form.setValues({ fulfilment, startsAt: '', paymentMethod: '' });
    dispatch({ type: 'SET_FULFILMENT', fulfilment });
  };

  const setAddressField = (name: AddressField, value: string) => {
    if (name === 'areaId') {
      form.setValues({ areaId: value, startsAt: '' });
      dispatch({ type: 'SET_AREA', areaId: value || null });
    } else {
      form.setValue(name, value);
    }
  };

  const chooseAddress = (choice: string) => {
    const saved = savedAddresses.data?.find((address) => address.id === choice);
    form.setValues(
      saved
        ? {
            addressChoice: choice,
            areaId: saved.areaId,
            street: saved.street,
            building: saved.building,
            landmark: saved.landmark,
            instructions: saved.instructions,
            saveAddress: false,
            startsAt: '',
          }
        : {
            addressChoice: NEW_ADDRESS,
            areaId: '',
            street: '',
            building: '',
            landmark: '',
            instructions: '',
            startsAt: '',
          },
    );
    dispatch({ type: 'SET_AREA', areaId: saved ? saved.areaId : null });
  };

  const removeLine = (key: string) => {
    setLineErrors({});
    dispatch({ type: 'REMOVE', key });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setFormAlert(null);

    const invalid = form.validateAll();
    if (invalid.length > 0) {
      setFormAlert(fixFieldsMessage(invalid.length));
      focusFirstField(invalid);
      return;
    }
    if (!draft || !quote || isUpdating) {
      setFormAlert('Your total is still updating. Please try again in a moment.');
      return;
    }

    const request = toPlaceOrderRequest(values, draft, quote);
    const signature = JSON.stringify(request);
    // The same key for a retry of the same request, so a lost response can
    // never place a second order. Any edit gets a new key.
    const key = attempt.current?.signature === signature ? attempt.current.key : newIdempotencyKey();
    attempt.current = { signature, key };

    setSubmitting(true);
    setNotice(null);
    setLineErrors({});

    try {
      const response = await client.placeOrder(request, key);
      rememberOrderToken(response.order.reference, response.trackingToken);

      if (customer && values.fulfilment === 'DELIVERY' && values.addressChoice === NEW_ADDRESS && values.saveAddress) {
        try {
          await client.createAddress({
            label: values.addressLabel.trim(),
            areaId: values.areaId,
            street: values.street,
            building: values.building,
            landmark: values.landmark,
            instructions: values.instructions,
          });
          await queryClient.invalidateQueries({ queryKey: orderingKeys.addresses });
        } catch {
          // The order is placed; a failed save only means typing the address next time.
        }
      }

      onPlaced();
      dispatch({ type: 'CLEAR' });
      void queryClient.invalidateQueries({ queryKey: orderingKeys.orders });
      router.push(response.checkoutUrl ?? `/order/track#token=${encodeURIComponent(response.trackingToken)}`);
    } catch (error) {
      const outcome = checkoutErrorOutcome(error, values);
      form.setServerErrors(outcome.fieldErrors);
      setLineErrors(outcome.lineErrors);
      setNotice(outcome.notice);
      setFormAlert(outcome.alert);
      if (outcome.notice?.kind === 'priceChanged') {
        queryClient.setQueryData(orderingKeys.quote(draft), outcome.notice.quote);
      }
      outcome.refetch.forEach((queryKey) => {
        void queryClient.invalidateQueries({ queryKey });
      });
      focusFirstField(Object.keys(outcome.fieldErrors) as (keyof CheckoutValues)[]);
      setSubmitting(false);
    }
  };

  const dishes = menu.categories.flatMap((category) => category.dishes);
  const quoteLineErrors = quoteError ? lineFieldErrors(quoteError.fieldErrors) : {};
  const addresses = savedAddresses.data ?? [];

  return (
    <form className={styles.checkout} noValidate onSubmit={submit}>
      <FormAlert message={formAlert} />

      {notice?.kind === 'closed' && (
        <p className={styles.banner} role="alert">
          {notice.message}
        </p>
      )}
      {notice?.kind === 'belowMinimum' && (
        <div className={formStyles.notice} role="alert">
          <p>{notice.message}</p>
          <Link className={formStyles.link} href="/order">
            Back to the menu
          </Link>
        </div>
      )}
      {notice?.kind === 'priceChanged' && (
        <div className={formStyles.notice} role="alert">
          <p>{`Prices have changed. Your new total is ${formatPeso(notice.quote.totalCentavos)}.`}</p>
          <ul>
            {notice.quote.lines.map((line, index) => (
              <li key={`${line.dishId}-${index}`}>{`${line.name}: ${formatPeso(line.unitPriceCentavos)} each`}</li>
            ))}
          </ul>
          <div className={formStyles.actions}>
            <button
              type="button"
              className={formStyles.secondary}
              disabled={isUpdating}
              onClick={() => setNotice(null)}
            >
              Review order
            </button>
          </div>
        </div>
      )}

      <section className={styles.checkoutSection} aria-labelledby="checkout-summary-title">
        <h2 id="checkout-summary-title" className={styles.sectionTitle}>
          Order summary
        </h2>
        <details open>
          <summary>{`${itemCount} ${itemCount === 1 ? 'item' : 'items'}${quote ? ` · ${formatPeso(quote.totalCentavos)}` : ''}`}</summary>
          <ul className={styles.cartLines}>
            {cart.lines.map((line, index) => {
              const dish = dishes.find((candidate) => candidate.id === line.dishId);
              const quoted = quote?.lines[index];
              const priced = quoted?.dishId === line.dishId ? quoted : undefined;
              const name = dish?.name ?? priced?.name ?? 'Dish no longer on the menu';
              const problem = lineErrors[index] ?? quoteLineErrors[index];

              return (
                <li key={line.key} className={styles.cartLine}>
                  <div className={styles.lineHeader}>
                    <span className={styles.lineName}>{`${line.quantity} × ${name}`}</span>
                    {priced && <span className={styles.price}>{formatPeso(priced.lineTotalCentavos)}</span>}
                  </div>
                  {priced && priced.options.length > 0 && (
                    <p className={styles.lineMeta}>{optionSummary(priced)}</p>
                  )}
                  {line.note && <p className={styles.lineMeta}>{`Note: ${line.note}`}</p>}
                  {problem && (
                    <div className={styles.lineActions}>
                      <p className={formStyles.error}>{problem}</p>
                      <button
                        type="button"
                        className={styles.textButton}
                        aria-label={`Remove ${name}`}
                        onClick={() => removeLine(line.key)}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
        <Link className={formStyles.link} href="/order">
          Edit order
        </Link>
      </section>

      <section className={styles.checkoutSection} aria-labelledby="checkout-when-title">
        <h2 id="checkout-when-title" className={styles.sectionTitle}>
          How and when
        </h2>
        <div data-field="fulfilment">
          <RadioGroupField
            id="checkout-fulfilment"
            legend="Pickup or delivery"
            value={values.fulfilment}
            error={errors.fulfilment}
            options={[
              { value: 'PICKUP', label: 'Pickup', disabled: !status.pickupEnabled },
              { value: 'DELIVERY', label: 'Delivery', disabled: !status.deliveryEnabled },
            ]}
            onChange={(value) => setFulfilment(value as Fulfilment)}
            onBlur={() => form.blur('fulfilment')}
          />
        </div>
        <TimingFields
          fulfilment={values.fulfilment}
          needsArea={needsArea}
          days={days.data}
          timeMode={values.timeMode}
          startsAt={values.startsAt}
          errors={{ timeMode: errors.timeMode, startsAt: errors.startsAt }}
          onTimeModeChange={(timeMode) =>
            form.setValues({ timeMode, startsAt: timeMode === 'ASAP' ? '' : values.startsAt })
          }
          onStartsAtChange={(startsAt) => form.setValue('startsAt', startsAt)}
          onBlur={(name) => form.blur(name)}
        />
      </section>

      {values.fulfilment === 'DELIVERY' && (
        <section className={styles.checkoutSection} aria-labelledby="checkout-address-title">
          <h2 id="checkout-address-title" className={styles.sectionTitle}>
            Delivery address
          </h2>
          {addresses.length > 0 && (
            <div data-field="addressChoice">
              <RadioGroupField
                id="checkout-address"
                legend="Deliver to"
                value={values.addressChoice}
                options={[
                  ...addresses.map((address) => ({
                    value: address.id,
                    label: address.label,
                    description: address.street,
                  })),
                  { value: NEW_ADDRESS, label: 'Use a new address' },
                ]}
                onChange={chooseAddress}
              />
            </div>
          )}
          {values.addressChoice === NEW_ADDRESS && (
            <AddressFields
              idPrefix="checkout"
              values={values}
              errors={errors}
              areas={areas}
              onChange={setAddressField}
              onBlur={(name) => form.blur(name)}
            />
          )}
          {customer && values.addressChoice === NEW_ADDRESS && (
            <>
              <CheckboxField
                id="checkout-saveAddress"
                label="Save this address to my account"
                checked={values.saveAddress}
                onChange={(checked) => form.setValue('saveAddress', checked)}
              />
              {values.saveAddress && (
                <div data-field="addressLabel">
                  <TextField
                    id="checkout-addressLabel"
                    label="Name this address"
                    hint="For example, Home or Office"
                    value={values.addressLabel}
                    error={errors.addressLabel}
                    onChange={(value) => form.setValue('addressLabel', value)}
                    onBlur={() => form.blur('addressLabel')}
                  />
                </div>
              )}
            </>
          )}
        </section>
      )}

      <section className={styles.checkoutSection} aria-labelledby="checkout-contact-title">
        <h2 id="checkout-contact-title" className={styles.sectionTitle}>
          Contact
        </h2>
        {!customer && (
          <p className={formStyles.hint}>
            Have an account?{' '}
            <Link className={formStyles.link} href={`/account/sign-in?next=${encodeURIComponent('/order/checkout')}`}>
              Sign in
            </Link>
          </p>
        )}
        <div data-field="name">
          <TextField
            id="checkout-name"
            label="Name"
            autoComplete="name"
            value={values.name}
            error={errors.name}
            onChange={(value) => form.setValue('name', value)}
            onBlur={() => form.blur('name')}
          />
        </div>
        <div className={formStyles.row}>
          <div data-field="email">
            <TextField
              id="checkout-email"
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              hint="We send your receipt here"
              value={values.email}
              error={errors.email}
              onChange={(value) => form.setValue('email', value)}
              onBlur={() => form.blur('email')}
            />
          </div>
          <div data-field="phone">
            <TextField
              id="checkout-phone"
              label="Phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={values.phone}
              error={errors.phone}
              onChange={(value) => form.setValue('phone', value)}
              onBlur={() => form.blur('phone')}
            />
          </div>
        </div>
      </section>

      <section className={styles.checkoutSection} aria-labelledby="checkout-payment-title">
        <h2 id="checkout-payment-title" className={styles.sectionTitle}>
          Payment
        </h2>
        <PaymentFields
          fulfilment={values.fulfilment}
          quote={quote}
          status={status}
          value={values.paymentMethod}
          error={errors.paymentMethod}
          onChange={(method) => form.setValue('paymentMethod', method)}
          onBlur={() => form.blur('paymentMethod')}
        />
        <div data-field="notes">
          <TextAreaField
            id="checkout-notes"
            label="Order notes"
            optional
            value={values.notes}
            error={errors.notes}
            onChange={(value) => form.setValue('notes', value)}
            onBlur={() => form.blur('notes')}
          />
        </div>
        {!customer && (
          <div data-field="consent">
            <CheckboxField
              id="checkout-consent"
              label="I agree to the privacy notice"
              checked={values.consent}
              error={errors.consent}
              onChange={(checked) => form.setValue('consent', checked)}
              onBlur={() => form.blur('consent')}
            />
            <PrivacyNotice />
          </div>
        )}
      </section>

      <div className={styles.placeBar}>
        {quote && (
          <dl className={styles.totals}>
            <div className={styles.totalRow}>
              <dt>Subtotal</dt>
              <dd>{formatPeso(quote.subtotalCentavos)}</dd>
            </div>
            {values.fulfilment === 'DELIVERY' && (
              <div className={styles.totalRow}>
                <dt>Delivery fee</dt>
                <dd>{needsArea ? 'Choose an area' : formatPeso(quote.deliveryFeeCentavos)}</dd>
              </div>
            )}
            <div className={`${styles.totalRow} ${styles.grandTotal}`}>
              <dt>Total</dt>
              <dd>{formatPeso(quote.totalCentavos)}</dd>
            </div>
          </dl>
        )}
        <div className={formStyles.actions}>
          <button
            type="submit"
            className={formStyles.primary}
            disabled={submitting || notice?.kind === 'closed' || notice?.kind === 'priceChanged'}
          >
            {submitting ? 'Placing order…' : `Place order${quote ? ` ${formatPeso(quote.totalCentavos)}` : ''}`}
          </button>
        </div>
      </div>
    </form>
  );
}
