'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { CheckboxField, focusFirstInvalid, FormAlert, TextField } from '@/components/forms/fields';
import formStyles from '@/components/forms/form.module.css';
import { ApiError } from '@/lib/api/client';
import { useValidatedForm } from '@/lib/forms/useValidatedForm';
import { fixFieldsMessage } from '@/lib/ordering/checkoutErrors';
import { useOrderingClient } from '@/lib/ordering/clientContext';
import { accountErrorMessage, confirmPasswordRule, newPasswordRule } from '@/lib/ordering/validation/accountRules';
import { consentRule, emailRule, nameRule, phoneRule } from '@/lib/ordering/validation/rules';
import { ACCOUNT_FIELD_ERRORS, mapFieldErrors } from '@/lib/ordering/validation/serverErrors';
import PrivacyNotice from './PrivacyNotice';

interface RegisterValues {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirm: string;
  consent: boolean;
}

const fieldId = (name: keyof RegisterValues) => `register-${name}`;

export default function RegisterForm() {
  const client = useOrderingClient();
  const [submitting, setSubmitting] = useState(false);
  const [formAlert, setFormAlert] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useValidatedForm<RegisterValues>({
    initialValues: { name: '', email: '', phone: '', password: '', confirm: '', consent: false },
    rules: {
      name: (value) => nameRule(value),
      email: (value) => emailRule(value),
      phone: (value) => phoneRule(value),
      password: (value, values) => newPasswordRule(value, values.email),
      confirm: (value, values) => confirmPasswordRule(value, values.password),
      consent: (value) => consentRule(value),
    },
  });
  const { values, errors } = form;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormAlert(null);

    const invalid = form.validateAll();
    if (invalid.length > 0) {
      setFormAlert(fixFieldsMessage(invalid.length));
      focusFirstInvalid(invalid.map((name) => fieldId(name)));
      return;
    }

    setSubmitting(true);
    try {
      await client.register({
        name: values.name,
        email: values.email,
        phone: values.phone,
        password: values.password,
      });
      setSentTo(values.email.trim());
    } catch (error) {
      if (error instanceof ApiError && error.errorCode === 'VALIDATION_FAILED') {
        const mapped = mapFieldErrors(error.fieldErrors, ACCOUNT_FIELD_ERRORS);
        form.setServerErrors(mapped);
        focusFirstInvalid(Object.keys(mapped).map((name) => fieldId(name as keyof RegisterValues)));
      }
      setFormAlert(accountErrorMessage(error));
      setSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <div className={formStyles.notice}>
        <p role="status">Check your email to verify your account</p>
        <p>{`We sent a verification link to ${sentTo}.`}</p>
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
        id={fieldId('name')}
        label="Name"
        autoComplete="name"
        value={values.name}
        error={errors.name}
        onChange={(value) => form.setValue('name', value)}
        onBlur={() => form.blur('name')}
      />
      <TextField
        id={fieldId('email')}
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
        id={fieldId('phone')}
        label="Phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={values.phone}
        error={errors.phone}
        onChange={(value) => form.setValue('phone', value)}
        onBlur={() => form.blur('phone')}
      />
      <TextField
        id={fieldId('password')}
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="At least 10 characters"
        value={values.password}
        error={errors.password}
        onChange={(value) => form.setValue('password', value)}
        onBlur={() => form.blur('password')}
      />
      <TextField
        id={fieldId('confirm')}
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        value={values.confirm}
        error={errors.confirm}
        onChange={(value) => form.setValue('confirm', value)}
        onBlur={() => form.blur('confirm')}
      />
      <div>
        <CheckboxField
          id={fieldId('consent')}
          label="I agree to the privacy notice"
          checked={values.consent}
          error={errors.consent}
          onChange={(checked) => form.setValue('consent', checked)}
          onBlur={() => form.blur('consent')}
        />
        <PrivacyNotice />
      </div>
      <div className={formStyles.actions}>
        <button type="submit" className={formStyles.primary} disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
        <Link className={formStyles.link} href="/account/sign-in">
          I already have an account
        </Link>
      </div>
    </form>
  );
}
