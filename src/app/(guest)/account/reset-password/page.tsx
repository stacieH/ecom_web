import type { Metadata } from 'next';
import AccountShell from '@/components/account/AccountShell';
import ResetPasswordForm from '@/components/account/ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Choose a new password',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function ResetPasswordPage() {
  return (
    <AccountShell title="Choose a new password">
      <ResetPasswordForm />
    </AccountShell>
  );
}
