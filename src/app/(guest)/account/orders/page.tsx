import type { Metadata } from 'next';
import AccountShell from '@/components/account/AccountShell';
import OrderHistory from '@/components/account/OrderHistory';

export const metadata: Metadata = {
  title: 'Your orders',
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
  return (
    <AccountShell title="Your orders" wide>
      <OrderHistory />
    </AccountShell>
  );
}
