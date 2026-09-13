import type { Metadata } from 'next';
import CheckoutPage from '@/components/ordering/CheckoutPage';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

export default function OrderCheckoutPage() {
  return <CheckoutPage />;
}
