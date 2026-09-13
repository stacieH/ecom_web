'use client';
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import formStyles from '@/components/forms/form.module.css';
import type { Customer } from '@/lib/ordering/types';
import { useCustomerSession } from './CustomerSessionProvider';

export default function RequireCustomer({
  children,
}: {
  children: (customer: Customer) => ReactNode;
}) {
  const { status, customer, retry } = useCustomerSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'signedOut') return;
    const here = `${window.location.pathname}${window.location.search}`;
    router.replace(`/account/sign-in?next=${encodeURIComponent(here)}`);
  }, [status, router]);

  if (status === 'signedIn' && customer) {
    return <>{children(customer)}</>;
  }

  if (status === 'error') {
    return (
      <div className={formStyles.notice}>
        <p role="alert">We couldn’t check your account. Please try again.</p>
        <div className={formStyles.actions}>
          <button type="button" className={formStyles.secondary} onClick={retry}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <p className={formStyles.status} role="status">
      {status === 'signedOut' ? 'Taking you to sign in…' : 'Checking your account…'}
    </p>
  );
}
