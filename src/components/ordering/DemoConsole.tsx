'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckboxField, FormAlert, SelectField, TextField } from '@/components/forms/fields';
import formStyles from '@/components/forms/form.module.css';
import { ApiError } from '@/lib/api/client';
import { formatDateTime } from '@/lib/booking/time';
import { formatPeso } from '@/lib/money';
import { useOrderingClient } from '@/lib/ordering/clientContext';
import { FULFILMENT_LABELS } from '@/lib/ordering/labels';
import { orderStatusLabel } from '@/lib/ordering/orderStatus';
import { orderingKeys } from '@/lib/ordering/queryKeys';
import type { DemoControls, DemoOrderRow, DemoScenarios, OrderStatus } from '@/lib/ordering/types';
import { useCart } from './CartProvider';
import styles from './ordering.module.css';

const demoKeys = {
  outbox: [...orderingKeys.demo, 'outbox'],
  scenarios: [...orderingKeys.demo, 'scenarios'],
  orders: [...orderingKeys.demo, 'orders'],
};

const SCENARIO_SWITCHES: {
  label: string;
  isOn: (scenarios: DemoScenarios) => boolean;
  change: (on: boolean) => Partial<DemoScenarios>;
}[] = [
  { label: 'Next slot is full', isOn: (s) => s.nextSlotFull, change: (on) => ({ nextSlotFull: on }) },
  {
    label: 'Ribeye sold out',
    isOn: (s) => s.soldOutDishSlugs.includes('ribeye'),
    change: (on) => ({ soldOutDishSlugs: on ? ['ribeye'] : [] }),
  },
  {
    label: 'Prices up 10%',
    isOn: (s) => s.priceIncreasePercent === 10,
    change: (on) => ({ priceIncreasePercent: on ? 10 : 0 }),
  },
  { label: 'Online payments fail', isOn: (s) => s.failOnlinePayments, change: (on) => ({ failOnlinePayments: on }) },
  {
    label: 'Network error on next request',
    isOn: (s) => s.failNextRequest,
    change: (on) => ({ failNextRequest: on }),
  },
];

function DemoOrder({
  row,
  demo,
  onChanged,
}: {
  row: DemoOrderRow;
  demo: DemoControls;
  onChanged: () => Promise<void>;
}) {
  const [picked, setPicked] = useState<OrderStatus | ''>('');
  const [rider, setRider] = useState({ name: '', phone: '' });
  const [riderErrors, setRiderErrors] = useState<{ name?: string; phone?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A stale choice falls back to the first status the order can move to now.
  const next = picked && row.nextStatuses.includes(picked) ? picked : (row.nextStatuses[0] ?? '');

  const advance = async () => {
    if (!next) return;
    setBusy(true);
    setError(null);
    setRiderErrors({});
    try {
      await demo.advanceOrder(row.reference, next, next === 'OUT_FOR_DELIVERY' ? rider : undefined);
      setPicked('');
      await onChanged();
    } catch (caught) {
      if (caught instanceof ApiError && caught.errorCode === 'VALIDATION_FAILED') {
        setRiderErrors({ name: caught.fieldErrors.riderName?.[0], phone: caught.fieldErrors.riderPhone?.[0] });
      } else {
        setError('That status change isn’t allowed any more.');
      }
    }
    setBusy(false);
  };

  return (
    <li className={styles.cartLine}>
      <div className={styles.lineHeader}>
        <span className={styles.lineName}>{row.reference}</span>
        <span className={styles.price}>{formatPeso(row.totalCentavos)}</span>
      </div>
      <p className={styles.lineMeta}>
        {`${row.customerName} · ${FULFILMENT_LABELS[row.fulfilment]} · ${orderStatusLabel(row.status, row.fulfilment)}`}
      </p>
      <FormAlert message={error} />

      {row.nextStatuses.length > 0 && (
        <div className={styles.demoAdvance}>
          <SelectField
            id={`demo-next-${row.reference}`}
            label={`Next status for ${row.reference}`}
            value={next}
            options={row.nextStatuses.map((status) => ({
              value: status,
              label: orderStatusLabel(status, row.fulfilment),
            }))}
            onChange={(value) => setPicked(value as OrderStatus)}
          />
          {next === 'OUT_FOR_DELIVERY' && (
            <div className={formStyles.row}>
              <TextField
                id={`demo-rider-name-${row.reference}`}
                label="Rider name"
                value={rider.name}
                error={riderErrors.name}
                onChange={(name) => setRider({ ...rider, name })}
              />
              <TextField
                id={`demo-rider-phone-${row.reference}`}
                label="Rider phone"
                type="tel"
                value={rider.phone}
                error={riderErrors.phone}
                onChange={(phone) => setRider({ ...rider, phone })}
              />
            </div>
          )}
          <div className={formStyles.actions}>
            <button
              type="button"
              className={formStyles.secondary}
              disabled={busy}
              aria-label={`Advance status for ${row.reference}`}
              onClick={advance}
            >
              Advance status
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function DemoTools({ demo }: { demo: DemoControls }) {
  const queryClient = useQueryClient();
  const { dispatch } = useCart();
  const outbox = useQuery({ queryKey: demoKeys.outbox, queryFn: () => demo.getOutbox(), staleTime: 0 });
  const scenarios = useQuery({ queryKey: demoKeys.scenarios, queryFn: () => demo.getScenarios(), staleTime: 0 });
  const orders = useQuery({ queryKey: demoKeys.orders, queryFn: () => demo.listOrders(), staleTime: 0 });
  const [message, setMessage] = useState<string | null>(null);

  // Menu, slots, quotes, tracked orders, and these demo lists all sit under ['ordering'].
  // A status change can also move a signed-in customer's own order history and
  // order pages, so those caches refresh too, without touching the session.
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['ordering'] }),
      queryClient.invalidateQueries({ queryKey: orderingKeys.orders }),
      queryClient.invalidateQueries({ queryKey: ['customer', 'order'] }),
    ]);
  };

  const toggle = async (change: Partial<DemoScenarios>) => {
    setMessage(null);
    queryClient.setQueryData(demoKeys.scenarios, await demo.setScenarios(change));
    await refresh();
  };

  const reset = async () => {
    await demo.reset();
    dispatch({ type: 'CLEAR' });
    await Promise.all([queryClient.resetQueries({ queryKey: ['customer'] }), refresh()]);
    setMessage('Demo data cleared.');
  };

  const current = scenarios.data;

  return (
    <>
      <section className={styles.checkoutSection} aria-labelledby="demo-outbox-title">
        <h2 id="demo-outbox-title" className={styles.sectionTitle}>
          Emails the portal would send
        </h2>
        {outbox.data?.length === 0 && (
          <p className={formStyles.hint}>No emails yet. Place an order or create an account.</p>
        )}
        <ul className={styles.outbox}>
          {outbox.data?.map((email) => (
            <li key={email.id} className={styles.email}>
              <p className={styles.lineName}>{email.subject}</p>
              <p className={styles.lineMeta}>{`To ${email.to} · ${formatDateTime(email.sentAt)}`}</p>
              <p>{email.body}</p>
              <div className={formStyles.actions}>
                {email.links.map((link) => (
                  <Link key={link.href} className={formStyles.link} href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.checkoutSection} aria-labelledby="demo-scenarios-title">
        <h2 id="demo-scenarios-title" className={styles.sectionTitle}>
          Scenarios
        </h2>
        {current &&
          SCENARIO_SWITCHES.map((item, index) => (
            <CheckboxField
              key={item.label}
              id={`demo-scenario-${index}`}
              label={item.label}
              checked={item.isOn(current)}
              onChange={(on) => void toggle(item.change(on))}
            />
          ))}
      </section>

      <section className={styles.checkoutSection} aria-labelledby="demo-orders-title">
        <h2 id="demo-orders-title" className={styles.sectionTitle}>
          Orders
        </h2>
        {orders.data?.length === 0 && <p className={formStyles.hint}>No orders yet.</p>}
        <ul className={styles.cartLines}>
          {orders.data?.map((row) => (
            <DemoOrder key={row.reference} row={row} demo={demo} onChanged={refresh} />
          ))}
        </ul>
      </section>

      <section className={styles.checkoutSection} aria-labelledby="demo-reset-title">
        <h2 id="demo-reset-title" className={styles.sectionTitle}>
          Reset
        </h2>
        <p className={formStyles.hint}>Clears demo orders, accounts, emails, scenarios, and your cart.</p>
        {message && (
          <p className={formStyles.status} role="status">
            {message}
          </p>
        )}
        <div className={formStyles.actions}>
          <button type="button" className={formStyles.secondary} onClick={() => void reset()}>
            Reset demo data
          </button>
        </div>
      </section>
    </>
  );
}

export default function DemoConsole() {
  const client = useOrderingClient();

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <h1 className={styles.title}>Demo console</h1>
        <p className={styles.intro}>
          Demo data for the ordering portal. Orders, accounts, and emails live in this browser only.
        </p>
      </header>
      {client.demo ? (
        <DemoTools demo={client.demo} />
      ) : (
        <p className={formStyles.alert} role="alert">
          The demo console is only available with demo data.
        </p>
      )}
    </div>
  );
}
