'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FormAlert } from '@/components/forms/fields';
import formStyles from '@/components/forms/form.module.css';
import { formatTime } from '@/lib/booking/time';
import { holdEndsAt } from '@/lib/ordering/checkoutForm';
import { useOrderingClient } from '@/lib/ordering/clientContext';
import { useRememberedToken } from '@/lib/ordering/orderTokens';
import { orderingKeys } from '@/lib/ordering/queryKeys';

export default function PaymentCancelled({ reference }: { reference: string }) {
  const client = useOrderingClient();
  const router = useRouter();
  const token = useRememberedToken(reference);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const order = useQuery({
    queryKey: orderingKeys.tracked(token ?? ''),
    queryFn: () => client.trackOrder(token as string),
    enabled: typeof token === 'string',
  });

  if (token === null || order.isError) {
    return (
      <p className={formStyles.alert} role="alert">
        Open the link in your confirmation email to see your order.
      </p>
    );
  }

  if (token === undefined || !order.data) {
    return (
      <p className={formStyles.status} role="status">
        Loading your order…
      </p>
    );
  }

  const trackHref = `/order/track#token=${encodeURIComponent(token)}`;

  if (!order.data.canResumePayment) {
    return (
      <div className={formStyles.notice}>
        <p>This order is no longer waiting for payment.</p>
        <div className={formStyles.actions}>
          <Link className={formStyles.secondary} href={trackHref}>
            View order
          </Link>
          <Link className={formStyles.link} href="/order">
            Back to the menu
          </Link>
        </div>
      </div>
    );
  }

  const retry = async () => {
    setRetrying(true);
    setRetryError(null);
    try {
      const { checkoutUrl } = await client.resumeTrackedPayment(token);
      router.push(checkoutUrl);
    } catch {
      setRetryError('We couldn’t reopen payment. Please try again.');
      setRetrying(false);
    }
  };

  return (
    <div className={formStyles.notice}>
      <p role="status">
        {`Payment was cancelled. Your order is held until ${formatTime(holdEndsAt(order.data.createdAt))}`}
      </p>
      <FormAlert message={retryError} />
      <div className={formStyles.actions}>
        <button type="button" className={formStyles.primary} disabled={retrying} onClick={retry}>
          Try payment again
        </button>
        <Link className={formStyles.link} href={trackHref}>
          View order
        </Link>
      </div>
    </div>
  );
}
