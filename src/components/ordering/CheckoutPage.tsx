'use client';
import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { useCustomerSession } from '@/components/account/CustomerSessionProvider';
import formStyles from '@/components/forms/form.module.css';
import { venue } from '@/content/venue';
import { useLocationSearch } from '@/lib/ordering/fragment';
import { useDeliveryAreas, useMenu, useOrderingStatus } from '@/lib/ordering/queries';
import { telHref } from '@/lib/phone';
import { useCart } from './CartProvider';
import CheckoutForm from './CheckoutForm';
import PaymentCancelled from './PaymentCancelled';
import styles from './ordering.module.css';

export default function CheckoutPage() {
  const search = useLocationSearch();
  const session = useCustomerSession();
  const { cart } = useCart();
  const status = useOrderingStatus();
  const areas = useDeliveryAreas();
  const menu = useMenu();
  const [placed, setPlaced] = useState(false);

  const params = new URLSearchParams(search ?? '');
  const cancelledReference = params.get('payment') === 'cancelled' ? params.get('reference') : null;
  const loading = (
    <p className={formStyles.status} role="status">
      Loading checkout…
    </p>
  );

  let content: ReactNode;
  if (search === null) {
    content = loading;
  } else if (cancelledReference) {
    content = <PaymentCancelled reference={cancelledReference} />;
  } else if (placed) {
    content = (
      <p className={formStyles.status} role="status">
        Taking you to your order…
      </p>
    );
  } else if (status.isError || areas.isError || menu.isError) {
    content = (
      <p className={formStyles.alert} role="alert">
        We couldn’t load checkout. Please try again, or call us on{' '}
        <a className={formStyles.link} href={telHref(venue.phone)}>
          {venue.phone}
        </a>
        .
      </p>
    );
  } else if (session.status === 'loading' || !status.data || !areas.data || !menu.data) {
    content = loading;
  } else if (cart.lines.length === 0) {
    content = (
      <div className={formStyles.notice}>
        <p>Your order is empty</p>
        <Link className={formStyles.link} href="/order">
          Back to the menu
        </Link>
      </div>
    );
  } else {
    content = (
      <CheckoutForm
        customer={session.customer}
        status={status.data}
        areas={areas.data}
        menu={menu.data}
        onPlaced={() => setPlaced(true)}
      />
    );
  }

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>Checkout</h1>
      </header>
      {content}
    </>
  );
}
