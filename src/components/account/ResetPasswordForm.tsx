'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { focusFirstInvalid, FormAlert, TextField } from '@/components/forms/fields';
import formStyles from '@/components/forms/form.module.css';
import { ApiError } from '@/lib/api/client';
import { useValidatedForm } from '@/lib/forms/useValidatedForm';
import { fixFieldsMessage } from '@/lib/ordering/checkoutErrors';
import { useOrderingClient } from '@/lib/ordering/clientContext';
import { readFragmentToken, useLocationHash } from '@/lib/ordering/fragment';
import { orderingKeys } from '@/lib/ordering/queryKeys';
import { accountErrorMessage, confirmPasswordRule, newPasswordRule } from '@/lib/ordering/validation/accountRules';
import { ACCOUNT_FIELD_ERRORS, mapFieldErrors } from '@/lib/ordering/validation/serverErrors';

interface ResetValues {
  password: string;
  confirm: string;
}

export default function ResetPasswordForm() {
  const client = useOrderingClient();
  const queryClient = useQueryClient();
  const hash = useLocationHash();
  const [submitting, setSubmitting] = useState(false);
  const [formAlert, setFormAlert] = useState<string | null>(null);
  const [linkExpired, setLinkExpired] = useState(false);
  const [done, setDone] = useState(false);

  const form = useValidatedForm<ResetValues>({
    initialValues: { password: '', confirm: '' },
    rules: {
      // The account email is unknown here; the API checks that rule on submit.
      password: (value) => newPasswordRule(value, ''),
      confirm: (value, values) => confirmPasswordRule(value, values.password),
    },
  });

  const token = hash === null ? null : readFragmentToken(hash);

  if (hash !== null && !token) {
    return (
      <div className={formStyles.notice}>
        <p role="alert">This page needs the link from your reset email.</p>
        <Link className={formStyles.link} href="/account/forgot-password">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className={formStyles.notice}>
        <p role="status">Password updated. Sign in with your new password.</p>
        <div className={formStyles.actions}>
          <Link className={formStyles.primary} href="/account/sign-in">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormAlert(null);
    setLinkExpired(false);

    const invalid = form.validateAll();
    if (invalid.length > 0) {
      setFormAlert(fixFieldsMessage(invalid.length));
      focusFirstInvalid(invalid.map((name) => `reset-${name}`));
      return;
    }
    if (!token) return;

    setSubmitting(true);
    try {
      await client.resetPassword(token, form.values.password);
      queryClient.setQueryData(orderingKeys.session, null);
      setDone(true);
    } catch (error) {
      if (error instanceof ApiError && error.errorCode === 'VALIDATION_FAILED') {
        form.setServerErrors(mapFieldErrors(error.fieldErrors, ACCOUNT_FIELD_ERRORS));
      }
      setLinkExpired(error instanceof ApiError && error.errorCode === 'INVALID_OR_EXPIRED_TOKEN');
      setFormAlert(accountErrorMessage(error));
      setSubmitting(false);
    }
  };

  return (
    <form className={formStyles.form} noValidate onSubmit={submit}>
      <FormAlert message={formAlert} />
      {linkExpired && (
        <Link className={formStyles.link} href="/account/forgot-password">
          Request a new link
        </Link>
      )}
      <TextField
        id="reset-password"
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
        id="reset-confirm"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        value={form.values.confirm}
        error={form.errors.confirm}
        onChange={(value) => form.setValue('confirm', value)}
        onBlur={() => form.blur('confirm')}
      />
      <div className={formStyles.actions}>
        <button type="submit" className={formStyles.primary} disabled={submitting || hash === null}>
          {submitting ? 'Saving…' : 'Save new password'}
        </button>
      </div>
    </form>
  );
}
