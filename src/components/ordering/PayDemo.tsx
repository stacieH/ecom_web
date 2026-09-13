'use client';
import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FormAlert } from '@/components/forms/fields';
import formStyles from '@/components/forms/form.module.css';
import { formatTime } from '@/lib/booking/time';
import { formatPeso } from '@/lib/money';
import { useOrderingClient } from '@/lib/ordering/clientContext';
import { useLocationSearch } from '@/lib/ordering/fragment';
import { ONLINE_METHOD_LABELS } from '@/lib/ordering/labels';
import { orderingKeys } from '@/lib/ordering/queryKeys';
import type { DemoControls, DemoPaymentOutcome } from '@/lib/ordering/types';
import styles from './ordering.module.css';

/** Stands in for PayMongo's hosted checkout until the ordering API is live. */
export default function PayDemo() {
  const client = useOrderingClient();
  const router = useRouter();
  const search = useLocationSearch();
  const sessionId = search === null ? null : new URLSearchParams(search).get('session');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const session = useQuery({
    queryKey: orderingKeys.checkoutSession(sessionId ?? ''),
    queryFn: () => (client.demo as DemoControls).getCheckoutSession(sessionId as string),
    enabled: Boolean(sessionId) && client.demo !== null,
    staleTime: 0,
  });

  const complete = async (outcome: DemoPaymentOutcome) => {
    if (!sessionId || !client.demo) return;
    setBusy(true);
    setFailure(null);
    try {
      const { redirectTo } = await client.demo.completeCheckout(sessionId, outcome);
      if (redirectTo) {
        router.push(redirectTo);
        return;
      }
      setFailure('Payment failed. Try again or choose another way to pay.');
    } catch {
      setFailure('This payment has already ended. Go back to your order to try again.');
    }
    setBusy(false);
  };

  let content: ReactNode;
  if (search === null || (sessionId && client.demo && session.isPending)) {
    content = (
      <p className={formStyles.status} role="status">
        Loading payment…
      </p>
    );
  } else if (!client.demo) {
    content = (
      <p className={formStyles.alert} role="alert">
        Demo payment isn’t available.
      </p>
    );
  } else if (!sessionId || session.isError || !session.data) {
    content = (
      <p className={formStyles.alert} role="alert">
        This payment link isn’t valid. Go back to your order to try again.
      </p>
    );
  } else if (session.data.status !== 'OPEN') {
    content = (
      <div className={formStyles.notice}>
        <p>This payment has already ended.</p>
        <Link className={formStyles.link} href="/order">
          Back to the menu
        </Link>
      </div>
    );
  } else {
    const payment = session.data;
    content = (
      <>
        <dl className={styles.detailList}>
          <div>
            <dt>Order</dt>
            <dd>{payment.reference}</dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>{formatPeso(payment.totalCentavos)}</dd>
          </div>
          <div>
            <dt>Pay by</dt>
            <dd>{formatTime(payment.holdExpiresAt)}</dd>
          </div>
          <div>
            <dt>Methods</dt>
            <dd>{payment.methods.map((method) => ONLINE_METHOD_LABELS[method] ?? method).join(', ')}</dd>
          </div>
        </dl>

        <ul className={styles.cartLines}>
          {payment.lines.map((line, index) => (
            <li key={`${line.dishId}-${index}`} className={styles.cartLine}>
              <div className={styles.lineHeader}>
                <span className={styles.lineName}>{`${line.quantity} × ${line.name}`}</span>
                <span className={styles.price}>{formatPeso(line.lineTotalCentavos)}</span>
              </div>
            </li>
          ))}
        </ul>

        <FormAlert message={failure} />
        <div className={formStyles.actions}>
          <button type="button" className={formStyles.primary} disabled={busy} onClick={() => complete('PAID')}>
            {`Pay ${formatPeso(payment.totalCentavos)}`}
          </button>
          <button
            type="button"
            className={formStyles.secondary}
            disabled={busy}
            onClick={() => complete('CANCELLED')}
          >
            Cancel payment
          </button>
          <button type="button" className={styles.textButton} disabled={busy} onClick={() => complete('FAILED')}>
            Simulate payment failure
          </button>
        </div>
      </>
    );
  }

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <h1 className={styles.title}>Demo payment</h1>
      </header>
      <p className={styles.banner}>Demo payment. No money moves and no card details are collected.</p>
      {content}
    </div>
  );
}
