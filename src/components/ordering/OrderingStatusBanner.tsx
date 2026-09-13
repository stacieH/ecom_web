import styles from './ordering.module.css';

export default function OrderingStatusBanner({ message }: { message: string }) {
  return (
    <p className={styles.banner} role="status">
      {message}
    </p>
  );
}
