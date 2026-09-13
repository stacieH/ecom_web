'use client';
import { FormEvent, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { focusFirstInvalid, FormAlert, TextField } from '@/components/forms/fields';
import formStyles from '@/components/forms/form.module.css';
import { ApiError } from '@/lib/api/client';
import { useValidatedForm } from '@/lib/forms/useValidatedForm';
import { useOrderingClient } from '@/lib/ordering/clientContext';
import { orderingKeys } from '@/lib/ordering/queryKeys';
import type { Customer } from '@/lib/ordering/types';
import { accountErrorMessage } from '@/lib/ordering/validation/accountRules';
import { nameRule, phoneRule } from '@/lib/ordering/validation/rules';
import { ACCOUNT_FIELD_ERRORS, mapFieldErrors } from '@/lib/ordering/validation/serverErrors';
import styles from './account.module.css';

interface ProfileValues {
  name: string;
  phone: string;
}

export default function ProfileSection({ customer }: { customer: Customer }) {
  const client = useOrderingClient();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formAlert, setFormAlert] = useState<string | null>(null);

  const form = useValidatedForm<ProfileValues>({
    initialValues: { name: customer.name, phone: customer.phone },
    rules: {
      name: (value) => nameRule(value),
      phone: (value) => phoneRule(value),
    },
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setFormAlert(null);

    const invalid = form.validateAll();
    if (invalid.length > 0) {
      focusFirstInvalid(invalid.map((name) => `profile-${name}`));
      return;
    }

    setSaving(true);
    try {
      const updated = await client.updateProfile({ name: form.values.name, phone: form.values.phone });
      queryClient.setQueryData(orderingKeys.session, updated);
      form.reset({ name: updated.name, phone: updated.phone });
      setMessage('Profile saved.');
    } catch (error) {
      if (error instanceof ApiError && error.errorCode === 'VALIDATION_FAILED') {
        form.setServerErrors(mapFieldErrors(error.fieldErrors, ACCOUNT_FIELD_ERRORS));
      } else {
        setFormAlert(accountErrorMessage(error));
      }
    }
    setSaving(false);
  };

  return (
    <section className={styles.section} aria-labelledby="profile-title">
      <h2 id="profile-title" className={styles.sectionTitle}>
        Profile
      </h2>
      <form className={formStyles.form} noValidate onSubmit={submit}>
        <FormAlert message={formAlert} />
        {message && (
          <p className={formStyles.status} role="status">
            {message}
          </p>
        )}
        <TextField
          id="profile-name"
          label="Name"
          autoComplete="name"
          value={form.values.name}
          error={form.errors.name}
          onChange={(value) => form.setValue('name', value)}
          onBlur={() => form.blur('name')}
        />
        <TextField
          id="profile-email"
          label="Email"
          type="email"
          hint="Your sign-in email can’t be changed here."
          value={customer.email}
          disabled
          onChange={() => undefined}
        />
        <TextField
          id="profile-phone"
          label="Phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={form.values.phone}
          error={form.errors.phone}
          onChange={(value) => form.setValue('phone', value)}
          onBlur={() => form.blur('phone')}
        />
        <div className={formStyles.actions}>
          <button type="submit" className={formStyles.primary} disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </section>
  );
}
