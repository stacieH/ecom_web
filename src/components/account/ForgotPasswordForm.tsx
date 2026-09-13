'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { focusFirstInvalid, FormAlert, TextField } from '@/components/forms/fields';
import formStyles from '@/components/forms/form.module.css';
import { useValidatedForm } from '@/lib/forms/useValidatedForm';
import { useOrderingClient } from '@/lib/ordering/clientContext';
import { accountErrorMessage } from '@/lib/ordering/validation/accountRules';
import { emailRule } from '@/lib/ordering/validation/rules';

export default function ForgotPasswordForm() {
  const client = useOrderingClient();
  const [submitting, setSubmitting] = useState(false);
  const [formAlert, setFormAlert] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const form = useValidatedForm<{ email: string }>({
    initialValues: { email: '' },
    rules: { email: (value) => emailRule(value) },
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormAlert(null);
    if (form.validateAll().length > 0) {
      focusFirstInvalid(['forgot-email']);
      return;
    }

    setSubmitting(true);
    try {
      await client.forgotPassword(form.values.email);
      setSent(true);
    } catch (error) {
      setFormAlert(accountErrorMessage(error));
    }
    setSubmitting(false);
  };

  if (sent) {
    return (
      <div className={formStyles.notice}>
        <p role="status">If that email has an account, we’ve sent a reset link.</p>
        <Link className={formStyles.link} href="/order/demo">
          Open the demo outbox
        </Link>
      </div>
    );
  }

  return (
    <form className={formStyles.form} noValidate onSubmit={submit}>
      <FormAlert message={formAlert} />
      <TextField
        id="forgot-email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={form.values.email}
        error={form.errors.email}
        onChange={(value) => form.setValue('email', value)}
        onBlur={() => form.blur('email')}
      />
      <div className={formStyles.actions}>
        <button type="submit" className={formStyles.primary} disabled={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
        <Link className={formStyles.link} href="/account/sign-in">
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
