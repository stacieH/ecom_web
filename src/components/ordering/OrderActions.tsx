'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormAlert } from '@/components/forms/fields';
import formStyles from '@/components/forms/form.module.css';
import { venue } from '@/content/venue';
import { ApiError } from '@/lib/api/client';
import type { OrderSummary } from '@/lib/ordering/types';
import styles from './ordering.module.css';

export default function OrderActions({
  order,
  onCancel,
  onResumePayment,
}: {
  order: OrderSummary;
  /** Cancels and stores the updated order in the query cache. */
  onCancel: () => Promise<OrderSummary>;
  onResumePayment: () => Promise<{ checkoutUrl: string }>;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      await onCancel();
      setConfirming(false);
      setMessage('Your order has been cancelled. We’ve emailed you a confirmation.');
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.errorCode === 'ORDER_NOT_CANCELLABLE'
          ? `The kitchen has already started this order, so it can’t be cancelled online. Please call us on ${venue.phone}.`
          : 'We couldn’t cancel your order. Please try again.',
      );
    }
    setBusy(false);
  };

  const resume = async () => {
    setBusy(true);
    setError(null);
    try {
      const { checkoutUrl } = await onResumePayment();
      router.push(checkoutUrl);
    } catch {
      setError('This order is no longer waiting for payment.');
      setBusy(false);
    }
  };

  if (!confirming && !message && !error && !order.canCancel && !order.canResumePayment) {
    return null;
  }

  return (
    <div className={styles.actionsPanel}>
      {message && (
        <p className={formStyles.status} role="status">
          {message}
        </p>
      )}
      <FormAlert message={error} />

      {confirming ? (
        <div className={formStyles.notice}>
          <p>Cancel this order?</p>
          {order.payment.status === 'PAID' && (
            <p>You’ll get a full refund. GCash and Maya refunds arrive within 24 hours; cards can take up to 30 days.</p>
          )}
          <div className={formStyles.actions}>
            <button type="button" className={formStyles.primary} disabled={busy} onClick={cancel}>
              Yes, cancel order
            </button>
            <button
              type="button"
              className={formStyles.secondary}
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Keep my order
            </button>
          </div>
        </div>
      ) : (
        <div className={formStyles.actions}>
          {order.canResumePayment && (
            <button type="button" className={formStyles.primary} disabled={busy} onClick={resume}>
              Complete payment
            </button>
          )}
          {order.canCancel && (
            <button
              type="button"
              className={formStyles.secondary}
              disabled={busy}
              onClick={() => {
                setMessage(null);
                setConfirming(true);
              }}
            >
              Cancel order
            </button>
          )}
        </div>
      )}
    </div>
  );
}
