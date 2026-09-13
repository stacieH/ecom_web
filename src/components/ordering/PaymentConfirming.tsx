'use client';
import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import formStyles from '@/components/forms/form.module.css';
import { useOrderingClient } from '@/lib/ordering/clientContext';
import { useLocationSearch } from '@/lib/ordering/fragment';
import { useRememberedToken } from '@/lib/ordering/orderTokens';
import { orderingKeys } from '@/lib/ordering/queryKeys';
import styles from './ordering.module.css';

export const CONFIRM_POLL_MS = 2000;
/** 30 checks, 2 seconds apart: one minute. */
export const CONFIRM_MAX_POLLS = 30;

export default function PaymentConfirming() {
  const client = useOrderingClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const search = useLocationSearch();
  const reference = search === null ? null : new URLSearchParams(search).get('reference');
  const token = useRememberedToken(reference);
  const queryKey = orderingKeys.tracked(token ?? '');

  const order = useQuery({
    queryKey,
    queryFn: () => client.trackOrder(token as string),
    enabled: typeof token === 'string',
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && data.status !== 'AWAITING_PAYMENT') return false;
      return query.state.dataUpdateCount < CONFIRM_MAX_POLLS ? CONFIRM_POLL_MS : false;
    },
  });

  const trackHref = token ? `/order/track#token=${encodeURIComponent(token)}` : null;
  const confirmed = order.data !== undefined && order.data.status !== 'AWAITING_PAYMENT';
  // Reading dataUpdatedAt subscribes this component to every completed check,
  // even when the order data itself is unchanged, so the timeout can show.
  const timedOut =
    order.dataUpdatedAt > 0 && (queryClient.getQueryState(queryKey)?.dataUpdateCount ?? 0) >= CONFIRM_MAX_POLLS;

  useEffect(() => {
    if (confirmed && trackHref) router.replace(trackHref);
  }, [confirmed, trackHref, router]);

  let content: ReactNode;
  if (search === null || token === undefined) {
    content = (
      <p className={formStyles.status} role="status">
        Loading…
      </p>
    );
  } else if (token === null || order.isError || !trackHref) {
    content = (
      <p className={formStyles.alert} role="alert">
        Open the link in your confirmation email to see your order.
      </p>
    );
  } else if (confirmed) {
    content = (
      <p className={formStyles.status} role="status">
        Payment confirmed. Opening your order…
      </p>
    );
  } else if (timedOut) {
    content = (
      <div className={formStyles.notice}>
        <p>We’re still confirming your payment. We’ll email you as soon as it’s through.</p>
        <Link className={formStyles.link} href={trackHref}>
          View order
        </Link>
      </div>
    );
  } else {
    content = (
      <p className={formStyles.status} role="status">
        Confirming your payment…
      </p>
    );
  }

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <h1 className={styles.title}>Payment</h1>
      </header>
      {content}
    </div>
  );
}
