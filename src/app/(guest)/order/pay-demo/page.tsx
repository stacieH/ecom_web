import type { Metadata } from 'next';
import PayDemo from '@/components/ordering/PayDemo';

export const metadata: Metadata = {
  title: 'Demo payment',
  robots: { index: false, follow: false },
};

export default function PayDemoPage() {
  return <PayDemo />;
}
