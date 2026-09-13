import type { Metadata } from 'next';
import AccountShell from '@/components/account/AccountShell';
import CustomerOrder from '@/components/account/CustomerOrder';

export const metadata: Metadata = {
  title: 'Your order',
  robots: { index: false, follow: false },
};

// Next.js 16 passes dynamic route params as a promise.
export default async function AccountOrderPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;

  return (
    <AccountShell title="Your order" wide>
      <CustomerOrder reference={reference} />
    </AccountShell>
  );
}
