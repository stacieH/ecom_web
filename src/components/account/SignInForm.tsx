'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { focusFirstInvalid, FormAlert, TextField } from '@/components/forms/fields';
import formStyles from '@/components/forms/form.module.css';
import { ApiError } from '@/lib/api/client';
import { useValidatedForm } from '@/lib/forms/useValidatedForm';
import { fixFieldsMessage } from '@/lib/ordering/checkoutErrors';
import { useOrderingClient } from '@/lib/ordering/clientContext';
import { useLocationSearch } from '@/lib/ordering/fragment';
import { safeNextPath } from '@/lib/ordering/nextPath';
import { isDisposableCustomerQuery, orderingKeys } from '@/lib/ordering/queryKeys';
import { accountErrorMessage, signInPasswordRule } from '@/lib/ordering/validation/accountRules';
import { emailRule } from '@/lib/ordering/validation/rules';

interface SignInValues {
  email: string;
  password: string;
}

export default function SignInForm() {
  const client = useOrderingClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const search = useLocationSearch();
  const [submitting, setSubmitting] = useState(false);
  const [formAlert, setFormAlert] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [resent, setResent] = useState(false);

  const form = useValidatedForm<SignInValues>({
    initialValues: { email: '', password: '' },
    rules: {
      email: (value) => emailRule(value),
      password: (value) => signInPasswordRule(value),
    },
  });
  const { values, errors } = form;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormAlert(null);
    setUnverified(false);
    setResent(false);

    const invalid = form.validateAll();
    if (invalid.length > 0) {
      setFormAlert(fixFieldsMessage(invalid.length));
      focusFirstInvalid(invalid.map((name) => `sign-in-${name}`));
      return;
    }

    setSubmitting(true);
    try {
      const customer = await client.signIn(values.email, values.password);
      queryClient.removeQueries({ queryKey: ['customer'], predicate: isDisposableCustomerQuery });
      queryClient.setQueryData(orderingKeys.session, customer);
      router.push(safeNextPath(new URLSearchParams(search ?? '').get('next')));
    } catch (error) {
      setUnverified(error instanceof ApiError && error.errorCode === 'EMAIL_NOT_VERIFIED');
      setFormAlert(accountErrorMessage(error));
      setSubmitting(false);
    }
  };

  const resend = async () => {
    try {
      await client.resendVerification(values.email);
    } catch {
      // The answer is the same either way, so an account's state never leaks.
    }
    setResent(true);
  };

  return (
    <form className={formStyles.form} noValidate onSubmit={submit}>
      <FormAlert message={formAlert} />
      {unverified && (
        <div className={formStyles.actions}>
          <button type="button" className={formStyles.secondary} onClick={() => void resend()}>
            Send the link again
          </button>
        </div>
      )}
      {resent && (
        <p className={formStyles.status} role="status">
          If that account still needs verifying, we’ve sent a new link.
        </p>
      )}

      <TextField
        id="sign-in-email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={values.email}
        error={errors.email}
        onChange={(value) => form.setValue('email', value)}
        onBlur={() => form.blur('email')}
      />
      <TextField
        id="sign-in-password"
        label="Password"
        type="password"
        autoComplete="current-password"
        value={values.password}
        error={errors.password}
        onChange={(value) => form.setValue('password', value)}
        onBlur={() => form.blur('password')}
      />
      <Link className={formStyles.link} href="/account/forgot-password">
        Forgot password?
      </Link>

      <div className={formStyles.actions}>
        <button type="submit" className={formStyles.primary} disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
        <Link className={formStyles.link} href="/account/register">
          Create an account
        </Link>
      </div>
    </form>
  );
}
