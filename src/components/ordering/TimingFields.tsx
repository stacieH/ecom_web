'use client';
import { useState } from 'react';
import { describedBy, fieldIds, RadioGroupField } from '@/components/forms/fields';
import formStyles from '@/components/forms/form.module.css';
import { formatTime } from '@/lib/booking/time';
import { promisedTime } from '@/lib/ordering/checkoutForm';
import type { Fulfilment, SlotList } from '@/lib/ordering/types';
import styles from './ordering.module.css';

export interface TimingFieldsProps {
  fulfilment: Fulfilment | '';
  /** Delivery without an area: delivery times cannot be listed yet. */
  needsArea: boolean;
  /** Today and tomorrow, or undefined while loading. */
  days: SlotList[] | undefined;
  timeMode: 'ASAP' | 'SCHEDULED' | '';
  startsAt: string;
  errors: { timeMode?: string; startsAt?: string };
  onTimeModeChange: (mode: 'ASAP' | 'SCHEDULED') => void;
  onStartsAtChange: (startsAt: string) => void;
  onBlur: (name: 'timeMode' | 'startsAt') => void;
}

const SLOTS_ID = 'checkout-startsAt';

export default function TimingFields({
  fulfilment,
  needsArea,
  days,
  timeMode,
  startsAt,
  errors,
  onTimeModeChange,
  onStartsAtChange,
  onBlur,
}: TimingFieldsProps) {
  const [dayChoice, setDayChoice] = useState<number | null>(null);

  const delivery = fulfilment === 'DELIVERY';
  const asap = needsArea ? null : (days?.[0]?.asapStartsAt ?? null);

  let asapDescription = 'Not available right now';
  if (needsArea) {
    asapDescription = 'Choose a delivery area to see the estimate';
  } else if (!days) {
    asapDescription = 'Checking the kitchen…';
  } else if (asap) {
    asapDescription = `${delivery ? 'Arriving' : 'Ready'} around ${formatTime(promisedTime(fulfilment, asap))}`;
  }

  // Open on tomorrow when nothing is left today, until the guest picks a tab.
  const dayIndex = dayChoice ?? (days && days[0].slots.length === 0 ? 1 : 0);
  const shownDay = days?.[dayIndex];

  const timeError = errors.startsAt && (
    <p id={fieldIds(SLOTS_ID).error} className={formStyles.error} role="alert">
      {errors.startsAt}
    </p>
  );

  const renderSchedule = () => {
    if (needsArea || !days) {
      return (
        <div className={formStyles.field} data-field="startsAt">
          {needsArea ? (
            <p className={formStyles.hint}>Choose a delivery area to see delivery times.</p>
          ) : (
            <p className={formStyles.status} role="status">
              Loading times…
            </p>
          )}
          {timeError}
        </div>
      );
    }

    return (
      <div className={formStyles.field} data-field="startsAt">
        <div className={styles.dayTabs} role="group" aria-label="Day">
          {days.map((day, index) => (
            <button
              key={day.date}
              type="button"
              className={styles.dayTab}
              aria-pressed={index === dayIndex}
              onClick={() => setDayChoice(index)}
            >
              {index === 0 ? 'Today' : 'Tomorrow'}
            </button>
          ))}
        </div>

        <fieldset
          className={formStyles.fieldset}
          role="radiogroup"
          aria-labelledby={`${SLOTS_ID}-legend`}
          aria-describedby={describedBy(SLOTS_ID, { error: errors.startsAt })}
          aria-invalid={Boolean(errors.startsAt)}
        >
          <legend id={`${SLOTS_ID}-legend`} className={formStyles.legend}>
            {delivery ? 'Delivery time' : 'Pickup time'}
          </legend>
          {shownDay && shownDay.slots.length === 0 && (
            <p className={formStyles.hint}>No times left on this day.</p>
          )}
          <div className={styles.slotGrid}>
            {shownDay?.slots.map((slot) => {
              const id = `${SLOTS_ID}-${slot.startsAt.replace(/\D/g, '')}`;
              return (
                <label key={slot.startsAt} className={formStyles.choice} htmlFor={id}>
                  <input
                    id={id}
                    type="radio"
                    name={SLOTS_ID}
                    value={slot.startsAt}
                    checked={startsAt === slot.startsAt}
                    disabled={!slot.available}
                    onChange={() => onStartsAtChange(slot.startsAt)}
                    onBlur={() => onBlur('startsAt')}
                  />
                  <span className={formStyles.choiceText}>
                    <span>{formatTime(slot.startsAt)}</span>
                    {!slot.available && <span className={formStyles.choiceDescription}>Full</span>}
                  </span>
                </label>
              );
            })}
          </div>
          {timeError}
        </fieldset>
      </div>
    );
  };

  return (
    <>
      <div data-field="timeMode">
        <RadioGroupField
          id="checkout-time"
          legend="When"
          value={timeMode}
          error={errors.timeMode}
          options={[
            {
              value: 'ASAP',
              label: 'As soon as possible',
              description: asapDescription,
              disabled: !needsArea && days !== undefined && asap === null,
            },
            {
              value: 'SCHEDULED',
              label: 'Schedule',
              description: `Choose a ${delivery ? 'delivery' : 'pickup'} time today or tomorrow`,
            },
          ]}
          onChange={(value) => onTimeModeChange(value as 'ASAP' | 'SCHEDULED')}
          onBlur={() => onBlur('timeMode')}
        />
      </div>
      {timeMode === 'SCHEDULED' && renderSchedule()}
    </>
  );
}
