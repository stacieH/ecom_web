import type { Metadata } from 'next';
import AccountOverview from '@/components/account/AccountOverview';
import AccountShell from '@/components/account/AccountShell';

export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <AccountShell title="Your account" wide>
      <AccountOverview />
    </AccountShell>
  );
}
