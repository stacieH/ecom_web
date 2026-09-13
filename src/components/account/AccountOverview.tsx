'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { FormAlert } from '@/components/forms/fields';
import formStyles from '@/components/forms/form.module.css';
import { useOrderingClient } from '@/lib/ordering/clientContext';
import { orderingKeys } from '@/lib/ordering/queryKeys';
import { accountErrorMessage } from '@/lib/ordering/validation/accountRules';
import AccountNav from './AccountNav';
import ChangePasswordSection from './ChangePasswordSection';
import DeleteAccountSection from './DeleteAccountSection';
import ProfileSection from './ProfileSection';
import RequireCustomer from './RequireCustomer';
import styles from './account.module.css';

export default function AccountOverview() {
  const client = useOrderingClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [leaving, setLeaving] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  // Replacing the page in the same render that clears the session keeps
  // RequireCustomer from sending the visitor to sign in on the way out.
  const leave = (message: string) => {
    setLeaving(message);
    queryClient.removeQueries({ queryKey: orderingKeys.addresses });
    queryClient.removeQueries({ queryKey: orderingKeys.orders });
    queryClient.setQueryData(orderingKeys.session, null);
    router.push('/order');
  };

  const signOut = async () => {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await client.signOut();
      leave('You’re signed out.');
    } catch (error) {
      setSignOutError(accountErrorMessage(error));
      setSigningOut(false);
    }
  };

  if (leaving) {
    return (
      <p className={formStyles.status} role="status">
        {leaving}
      </p>
    );
  }

  return (
    <RequireCustomer>
      {(customer) => (
        <>
          <AccountNav current="/account" />
          <ProfileSection customer={customer} />
          <ChangePasswordSection email={customer.email} />
          <section className={styles.section} aria-labelledby="sign-out-title">
            <h2 id="sign-out-title" className={styles.sectionTitle}>
              Sign out
            </h2>
            <p className={styles.meta}>{`Signed in as ${customer.email}`}</p>
            <FormAlert message={signOutError} />
            <div className={formStyles.actions}>
              <button
                type="button"
                className={formStyles.secondary}
                disabled={signingOut}
                onClick={() => void signOut()}
              >
                Sign out
              </button>
            </div>
          </section>
          <DeleteAccountSection onDeleted={() => leave('Your account has been deleted.')} />
        </>
      )}
    </RequireCustomer>
  );
}
