'use client';
import { FormEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { focusFirstInvalid, FormAlert, TextField } from '@/components/forms/fields';
import formStyles from '@/components/forms/form.module.css';
import AddressFields, { AddressField } from '@/components/ordering/AddressFields';
import { ApiError } from '@/lib/api/client';
import { useValidatedForm } from '@/lib/forms/useValidatedForm';
import { fixFieldsMessage } from '@/lib/ordering/checkoutErrors';
import { useOrderingClient } from '@/lib/ordering/clientContext';
import { useDeliveryAreas } from '@/lib/ordering/queries';
import { orderingKeys } from '@/lib/ordering/queryKeys';
import type { AddressInput, DeliveryArea, SavedAddress } from '@/lib/ordering/types';
import { accountErrorMessage } from '@/lib/ordering/validation/accountRules';
import {
  addressLabelRule,
  areaRule,
  buildingRule,
  instructionsRule,
  landmarkRule,
  streetRule,
} from '@/lib/ordering/validation/rules';
import { ACCOUNT_FIELD_ERRORS, mapFieldErrors } from '@/lib/ordering/validation/serverErrors';
import AccountNav from './AccountNav';
import RequireCustomer from './RequireCustomer';
import styles from './account.module.css';

const EMPTY_ADDRESS: AddressInput = {
  label: '',
  areaId: '',
  street: '',
  building: '',
  landmark: '',
  instructions: '',
};

function AddressForm({
  address,
  areas,
  onSaved,
  onCancel,
}: {
  address: SavedAddress | null;
  areas: DeliveryArea[] | undefined;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const client = useOrderingClient();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [formAlert, setFormAlert] = useState<string | null>(null);

  const form = useValidatedForm<AddressInput>({
    initialValues: address
      ? {
          label: address.label,
          areaId: address.areaId,
          street: address.street,
          building: address.building,
          landmark: address.landmark,
          instructions: address.instructions,
        }
      : EMPTY_ADDRESS,
    rules: {
      label: addressLabelRule,
      areaId: (value) => areaRule(value, areas ?? null),
      street: streetRule,
      building: buildingRule,
      landmark: landmarkRule,
      instructions: instructionsRule,
    },
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormAlert(null);

    const invalid = form.validateAll();
    if (invalid.length > 0) {
      setFormAlert(fixFieldsMessage(invalid.length));
      focusFirstInvalid(invalid.map((name) => `address-${name}`));
      return;
    }

    setSubmitting(true);
    try {
      if (address) {
        await client.updateAddress(address.id, form.values);
      } else {
        await client.createAddress(form.values);
      }
      await queryClient.invalidateQueries({ queryKey: orderingKeys.addresses });
      onSaved();
    } catch (error) {
      const fieldErrors = error instanceof ApiError ? mapFieldErrors(error.fieldErrors, ACCOUNT_FIELD_ERRORS) : {};
      const count = Object.keys(fieldErrors).length;
      form.setServerErrors(fieldErrors);
      setFormAlert(count > 0 ? fixFieldsMessage(count) : accountErrorMessage(error));
      setSubmitting(false);
    }
  };

  return (
    <form className={formStyles.form} noValidate onSubmit={submit} aria-labelledby="address-form-title">
      <h2 id="address-form-title" className={styles.sectionTitle}>
        {address ? `Edit ${address.label}` : 'Add an address'}
      </h2>
      <FormAlert message={formAlert} />
      <TextField
        id="address-label"
        label="Address name"
        hint="For example, Home or Office"
        value={form.values.label}
        error={form.errors.label}
        onChange={(value) => form.setValue('label', value)}
        onBlur={() => form.blur('label')}
      />
      <AddressFields
        idPrefix="address"
        values={form.values}
        errors={form.errors}
        areas={areas}
        onChange={(name: AddressField, value: string) => form.setValue(name, value)}
        onBlur={(name) => form.blur(name)}
      />
      <div className={formStyles.actions}>
        <button type="submit" className={formStyles.primary} disabled={submitting}>
          {submitting ? 'Saving…' : 'Save address'}
        </button>
        <button type="button" className={formStyles.secondary} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Addresses() {
  const client = useOrderingClient();
  const queryClient = useQueryClient();
  const addresses = useQuery({ queryKey: orderingKeys.addresses, queryFn: () => client.listAddresses() });
  const areas = useDeliveryAreas();
  const [editing, setEditing] = useState<SavedAddress | 'new' | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const areaName = (areaId: string) => areas.data?.find((area) => area.id === areaId)?.name ?? '';

  const remove = async (address: SavedAddress) => {
    setError(null);
    try {
      await client.deleteAddress(address.id);
      setConfirmingDelete(null);
      await queryClient.invalidateQueries({ queryKey: orderingKeys.addresses });
      setMessage('Address deleted.');
    } catch (caught) {
      setError(accountErrorMessage(caught));
    }
  };

  if (addresses.isError) {
    return (
      <p className={formStyles.alert} role="alert">
        We couldn’t load your addresses. Please try again.
      </p>
    );
  }

  if (!addresses.data) {
    return (
      <p className={formStyles.status} role="status">
        Loading your addresses…
      </p>
    );
  }

  return (
    <>
      {message && (
        <p className={formStyles.status} role="status">
          {message}
        </p>
      )}
      <FormAlert message={error} />

      {editing ? (
        <AddressForm
          key={editing === 'new' ? 'new' : editing.id}
          address={editing === 'new' ? null : editing}
          areas={areas.data}
          onSaved={() => {
            setEditing(null);
            setMessage('Address saved.');
          }}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <div className={formStyles.actions}>
          <button
            type="button"
            className={formStyles.primary}
            onClick={() => {
              setMessage(null);
              setEditing('new');
            }}
          >
            Add address
          </button>
        </div>
      )}

      {addresses.data.length === 0 ? (
        <p className={styles.meta}>No saved addresses yet.</p>
      ) : (
        <ul className={styles.list}>
          {addresses.data.map((address) => (
            <li key={address.id} className={styles.card}>
              <p className={styles.cardTitle}>{address.label}</p>
              <p className={styles.meta}>
                {[address.street, address.building, areaName(address.areaId)].filter(Boolean).join(', ')}
              </p>
              <p className={styles.meta}>{`Landmark: ${address.landmark}`}</p>

              {confirmingDelete === address.id ? (
                <div className={formStyles.notice}>
                  <p>{`Delete ${address.label}?`}</p>
                  <div className={formStyles.actions}>
                    <button type="button" className={formStyles.primary} onClick={() => void remove(address)}>
                      Yes, delete
                    </button>
                    <button type="button" className={formStyles.secondary} onClick={() => setConfirmingDelete(null)}>
                      Keep it
                    </button>
                  </div>
                </div>
              ) : (
                <div className={formStyles.actions}>
                  <button
                    type="button"
                    className={formStyles.secondary}
                    aria-label={`Edit ${address.label}`}
                    onClick={() => {
                      setMessage(null);
                      setEditing(address);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={formStyles.secondary}
                    aria-label={`Delete ${address.label}`}
                    onClick={() => {
                      setMessage(null);
                      setConfirmingDelete(address.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function AddressBook() {
  return (
    <RequireCustomer>
      {() => (
        <>
          <AccountNav current="/account/addresses" />
          <Addresses />
        </>
      )}
    </RequireCustomer>
  );
}
