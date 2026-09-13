'use client';
import { FormEvent, KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from 'react';
import { describedBy, fieldIds, focusFirstInvalid, RadioGroupField, TextAreaField } from '@/components/forms/fields';
import formStyles from '@/components/forms/form.module.css';
import { useValidatedForm } from '@/lib/forms/useValidatedForm';
import { formatPeso } from '@/lib/money';
import type { LineChoice } from '@/lib/ordering/cart/cartReducer';
import type { MenuDish, MenuOption, MenuOptionGroup } from '@/lib/ordering/types';
import { LIMITS, lineNoteRule, optionGroupRule, quantityRule } from '@/lib/ordering/validation/rules';
import styles from './ordering.module.css';

interface DishValues {
  optionIds: string[];
  quantity: string;
  note: string;
}

const FOCUSABLE =
  'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]';

const groupFieldId = (group: MenuOptionGroup) => `dish-group-${group.id}`;
const isSingleChoice = (group: MenuOptionGroup) => group.minSelect === 1 && group.maxSelect === 1;

function optionDescription(option: MenuOption): string | undefined {
  if (option.soldOut) return 'Sold out';
  if (option.priceDeltaCentavos > 0) return `+${formatPeso(option.priceDeltaCentavos)}`;
  return undefined;
}

export default function DishDialog({
  dish,
  initial,
  mode = 'add',
  onSubmit,
  onClose,
}: {
  dish: MenuDish;
  initial?: Omit<LineChoice, 'dishId'>;
  mode?: 'add' | 'update';
  onSubmit: (choice: LineChoice) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Group rules run once the guest has tried to submit, then stay live.
  const [submitted, setSubmitted] = useState(false);

  const form = useValidatedForm<DishValues>({
    initialValues: {
      optionIds: initial?.optionIds ?? [],
      quantity: String(initial?.quantity ?? 1),
      note: initial?.note ?? '',
    },
    rules: {
      quantity: (value) => quantityRule(Number(value)),
      note: (value) => lineNoteRule(value),
    },
  });

  // Focus moves into the dialog and goes back to whatever opened it.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => opener?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Same lock as the gallery lightbox: <html> overflow, which Lenis's
  // autoToggle respects.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  const keepFocusInside = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !dialogRef.current) return;

    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const { optionIds } = form.values;
  const quantity = Number(form.values.quantity);
  const pricedQuantity = quantityRule(quantity) ? 1 : quantity;
  const extras = dish.optionGroups
    .flatMap((group) => group.options)
    .filter((option) => optionIds.includes(option.id))
    .reduce((total, option) => total + option.priceDeltaCentavos, 0);
  const linePrice = (dish.priceCentavos + extras) * pricedQuantity;

  const groupError = (group: MenuOptionGroup) =>
    submitted ? optionGroupRule(group, optionIds) : undefined;

  const chooseSingle = (group: MenuOptionGroup, optionId: string) => {
    const outsideGroup = optionIds.filter((id) => !group.options.some((option) => option.id === id));
    form.setValue('optionIds', [...outsideGroup, optionId]);
  };

  const toggleOption = (optionId: string, checked: boolean) => {
    form.setValue(
      'optionIds',
      checked ? [...optionIds, optionId] : optionIds.filter((id) => id !== optionId),
    );
  };

  const stepQuantity = (delta: number) => {
    form.setValue('quantity', String(Math.min(LIMITS.maxQuantity, Math.max(1, pricedQuantity + delta))));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);

    const invalidGroups = dish.optionGroups.filter((group) => optionGroupRule(group, optionIds));
    const invalidFields = form.validateAll();
    if (invalidGroups.length > 0 || invalidFields.length > 0) {
      focusFirstInvalid([
        ...invalidGroups.map((group) => {
          const target = group.options.find((option) => !option.soldOut) ?? group.options[0];
          return `${groupFieldId(group)}-${target.id}`;
        }),
        ...invalidFields.map((name) => `dish-${name}`),
      ]);
      return;
    }

    onSubmit({ dishId: dish.id, optionIds, quantity, note: form.values.note });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dish-dialog-title"
        data-lenis-prevent
        onClick={(event) => event.stopPropagation()}
        onKeyDown={keepFocusInside}
      >
        <div className={styles.dialogHeader}>
          <div>
            <h2 id="dish-dialog-title" className={styles.dialogTitle}>
              {dish.name}
            </h2>
            <p className={styles.dishDescription}>{dish.description}</p>
          </div>
          <button ref={closeRef} type="button" className={styles.close} onClick={onClose}>
            Close
          </button>
        </div>

        <form className={formStyles.form} noValidate onSubmit={submit}>
          {dish.optionGroups.map((group) => {
            const id = groupFieldId(group);
            const error = groupError(group);

            if (isSingleChoice(group)) {
              return (
                <RadioGroupField
                  key={group.id}
                  id={id}
                  legend={group.name}
                  value={optionIds.find((optionId) => group.options.some((option) => option.id === optionId)) ?? ''}
                  error={error}
                  options={group.options.map((option) => ({
                    value: option.id,
                    label: option.name,
                    description: optionDescription(option),
                    disabled: option.soldOut,
                  }))}
                  onChange={(optionId) => chooseSingle(group, optionId)}
                />
              );
            }

            return (
              <fieldset
                key={group.id}
                className={formStyles.fieldset}
                aria-describedby={describedBy(id, { error })}
                aria-invalid={Boolean(error)}
              >
                <legend className={formStyles.legend}>
                  {group.maxSelect === 1 ? group.name : `${group.name}, up to ${group.maxSelect}`}
                  {group.minSelect === 0 && <span className={formStyles.optional}> (optional)</span>}
                </legend>
                <div className={formStyles.choices}>
                  {group.options.map((option) => {
                    const optionId = `${id}-${option.id}`;
                    const checked = optionIds.includes(option.id);
                    const description = optionDescription(option);
                    return (
                      <label key={option.id} className={formStyles.choice} htmlFor={optionId}>
                        <input
                          id={optionId}
                          type="checkbox"
                          checked={checked}
                          disabled={option.soldOut && !checked}
                          onChange={(event) => toggleOption(option.id, event.target.checked)}
                        />
                        <span className={formStyles.choiceText}>
                          <span>{option.name}</span>
                          {description && <span className={formStyles.choiceDescription}>{description}</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {error && (
                  <p id={fieldIds(id).error} className={formStyles.error} role="alert">
                    {error}
                  </p>
                )}
              </fieldset>
            );
          })}

          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor="dish-quantity">
              Quantity
            </label>
            <div className={styles.stepper}>
              <button
                type="button"
                className={styles.stepperButton}
                aria-label="Decrease quantity"
                disabled={pricedQuantity <= 1}
                onClick={() => stepQuantity(-1)}
              >
                −
              </button>
              <input
                id="dish-quantity"
                className={`${formStyles.input} ${styles.quantityInput}`}
                inputMode="numeric"
                value={form.values.quantity}
                onChange={(event) => form.setValue('quantity', event.target.value)}
                onBlur={() => form.blur('quantity')}
                aria-invalid={Boolean(form.errors.quantity)}
                aria-describedby={describedBy('dish-quantity', { error: form.errors.quantity })}
              />
              <button
                type="button"
                className={styles.stepperButton}
                aria-label="Increase quantity"
                disabled={pricedQuantity >= LIMITS.maxQuantity}
                onClick={() => stepQuantity(1)}
              >
                +
              </button>
            </div>
            {form.errors.quantity && (
              <p id={fieldIds('dish-quantity').error} className={formStyles.error} role="alert">
                {form.errors.quantity}
              </p>
            )}
          </div>

          <TextAreaField
            id="dish-note"
            label="Note for the kitchen"
            optional
            hint="Allergies or small requests"
            value={form.values.note}
            error={form.errors.note}
            onChange={(value) => form.setValue('note', value)}
            onBlur={() => form.blur('note')}
          />

          <div className={formStyles.actions}>
            <button type="submit" className={formStyles.primary}>
              {`${mode === 'add' ? 'Add to order' : 'Update order'} ${formatPeso(linePrice)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
