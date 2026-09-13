import type { Metadata } from 'next';
import OrderTracker from '@/components/ordering/OrderTracker';

export const metadata: Metadata = {
  title: 'Track your order',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function TrackOrderPage() {
  return <OrderTracker />;
}
