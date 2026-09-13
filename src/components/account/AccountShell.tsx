import { ReactNode } from 'react';
import styles from './account.module.css';

export default function AccountShell({
  title,
  intro,
  wide = false,
  children,
}: {
  title: string;
  intro?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={wide ? `${styles.shell} ${styles.wide}` : styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        {intro && <p className={styles.intro}>{intro}</p>}
        <p className={styles.demoNote}>Demo account: stored in this browser only</p>
      </header>
      {children}
    </div>
  );
}
