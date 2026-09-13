'use client';
import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import formStyles from '@/components/forms/form.module.css';
import { formatDateTime } from '@/lib/booking/time';
import { formatPeso } from '@/lib/money';
import { useOrderingClient } from '@/lib/ordering/clientContext';
import { FULFILMENT_LABELS } from '@/lib/ordering/labels';
import { orderStatusLabel } from '@/lib/ordering/orderStatus';
import { orderingKeys } from '@/lib/ordering/queryKeys';
import AccountNav from './AccountNav';
import RequireCustomer from './RequireCustomer';
import styles from './account.module.css';

function OrderList() {
  const client = useOrderingClient();
  const orders = useInfiniteQuery({
    queryKey: orderingKeys.orders,
    queryFn: ({ pageParam }) => client.listOrders(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  if (orders.isError) {
    return (
      <p className={formStyles.alert} role="alert">
        We couldn’t load your orders. Please try again.
      </p>
    );
  }

  if (!orders.data) {
    return (
      <p className={formStyles.status} role="status">
        Loading your orders…
      </p>
    );
  }

  const list = orders.data.pages.flatMap((page) => page.orders);

  if (list.length === 0) {
    return (
      <div className={formStyles.notice}>
        <p>You haven’t ordered yet.</p>
        <Link className={formStyles.link} href="/order">
          Order online
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className={styles.list}>
        {list.map((order) => (
          <li key={order.reference} className={styles.card}>
            <Link className={styles.cardTitle} href={`/account/orders/${order.reference}`}>
              {order.reference}
            </Link>
            <p className={styles.meta}>
              {[
                formatDateTime(order.createdAt),
                FULFILMENT_LABELS[order.fulfilment],
                formatPeso(order.totalCentavos),
                orderStatusLabel(order.status, order.fulfilment),
              ].join(' · ')}
            </p>
          </li>
        ))}
      </ul>
      {orders.hasNextPage && (
        <div className={formStyles.actions}>
          <button
            type="button"
            className={formStyles.secondary}
            disabled={orders.isFetchingNextPage}
            onClick={() => void orders.fetchNextPage()}
          >
            {orders.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </>
  );
}

export default function OrderHistory() {
  return (
    <RequireCustomer>
      {() => (
        <>
          <AccountNav current="/account/orders" />
          <OrderList />
        </>
      )}
    </RequireCustomer>
  );
}
