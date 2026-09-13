'use client';
import { useState } from 'react';
import Link from 'next/link';
import formStyles from '@/components/forms/form.module.css';
import { venue } from '@/content/venue';
import { describeAvailability } from '@/lib/ordering/availability';
import type { LineChoice } from '@/lib/ordering/cart/cartReducer';
import { useDeliveryAreas, useMenu, useOrderingStatus, useSlotDays } from '@/lib/ordering/queries';
import type { MenuDish } from '@/lib/ordering/types';
import { telHref } from '@/lib/phone';
import { useCart } from './CartProvider';
import DishCard from './DishCard';
import DishDialog from './DishDialog';
import FulfilmentPicker from './FulfilmentPicker';
import OrderingStatusBanner from './OrderingStatusBanner';
import styles from './ordering.module.css';

interface DialogState {
  dish: MenuDish;
  /** The cart line being edited, or null when adding a new one. */
  editKey: string | null;
}

function MenuHeader() {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>Order online</h1>
      <p className={styles.intro}>
        Pickup from {venue.address[0]}, {venue.address[1]}, or delivery to nearby areas.
      </p>
      <p className={styles.demoNote}>
        Demo ordering: orders and accounts stay in this browser.{' '}
        <Link className={formStyles.link} href="/order/demo">
          Open the demo console
        </Link>
      </p>
    </header>
  );
}

export default function OrderMenu() {
  const { cart, dispatch } = useCart();
  const menu = useMenu();
  const status = useOrderingStatus();
  const areas = useDeliveryAreas();
  const days = useSlotDays(cart.fulfilment, cart.areaId);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  if (menu.isError || status.isError) {
    return (
      <>
        <MenuHeader />
        <p className={formStyles.alert} role="alert">
          We couldn’t load the menu. Please try again, or call us on{' '}
          <a className={formStyles.link} href={telHref(venue.phone)}>
            {venue.phone}
          </a>
          .
        </p>
      </>
    );
  }

  if (!menu.data || !status.data) {
    return (
      <>
        <MenuHeader />
        <p className={formStyles.status} role="status">
          Loading the menu…
        </p>
      </>
    );
  }

  const availability = describeAvailability(status.data, days.data ?? null);
  const ordersOpen = availability.kind === 'open' || availability.kind === 'closedToday';
  const editing = dialog?.editKey ? cart.lines.find((line) => line.key === dialog.editKey) : undefined;

  const saveLine = (choice: LineChoice) => {
    if (dialog?.editKey) {
      dispatch({ type: 'REPLACE', key: dialog.editKey, line: choice });
    } else {
      dispatch({ type: 'ADD', line: choice });
    }
    setDialog(null);
  };

  return (
    <>
      <MenuHeader />
      {availability.kind !== 'open' && <OrderingStatusBanner message={availability.message} />}

      <div className={styles.layout}>
        <div>
          <FulfilmentPicker status={status.data} areas={areas.data} />

          <nav className={styles.tabs} aria-label="Menu courses">
            {menu.data.categories.map((category) => (
              <a key={category.slug} className={styles.tab} href={`#order-${category.slug}`}>
                {category.name}
              </a>
            ))}
          </nav>

          {menu.data.categories.map((category) => (
            <section
              key={category.slug}
              id={`order-${category.slug}`}
              className={styles.category}
              aria-labelledby={`order-${category.slug}-title`}
            >
              <h2 id={`order-${category.slug}-title`} className={styles.categoryTitle}>
                {category.name}
              </h2>
              <div className={styles.dishes}>
                {category.dishes.map((dish) => (
                  <DishCard
                    key={dish.id}
                    dish={dish}
                    ordersOpen={ordersOpen}
                    onAdd={() => setDialog({ dish, editKey: null })}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {dialog && (
        <DishDialog
          key={`${dialog.dish.id}:${dialog.editKey ?? 'new'}`}
          dish={dialog.dish}
          mode={editing ? 'update' : 'add'}
          initial={editing}
          onSubmit={saveLine}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
