import formStyles from '@/components/forms/form.module.css';
import { formatDateTime } from '@/lib/booking/time';
import { formatPeso } from '@/lib/money';
import {
  FULFILMENT_LABELS,
  optionSummary,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from '@/lib/ordering/labels';
import { orderStatusLabel, orderTimeline } from '@/lib/ordering/orderStatus';
import type { OrderSummary } from '@/lib/ordering/types';
import { telHref } from '@/lib/phone';
import styles from './ordering.module.css';

export default function OrderDetails({ order }: { order: OrderSummary }) {
  const delivery = order.delivery;

  return (
    <div className={styles.panel}>
      <div className={styles.orderHeading}>
        <h2 className={styles.sectionTitle}>{order.reference}</h2>
        <p className={styles.statusBadge} role="status">
          {orderStatusLabel(order.status, order.fulfilment)}
        </p>
      </div>

      <ol className={styles.timeline} aria-label="Order progress">
        {orderTimeline(order).map((step) => (
          <li
            key={step.status}
            className={styles.timelineStep}
            data-state={step.state}
            aria-current={step.state === 'current' ? 'step' : undefined}
          >
            {step.label}
          </li>
        ))}
      </ol>

      <dl className={styles.detailList}>
        <div>
          <dt>{order.fulfilment === 'DELIVERY' ? 'Arriving around' : 'Ready around'}</dt>
          <dd>{formatDateTime(order.promisedAt)}</dd>
        </div>
        <div>
          <dt>Fulfilment</dt>
          <dd>{FULFILMENT_LABELS[order.fulfilment]}</dd>
        </div>
        <div>
          <dt>Payment</dt>
          <dd>{`${PAYMENT_METHOD_LABELS[order.payment.method]} · ${PAYMENT_STATUS_LABELS[order.payment.status]}`}</dd>
        </div>
        {delivery && (
          <div>
            <dt>Deliver to</dt>
            <dd>
              {[delivery.street, delivery.building, delivery.areaName].filter(Boolean).join(', ')}
              {delivery.landmark && <span className={styles.lineMeta}>{` · Landmark: ${delivery.landmark}`}</span>}
            </dd>
          </div>
        )}
        {delivery?.riderName && order.status === 'OUT_FOR_DELIVERY' && (
          <div>
            <dt>Rider</dt>
            <dd>
              {delivery.riderName}
              {delivery.riderPhone && (
                <>
                  {' · '}
                  <a className={formStyles.link} href={telHref(delivery.riderPhone)}>
                    {delivery.riderPhone}
                  </a>
                </>
              )}
            </dd>
          </div>
        )}
      </dl>

      <ul className={styles.cartLines}>
        {order.lines.map((line, index) => (
          <li key={`${line.dishId}-${index}`} className={styles.cartLine}>
            <div className={styles.lineHeader}>
              <span className={styles.lineName}>{`${line.quantity} × ${line.name}`}</span>
              <span className={styles.price}>{formatPeso(line.lineTotalCentavos)}</span>
            </div>
            {line.options.length > 0 && <p className={styles.lineMeta}>{optionSummary(line)}</p>}
            {line.note && <p className={styles.lineMeta}>{`Note: ${line.note}`}</p>}
          </li>
        ))}
      </ul>
      {order.notes && <p className={styles.lineMeta}>{`Order notes: ${order.notes}`}</p>}

      <dl className={styles.totals}>
        <div className={styles.totalRow}>
          <dt>Subtotal</dt>
          <dd>{formatPeso(order.subtotalCentavos)}</dd>
        </div>
        {order.fulfilment === 'DELIVERY' && (
          <div className={styles.totalRow}>
            <dt>Delivery fee</dt>
            <dd>{formatPeso(order.deliveryFeeCentavos)}</dd>
          </div>
        )}
        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
          <dt>Total</dt>
          <dd>{formatPeso(order.totalCentavos)}</dd>
        </div>
      </dl>
    </div>
  );
}
