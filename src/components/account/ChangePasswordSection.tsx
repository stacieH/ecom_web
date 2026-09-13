'use client';
import { FormEvent, useState } from 'react';
import { focusFirstInvalid, FormAlert, TextField } from '@/components/forms/fields';
import formStyles from '@/components/forms/form.module.css';
import { ApiError } from '@/lib/api/client';
import { useValidatedForm } from '@/lib/forms/useValidatedForm';
import { useOrderingClient } from '@/lib/ordering/clientContext';
import {
  accountErrorMessage,
  confirmPasswordRule,
  currentPasswordRule,
  newPasswordRule,
} from '@/lib/ordering/validation/accountRules';
import { ACCOUNT_FIELD_ERRORS, mapFieldErrors } from '@/lib/ordering/validation/serverErrors';
import styles from './account.module.css';

interface PasswordValues {
  currentPassword: string;
  password: string;
  confirm: string;
}

const EMPTY: PasswordValues = { currentPassword: '', password: '', confirm: '' };

export default function ChangePasswordSection({ email }: { email: string }) {
  const client = useOrderingClient();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formAlert, setFormAlert] = useState<string | null>(null);

  const form = useValidatedForm<PasswordValues>({
    initialValues: EMPTY,
    rules: {
      currentPassword: (value) => currentPasswordRule(value),
      password: (value) => newPasswordRule(value, email),
      confirm: (value, values) => confirmPasswordRule(value, values.password),
    },
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setFormAlert(null);

    const invalid = form.validateAll();
    if (invalid.length > 0) {
      focusFirstInvalid(invalid.map((name) => `change-${name}`));
      return;
    }

    setSaving(true);
    try {
      await client.changePassword(form.values.currentPassword, form.values.password);
      form.reset(EMPTY);
      setMessage('Password changed.');
    } catch (error) {
      if (error instanceof ApiError && error.errorCode === 'VALIDATION_FAILED') {
        const mapped = mapFieldErrors(error.fieldErrors, ACCOUNT_FIELD_ERRORS);
        form.setServerErrors(mapped);
        focusFirstInvalid(Object.keys(mapped).map((name) => `change-${name}`));
      } else {
        setFormAlert(accountErrorMessage(error));
      }
    }
    setSaving(false);
  };

  return (
    <section className={styles.section} aria-labelledby="change-password-title">
      <h2 id="change-password-title" className={styles.sectionTitle}>
        Change password
      </h2>
      <form className={formStyles.form} noValidate onSubmit={submit}>
        <FormAlert message={formAlert} />
        {message && (
          <p className={formStyles.status} role="status">
            {message}
          </p>
        )}
        <TextField
          id="change-currentPassword"
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={form.values.currentPassword}
          error={form.errors.currentPassword}
          onChange={(value) => form.setValue('currentPassword', value)}
          onBlur={() => form.blur('currentPassword')}
        />
        <TextField
          id="change-password"
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 10 characters"
          value={form.values.password}
          error={form.errors.password}
          onChange={(value) => form.setValue('password', value)}
          onBlur={() => form.blur('password')}
        />
        <TextField
          id="change-confirm"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={form.values.confirm}
          error={form.errors.confirm}
          onChange={(value) => form.setValue('confirm', value)}
          onBlur={() => form.blur('confirm')}
        />
        <div className={formStyles.actions}>
          <button type="submit" className={formStyles.secondary} disabled={saving}>
            {saving ? 'Changing…' : 'Change password'}
          </button>
        </div>
      </form>
    </section>
  );
}
