import type { Metadata } from 'next';
import AccountShell from '@/components/account/AccountShell';
import VerifyEmail from '@/components/account/VerifyEmail';

export const metadata: Metadata = {
  title: 'Verify your email',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function VerifyEmailPage() {
  return (
    <AccountShell title="Verify your email">
      <VerifyEmail />
    </AccountShell>
  );
}
