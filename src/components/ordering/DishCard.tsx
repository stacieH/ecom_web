import formStyles from '@/components/forms/form.module.css';
import { formatPeso } from '@/lib/money';
import type { MenuDish } from '@/lib/ordering/types';
import styles from './ordering.module.css';

export default function DishCard({
  dish,
  ordersOpen,
  onAdd,
}: {
  dish: MenuDish;
  ordersOpen: boolean;
  onAdd: () => void;
}) {
  let badge: string | null = null;
  if (!dish.orderable) {
    badge = 'Order in person';
  } else if (dish.soldOut) {
    badge = 'Sold out';
  }

  const headingId = `dish-${dish.slug}`;

  return (
    <article className={styles.dish} aria-labelledby={headingId}>
      <div>
        <h3 id={headingId} className={styles.dishName}>
          {dish.name}
        </h3>
        <p className={styles.dishDescription}>{dish.description}</p>
      </div>
      <div className={styles.dishAside}>
        <span className={styles.price}>{formatPeso(dish.priceCentavos)}</span>
        {badge && <span className={styles.badge}>{badge}</span>}
        <button
          type="button"
          className={formStyles.secondary}
          aria-label={`Add ${dish.name}`}
          disabled={!ordersOpen || badge !== null}
          onClick={onAdd}
        >
          Add
        </button>
      </div>
    </article>
  );
}
