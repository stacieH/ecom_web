import Link from 'next/link';
import styles from './account.module.css';

const LINKS = [
  { href: '/account', label: 'Profile' },
  { href: '/account/addresses', label: 'Saved addresses' },
  { href: '/account/orders', label: 'Orders' },
];

export default function AccountNav({ current }: { current: string }) {
  return (
    <nav className={styles.nav} aria-label="Account">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={styles.navLink}
          aria-current={link.href === current ? 'page' : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
