import { fireEvent, render, screen } from '@testing-library/react';
import AddressFields from '@/components/ordering/AddressFields';
import { MOCK_DELIVERY_AREAS } from '@/lib/ordering/mock/mockData';

describe('AddressFields', () => {
  it('labels each field, marks the optional ones, and reports changes by field name', () => {
    const onChange = jest.fn();
    const onBlur = jest.fn();
    render(
      <AddressFields
        idPrefix="checkout"
        values={{ areaId: '', street: '', building: '', landmark: '', instructions: '' }}
        errors={{ landmark: 'Add a landmark so our rider can find you' }}
        areas={MOCK_DELIVERY_AREAS}
        onChange={onChange}
        onBlur={onBlur}
      />,
    );

    expect(screen.getByLabelText('Delivery area')).toHaveAttribute('id', 'checkout-areaId');
    expect(screen.getByLabelText('Building, floor, or unit (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Instructions for the rider (optional)')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Street address'), { target: { value: '12 Jupiter Street' } });
    expect(onChange).toHaveBeenCalledWith('street', '12 Jupiter Street');

    fireEvent.blur(screen.getByLabelText('Landmark'));
    expect(onBlur).toHaveBeenCalledWith('landmark');
    expect(screen.getByRole('alert')).toHaveTextContent('Add a landmark so our rider can find you');
  });
});
