import formStyles from '@/components/forms/form.module.css';
import { venue } from '@/content/venue';

export default function PrivacyNotice() {
  return (
    <details className={formStyles.hint}>
      <summary>Read the privacy notice</summary>
      <p>
        {venue.name} uses your name, email, and phone only to prepare your order, contact you about it, and
        send your receipt. A delivery address goes to the rider for that order only. Demo: everything you enter
        stays in this browser and is never sent anywhere.
      </p>
    </details>
  );
}
