import type { Metadata } from 'next';
import OrderMenu from '@/components/ordering/OrderMenu';

export const metadata: Metadata = {
  title: 'Order online',
  description: 'Order Cinder & Salt for pickup in Poblacion or delivery to nearby areas.',
};

export default function OrderPage() {
  return <OrderMenu />;
}
