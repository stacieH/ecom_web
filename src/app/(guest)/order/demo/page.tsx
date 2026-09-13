import type { Metadata } from 'next';
import DemoConsole from '@/components/ordering/DemoConsole';

export const metadata: Metadata = {
  title: 'Demo console',
  robots: { index: false, follow: false },
};

export default function DemoConsolePage() {
  return <DemoConsole />;
}
