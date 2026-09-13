'use client';
import { SelectField, TextAreaField, TextField } from '@/components/forms/fields';
import { areaOptionLabel } from '@/lib/ordering/labels';
import type { DeliveryArea } from '@/lib/ordering/types';

export type AddressField = 'areaId' | 'street' | 'building' | 'landmark' | 'instructions';

export interface AddressFieldsProps {
  idPrefix: string;
  values: Record<AddressField, string>;
  errors: Partial<Record<AddressField, string>>;
  areas: DeliveryArea[] | undefined;
  onChange: (name: AddressField, value: string) => void;
  onBlur: (name: AddressField) => void;
}

/** The delivery address fields shared by checkout and the address book. */
export default function AddressFields({ idPrefix, values, errors, areas, onChange, onBlur }: AddressFieldsProps) {
  return (
    <>
      <div data-field="areaId">
        <SelectField
          id={`${idPrefix}-areaId`}
          label="Delivery area"
          placeholder="Choose an area"
          value={values.areaId}
          error={errors.areaId}
          options={(areas ?? []).map((area) => ({ value: area.id, label: areaOptionLabel(area) }))}
          onChange={(value) => onChange('areaId', value)}
          onBlur={() => onBlur('areaId')}
        />
      </div>
      <div data-field="street">
        <TextField
          id={`${idPrefix}-street`}
          label="Street address"
          autoComplete="address-line1"
          value={values.street}
          error={errors.street}
          onChange={(value) => onChange('street', value)}
          onBlur={() => onBlur('street')}
        />
      </div>
      <div data-field="building">
        <TextField
          id={`${idPrefix}-building`}
          label="Building, floor, or unit"
          optional
          autoComplete="address-line2"
          value={values.building}
          error={errors.building}
          onChange={(value) => onChange('building', value)}
          onBlur={() => onBlur('building')}
        />
      </div>
      <div data-field="landmark">
        <TextField
          id={`${idPrefix}-landmark`}
          label="Landmark"
          hint="A shop, gate, or sign near you"
          value={values.landmark}
          error={errors.landmark}
          onChange={(value) => onChange('landmark', value)}
          onBlur={() => onBlur('landmark')}
        />
      </div>
      <div data-field="instructions">
        <TextAreaField
          id={`${idPrefix}-instructions`}
          label="Instructions for the rider"
          optional
          value={values.instructions}
          error={errors.instructions}
          onChange={(value) => onChange('instructions', value)}
          onBlur={() => onBlur('instructions')}
        />
      </div>
    </>
  );
}
