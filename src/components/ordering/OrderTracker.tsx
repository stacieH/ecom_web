'use client';
import { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import formStyles from '@/components/forms/form.module.css';
import { venue } from '@/content/venue';
import { ApiError } from '@/lib/api/client';
import { useOrderingClient } from '@/lib/ordering/clientContext';
import { readFragmentToken, useLocationHash } from '@/lib/ordering/fragment';
import { isTerminal } from '@/lib/ordering/orderStatus';
import { orderingKeys } from '@/lib/ordering/queryKeys';
import { telHref } from '@/lib/phone';
import OrderActions from './OrderActions';
import OrderDetails from './OrderDetails';
import styles from './ordering.module.css';

export const TRACK_REFRESH_MS = 20_000;

function PhoneLink() {
  return (
    <a className={formStyles.link} href={telHref(venue.phone)}>
      {venue.phone}
    </a>
  );
}

function TrackedOrder({ token }: { token: string }) {
  const client = useOrderingClient();
  const queryClient = useQueryClient();
  const order = useQuery({
    queryKey: orderingKeys.tracked(token),
    queryFn: () => client.trackOrder(token),
    refetchInterval: (query) =>
      query.state.data && isTerminal(query.state.data.status) ? false : TRACK_REFRESH_MS,
  });

  if (order.isError) {
    const notFound = order.error instanceof ApiError && order.error.errorCode === 'ORDER_NOT_FOUND';
    return (
      <p className={formStyles.alert} role="alert">
        {notFound ? (
          <>
            This link has expired or isn’t valid. Call us on <PhoneLink /> and we’ll help.
          </>
        ) : (
          <>
            We couldn’t load your order. Please try again, or call us on <PhoneLink />.
          </>
        )}
      </p>
    );
  }

  if (!order.data) {
    return (
      <p className={formStyles.status} role="status">
        Loading your order…
      </p>
    );
  }

  return (
    <>
      <OrderDetails order={order.data} />
      <OrderActions
        order={order.data}
        onCancel={async () => {
          const updated = await client.cancelTrackedOrder(token);
          queryClient.setQueryData(orderingKeys.tracked(token), updated);
          void queryClient.invalidateQueries({ queryKey: orderingKeys.orders });
          return updated;
        }}
        onResumePayment={() => client.resumeTrackedPayment(token)}
      />
    </>
  );
}

export default function OrderTracker() {
  const hash = useLocationHash();
  const token = hash === null ? null : readFragmentToken(hash);

  let content: ReactNode;
  if (hash === null) {
    content = (
      <p className={formStyles.status} role="status">
        Loading your order…
      </p>
    );
  } else if (!token) {
    content = (
      <p className={formStyles.alert} role="alert">
        This page needs the link from your confirmation email. Call us on <PhoneLink /> if you can’t find it.
      </p>
    );
  } else {
    // Keyed by token, so opening another order's link starts clean.
    content = <TrackedOrder key={token} token={token} />;
  }

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>Track your order</h1>
      </header>
      {content}
    </>
  );
}
