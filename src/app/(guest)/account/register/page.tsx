import type { Metadata } from 'next';
import AccountShell from '@/components/account/AccountShell';
import RegisterForm from '@/components/account/RegisterForm';

export const metadata: Metadata = {
  title: 'Create an account',
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <AccountShell title="Create an account" intro="Keep your details and addresses, and see every order in one place.">
      <RegisterForm />
    </AccountShell>
  );
}
