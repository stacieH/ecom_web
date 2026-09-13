'use client';
import { FormEvent, useState } from 'react';
import { CheckboxField, focusFirstInvalid, FormAlert, TextField } from '@/components/forms/fields';
import formStyles from '@/components/forms/form.module.css';
import { ApiError } from '@/lib/api/client';
import { useValidatedForm } from '@/lib/forms/useValidatedForm';
import { useOrderingClient } from '@/lib/ordering/clientContext';
import {
  accountErrorMessage,
  deleteConfirmRule,
  deletePasswordRule,
} from '@/lib/ordering/validation/accountRules';
import { ACCOUNT_FIELD_ERRORS, mapFieldErrors } from '@/lib/ordering/validation/serverErrors';
import styles from './account.module.css';

interface DeleteValues {
  password: string;
  confirm: boolean;
}

export default function DeleteAccountSection({ onDeleted }: { onDeleted: () => void }) {
  const client = useOrderingClient();
  const [deleting, setDeleting] = useState(false);
  const [formAlert, setFormAlert] = useState<string | null>(null);

  const form = useValidatedForm<DeleteValues>({
    initialValues: { password: '', confirm: false },
    rules: {
      password: (value) => deletePasswordRule(value),
      confirm: (value) => deleteConfirmRule(value),
    },
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormAlert(null);

    const invalid = form.validateAll();
    if (invalid.length > 0) {
      focusFirstInvalid(invalid.map((name) => `delete-${name}`));
      return;
    }

    setDeleting(true);
    try {
      await client.deleteAccount(form.values.password);
      onDeleted();
    } catch (error) {
      if (error instanceof ApiError && error.errorCode === 'VALIDATION_FAILED') {
        form.setServerErrors(mapFieldErrors(error.fieldErrors, ACCOUNT_FIELD_ERRORS));
        focusFirstInvalid(['delete-password']);
      } else {
        setFormAlert(accountErrorMessage(error));
      }
      setDeleting(false);
    }
  };

  return (
    <section className={styles.section} aria-labelledby="delete-account-title">
      <h2 id="delete-account-title" className={styles.sectionTitle}>
        Delete account
      </h2>
      <p className={styles.meta}>
        This removes your profile and saved addresses. Orders you’ve placed stay on record for the restaurant.
      </p>
      <form className={formStyles.form} noValidate onSubmit={submit}>
        <FormAlert message={formAlert} />
        <TextField
          id="delete-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={form.values.password}
          error={form.errors.password}
          onChange={(value) => form.setValue('password', value)}
          onBlur={() => form.blur('password')}
        />
        <CheckboxField
          id="delete-confirm"
          label="I understand this can’t be undone"
          checked={form.values.confirm}
          error={form.errors.confirm}
          onChange={(checked) => form.setValue('confirm', checked)}
          onBlur={() => form.blur('confirm')}
        />
        <div className={formStyles.actions}>
          <button type="submit" className={formStyles.secondary} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete account'}
          </button>
        </div>
      </form>
    </section>
  );
}
