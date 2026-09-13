import type { Metadata } from 'next';
import PaymentConfirming from '@/components/ordering/PaymentConfirming';

export const metadata: Metadata = {
  title: 'Confirming payment',
  robots: { index: false, follow: false },
};

export default function PaidPage() {
  return <PaymentConfirming />;
}
