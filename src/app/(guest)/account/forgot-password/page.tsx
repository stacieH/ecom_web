import type { Metadata } from 'next';
import AccountShell from '@/components/account/AccountShell';
import ForgotPasswordForm from '@/components/account/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Reset your password',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AccountShell title="Reset your password" intro="Enter your account email and we’ll send you a reset link.">
      <ForgotPasswordForm />
    </AccountShell>
  );
}
