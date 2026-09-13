import { act, renderHook } from '@testing-library/react';
import { FieldRules, useValidatedForm } from '@/lib/forms/useValidatedForm';

interface Values {
  email: string;
  password: string;
  confirm: string;
}

const rules: FieldRules<Values> = {
  email: (value) => (value.includes('@') ? undefined : 'Enter a valid email address'),
  password: (value) => (value.length >= 10 ? undefined : 'Use at least 10 characters'),
  confirm: (value, values) => (value === values.password ? undefined : 'Passwords don’t match'),
};

const initialValues: Values = { email: '', password: '', confirm: '' };

function setup() {
  return renderHook(() => useValidatedForm({ initialValues, rules }));
}

describe('useValidatedForm', () => {
  it('starts with the initial values and no errors', () => {
    const { result } = setup();

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
  });

  it('does not flag an untouched field while the guest types', () => {
    const { result } = setup();

    act(() => result.current.setValue('email', 'ale'));

    expect(result.current.values.email).toBe('ale');
    expect(result.current.errors).toEqual({});
  });

  it('checks a field when it loses focus', () => {
    const { result } = setup();

    act(() => result.current.setValue('email', 'ale'));
    act(() => result.current.blur('email'));

    expect(result.current.errors).toEqual({ email: 'Enter a valid email address' });
  });

  it('re-checks a shown error while typing and clears it once fixed', () => {
    const { result } = setup();

    act(() => result.current.blur('email'));
    act(() => result.current.setValue('email', 'alex@'));

    expect(result.current.errors).toEqual({});
  });

  it('re-checks other fields that show errors when a related field changes', () => {
    const { result } = setup();

    act(() => result.current.setValues({ password: 'longenough1', confirm: 'longenough' }));
    act(() => result.current.blur('confirm'));
    expect(result.current.errors.confirm).toBe('Passwords don’t match');

    act(() => result.current.setValue('password', 'longenough'));

    expect(result.current.errors.confirm).toBeUndefined();
  });

  it('checks every field on submit and lists the invalid ones in rule order', () => {
    const { result } = setup();
    let invalid: (keyof Values)[] = [];

    act(() => result.current.setValue('password', 'longenough1'));
    act(() => {
      invalid = result.current.validateAll();
    });

    expect(invalid).toEqual(['email', 'confirm']);
    expect(result.current.errors).toEqual({
      email: 'Enter a valid email address',
      confirm: 'Passwords don’t match',
    });
  });

  it('shows server errors until their field changes, with client errors taking precedence', () => {
    const { result } = setup();

    act(() =>
      result.current.setServerErrors({
        email: 'An account with this email is locked',
        password: 'Password rejected',
      }),
    );
    expect(result.current.errors).toEqual({
      email: 'An account with this email is locked',
      password: 'Password rejected',
    });

    act(() => result.current.blur('email'));
    expect(result.current.errors.email).toBe('Enter a valid email address');

    act(() => result.current.setValue('password', 'another password'));
    expect(result.current.errors.password).toBeUndefined();
  });

  it('resets values and errors', () => {
    const { result } = setup();

    act(() => {
      result.current.validateAll();
    });
    act(() => result.current.reset({ email: 'alex@example.com', password: '', confirm: '' }));

    expect(result.current.values.email).toBe('alex@example.com');
    expect(result.current.errors).toEqual({});
  });
});
