'use client';
import { ChoiceOption, RadioGroupField } from '@/components/forms/fields';
import { formatPeso } from '@/lib/money';
import type { Fulfilment, OrderingStatus, PaymentMethod, Quote } from '@/lib/ordering/types';

export default function PaymentFields({
  fulfilment,
  quote,
  status,
  value,
  error,
  onChange,
  onBlur,
}: {
  fulfilment: Fulfilment | '';
  quote: Quote | undefined;
  status: OrderingStatus;
  value: PaymentMethod | '';
  error?: string;
  onChange: (method: PaymentMethod) => void;
  onBlur: () => void;
}) {
  // Only what the latest quote allows can be chosen; nothing while it loads.
  const allowed = quote?.paymentMethods ?? [];
  const options: ChoiceOption[] = [
    {
      value: 'ONLINE',
      label: 'Pay online (GCash, Maya, card, QR Ph)',
      disabled: !allowed.includes('ONLINE'),
    },
  ];

  if (fulfilment === 'DELIVERY') {
    const overCap = quote !== undefined && quote.totalCentavos > status.cashOnDeliveryMaxCentavos;
    options.push({
      value: 'CASH_ON_DELIVERY',
      label: 'Cash on delivery',
      description: overCap
        ? `Available for orders up to ${formatPeso(status.cashOnDeliveryMaxCentavos)}`
        : 'Pay the rider in cash',
      disabled: !allowed.includes('CASH_ON_DELIVERY'),
    });
  } else {
    options.push({
      value: 'PAY_AT_PICKUP',
      label: 'Pay at pickup',
      description: 'Cash or card when you collect',
      disabled: !allowed.includes('PAY_AT_PICKUP'),
    });
  }

  return (
    <div data-field="paymentMethod">
      <RadioGroupField
        id="checkout-payment"
        legend="Payment"
        value={value}
        error={error}
        options={options}
        onChange={(method) => onChange(method as PaymentMethod)}
        onBlur={onBlur}
      />
    </div>
  );
}
