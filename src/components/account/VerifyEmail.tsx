'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import formStyles from '@/components/forms/form.module.css';
import { useOrderingClient } from '@/lib/ordering/clientContext';
import { readFragmentToken, useLocationHash } from '@/lib/ordering/fragment';
import { accountErrorMessage } from '@/lib/ordering/validation/accountRules';

function Verification({ token }: { token: string }) {
  const client = useOrderingClient();
  // A query rather than an effect: it runs once per token, even when React
  // mounts the component twice in development, so the link is never used up.
  const result = useQuery({
    queryKey: ['customer', 'verify-email', token],
    queryFn: async () => {
      await client.verifyEmail(token);
      return true;
    },
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  if (result.isPending) {
    return (
      <p className={formStyles.status} role="status">
        Checking your link…
      </p>
    );
  }

  if (result.isError) {
    return (
      <div className={formStyles.notice}>
        <p role="alert">{accountErrorMessage(result.error)}</p>
        <Link className={formStyles.link} href="/account/sign-in">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className={formStyles.notice}>
      <p role="status">Email verified. You can sign in now.</p>
      <div className={formStyles.actions}>
        <Link className={formStyles.primary} href="/account/sign-in">
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmail() {
  const hash = useLocationHash();

  if (hash === null) {
    return (
      <p className={formStyles.status} role="status">
        Checking your link…
      </p>
    );
  }

  const token = readFragmentToken(hash);
  if (!token) {
    return (
      <p className={formStyles.alert} role="alert">
        This page needs the link from your verification email.
      </p>
    );
  }

  return <Verification key={token} token={token} />;
}
