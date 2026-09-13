import type { Metadata } from 'next';
import AccountShell from '@/components/account/AccountShell';
import AddressBook from '@/components/account/AddressBook';

export const metadata: Metadata = {
  title: 'Saved addresses',
  robots: { index: false, follow: false },
};

export default function AddressesPage() {
  return (
    <AccountShell title="Saved addresses" wide>
      <AddressBook />
    </AccountShell>
  );
}
