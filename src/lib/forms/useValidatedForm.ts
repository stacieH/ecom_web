'use client';
import { useState } from 'react';

export type FieldErrors<V> = Partial<Record<keyof V, string>>;
export type FieldRule<V, K extends keyof V> = (value: V[K], values: V) => string | undefined;
export type FieldRules<V> = { [K in keyof V]?: FieldRule<V, K> };

export interface ValidatedForm<V> {
  values: V;
  errors: FieldErrors<V>;
  setValue: <K extends keyof V>(name: K, value: V[K]) => void;
  /** Change several fields at once; pass related changes together in one call. */
  setValues: (changes: Partial<V>) => void;
  blur: (name: keyof V) => void;
  /** Checks every field; returns the invalid ones in the order the rules list them. */
  validateAll: () => (keyof V)[];
  setServerErrors: (errors: FieldErrors<V>) => void;
  reset: (values: V) => void;
}

function runRule<V>(rules: FieldRules<V>, name: keyof V, values: V): string | undefined {
  const rule = rules[name] as ((value: V[keyof V], all: V) => string | undefined) | undefined;
  return rule ? rule(values[name], values) : undefined;
}

/**
 * Per-field validation with one behaviour everywhere:
 * - typing into an untouched field never shows a message;
 * - leaving a field checks it;
 * - any field already showing a message is re-checked on every change, so the
 *   message clears the moment the value is fixed (and cross-field rules such as
 *   "Passwords don’t match" stay current);
 * - submit checks everything.
 * Server field errors show until their own field changes.
 */
export function useValidatedForm<V extends object>({
  initialValues,
  rules,
}: {
  initialValues: V;
  rules: FieldRules<V>;
}): ValidatedForm<V> {
  const [values, setValuesState] = useState<V>(initialValues);
  const [clientErrors, setClientErrors] = useState<FieldErrors<V>>({});
  const [serverErrors, setServerErrorsState] = useState<FieldErrors<V>>({});

  const setValues = (changes: Partial<V>) => {
    const next = { ...values, ...changes };
    const changed = Object.keys(changes) as (keyof V)[];

    setValuesState(next);
    setServerErrorsState((previous) => {
      if (!changed.some((name) => previous[name])) return previous;
      const copy = { ...previous };
      changed.forEach((name) => delete copy[name]);
      return copy;
    });
    setClientErrors((previous) => {
      const shown = Object.keys(previous) as (keyof V)[];
      if (shown.length === 0) return previous;

      const recomputed: FieldErrors<V> = {};
      shown.forEach((name) => {
        const error = runRule(rules, name, next);
        if (error) recomputed[name] = error;
      });
      return recomputed;
    });
  };

  const blur = (name: keyof V) => {
    const error = runRule(rules, name, values);
    setClientErrors((previous) => {
      if (previous[name] === error) return previous;
      const copy = { ...previous };
      if (error) {
        copy[name] = error;
      } else {
        delete copy[name];
      }
      return copy;
    });
  };

  const validateAll = () => {
    const all: FieldErrors<V> = {};
    const invalid: (keyof V)[] = [];

    (Object.keys(rules) as (keyof V)[]).forEach((name) => {
      const error = runRule(rules, name, values);
      if (error) {
        all[name] = error;
        invalid.push(name);
      }
    });

    setClientErrors(all);
    return invalid;
  };

  const reset = (nextValues: V) => {
    setValuesState(nextValues);
    setClientErrors({});
    setServerErrorsState({});
  };

  return {
    values,
    errors: { ...serverErrors, ...clientErrors },
    setValue: (name, value) => setValues({ [name]: value } as unknown as Partial<V>),
    setValues,
    blur,
    validateAll,
    setServerErrors: setServerErrorsState,
    reset,
  };
}
