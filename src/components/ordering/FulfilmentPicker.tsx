'use client';
import { RadioGroupField, SelectField } from '@/components/forms/fields';
import { venue } from '@/content/venue';
import { areaOptionLabel } from '@/lib/ordering/labels';
import type { DeliveryArea, Fulfilment, OrderingStatus } from '@/lib/ordering/types';
import { useCart } from './CartProvider';
import styles from './ordering.module.css';

export default function FulfilmentPicker({
  status,
  areas,
}: {
  status: OrderingStatus;
  areas: DeliveryArea[] | undefined;
}) {
  const { cart, dispatch } = useCart();

  return (
    <div className={styles.strip}>
      <RadioGroupField
        id="order-fulfilment"
        legend="Pickup or delivery"
        value={cart.fulfilment}
        options={[
          {
            value: 'PICKUP',
            label: 'Pickup',
            description: `Collect from ${venue.address[0]}, ${venue.address[1]}`,
            disabled: !status.pickupEnabled,
          },
          {
            value: 'DELIVERY',
            label: 'Delivery',
            description: 'Our riders deliver to nearby areas',
            disabled: !status.deliveryEnabled,
          },
        ]}
        onChange={(value) => dispatch({ type: 'SET_FULFILMENT', fulfilment: value as Fulfilment })}
      />

      {cart.fulfilment === 'DELIVERY' && (
        <SelectField
          id="order-area"
          label="Delivery area"
          placeholder="Choose an area"
          value={cart.areaId ?? ''}
          options={(areas ?? []).map((area) => ({ value: area.id, label: areaOptionLabel(area) }))}
          onChange={(value) => dispatch({ type: 'SET_AREA', areaId: value })}
        />
      )}
    </div>
  );
}
