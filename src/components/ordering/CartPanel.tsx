'use client';
import { useState } from 'react';
import Link from 'next/link';
import formStyles from '@/components/forms/form.module.css';
import { formatPeso } from '@/lib/money';
import type { CartLine } from '@/lib/ordering/cart/cartReducer';
import { optionSummary } from '@/lib/ordering/labels';
import type { DeliveryArea, Menu, MenuDish } from '@/lib/ordering/types';
import { useCartQuote } from '@/lib/ordering/useCartQuote';
import { cartItemsRule, LIMITS, minimumOrderMessage } from '@/lib/ordering/validation/rules';
import { lineFieldErrors } from '@/lib/ordering/validation/serverErrors';
import { useCart } from './CartProvider';
import styles from './ordering.module.css';

export default function CartPanel({
  menu,
  areas,
  onEditLine,
}: {
  menu: Menu;
  areas: DeliveryArea[] | undefined;
  onEditLine: (line: CartLine, dish: MenuDish) => void;
}) {
  const { cart, itemCount, dispatch } = useCart();
  const { quote, error, isUpdating, needsArea } = useCartQuote(cart);
  const [sheetOpen, setSheetOpen] = useState(false);

  const dishes = menu.categories.flatMap((category) => category.dishes);
  const lineErrors = error ? lineFieldErrors(error.fieldErrors) : {};
  const area = areas?.find((candidate) => candidate.id === cart.areaId);
  const hasLines = cart.lines.length > 0;

  const itemsError = hasLines ? cartItemsRule(itemCount) : undefined;
  const minimum =
    quote && area && cart.fulfilment === 'DELIVERY'
      ? minimumOrderMessage({
          areaName: area.name,
          subtotalCentavos: quote.subtotalCentavos,
          minimumOrderCentavos: quote.minimumOrderCentavos,
        })
      : undefined;
  const quoteProblem =
    error && Object.keys(lineErrors).length === 0 && !itemsError
      ? 'We couldn’t price your order. Please try again.'
      : undefined;

  let blocker: string | undefined;
  if (hasLines) {
    blocker = needsArea ? 'Choose a delivery area to continue' : (itemsError ?? minimum ?? quoteProblem);
  }
  const canCheckout = hasLines && !blocker && !error && quote !== undefined && !isUpdating;

  const summary = `View order · ${itemCount} ${itemCount === 1 ? 'item' : 'items'}${
    quote ? ` · ${formatPeso(quote.totalCentavos)}` : ''
  }`;

  return (
    <aside className={styles.cart} aria-labelledby="cart-title" data-open={sheetOpen} data-lenis-prevent>
      <button
        type="button"
        className={styles.cartBar}
        aria-expanded={sheetOpen}
        aria-controls="cart-sheet"
        onClick={() => setSheetOpen((open) => !open)}
      >
        {sheetOpen ? 'Hide order' : summary}
      </button>

      <div id="cart-sheet" className={styles.cartSheet}>
        <h2 id="cart-title" className={styles.cartTitle}>
          Your order
        </h2>

        {!hasLines && <p className={formStyles.status}>Your order is empty</p>}

        {hasLines && (
          <ul className={styles.cartLines}>
            {cart.lines.map((line, index) => {
              const dish = dishes.find((candidate) => candidate.id === line.dishId);
              const quoted = quote?.lines[index];
              const priced = quoted?.dishId === line.dishId ? quoted : undefined;
              const name = dish?.name ?? priced?.name ?? 'Dish no longer on the menu';

              return (
                <li key={line.key} className={styles.cartLine}>
                  <div className={styles.lineHeader}>
                    <span className={styles.lineName}>{name}</span>
                    {priced && <span className={styles.price}>{formatPeso(priced.lineTotalCentavos)}</span>}
                  </div>
                  {priced && priced.options.length > 0 && (
                    <p className={styles.lineMeta}>{optionSummary(priced)}</p>
                  )}
                  {line.note && <p className={styles.lineMeta}>{`Note: ${line.note}`}</p>}
                  {lineErrors[index] && (
                    <p className={formStyles.error} role="alert">
                      {lineErrors[index]}
                    </p>
                  )}

                  <div className={styles.lineActions}>
                    <div className={styles.stepper}>
                      <button
                        type="button"
                        className={styles.stepperButton}
                        aria-label={`Decrease ${name} quantity`}
                        disabled={line.quantity <= 1}
                        onClick={() =>
                          dispatch({ type: 'SET_QUANTITY', key: line.key, quantity: line.quantity - 1 })
                        }
                      >
                        −
                      </button>
                      <span className={styles.stepperValue}>{line.quantity}</span>
                      <button
                        type="button"
                        className={styles.stepperButton}
                        aria-label={`Increase ${name} quantity`}
                        disabled={line.quantity >= LIMITS.maxQuantity}
                        onClick={() =>
                          dispatch({ type: 'SET_QUANTITY', key: line.key, quantity: line.quantity + 1 })
                        }
                      >
                        +
                      </button>
                    </div>
                    {dish && dish.orderable && !dish.soldOut && (
                      <button
                        type="button"
                        className={styles.textButton}
                        aria-label={`Edit ${name}`}
                        onClick={() => onEditLine(line, dish)}
                      >
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.textButton}
                      aria-label={`Remove ${name}`}
                      onClick={() => dispatch({ type: 'REMOVE', key: line.key })}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {hasLines && quote && (
          <dl className={styles.totals}>
            <div className={styles.totalRow}>
              <dt>Subtotal</dt>
              <dd>{formatPeso(quote.subtotalCentavos)}</dd>
            </div>
            {cart.fulfilment === 'DELIVERY' && (
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

        {blocker && (
          <p id="cart-blocker" className={formStyles.hint}>
            {blocker}
          </p>
        )}

        <div className={formStyles.actions}>
          {canCheckout ? (
            <Link href="/order/checkout" className={formStyles.primary}>
              Checkout
            </Link>
          ) : (
            <button
              type="button"
              className={formStyles.primary}
              disabled
              aria-describedby={blocker ? 'cart-blocker' : undefined}
            >
              Checkout
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
