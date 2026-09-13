import { fireEvent, screen } from '@testing-library/react';
import AddressBook from '@/components/account/AddressBook';
import type { AddressInput } from '@/lib/ordering/types';
import { registerVerifiedCustomer } from '../../helpers/mockOrdering';
import { createGuestClient, renderGuest } from '../../helpers/renderGuest';

const home: AddressInput = {
  label: 'Home',
  areaId: 'area-poblacion',
  street: '12 Jupiter Street',
  building: '',
  landmark: 'Beside the bakery',
  instructions: '',
};

async function openAddressBook(saved: AddressInput[] = []) {
  const client = createGuestClient();
  await registerVerifiedCustomer(client);
  for (const address of saved) {
    await client.createAddress(address);
  }
  renderGuest(<AddressBook />, { client });
  await screen.findByRole('button', { name: 'Add address' });
  return client;
}

async function fillNewAddress(label: string) {
  fireEvent.change(screen.getByLabelText('Address name'), { target: { value: label } });
  await screen.findByRole('option', { name: 'Poblacion · ₱60 delivery · ₱800 minimum' });
  fireEvent.change(screen.getByLabelText('Delivery area'), { target: { value: 'area-poblacion' } });
  fireEvent.change(screen.getByLabelText('Street address'), { target: { value: '12 Jupiter Street' } });
  fireEvent.change(screen.getByLabelText('Landmark'), { target: { value: 'Beside the bakery' } });
}

describe('AddressBook', () => {
  it('adds an address, checking each field', async () => {
    await openAddressBook();
    expect(screen.getByText('No saved addresses yet.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add address' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save address' }));

    expect(screen.getByText('Please fix the 4 highlighted fields.')).toBeInTheDocument();
    expect(screen.getByText('Give this address a name')).toBeInTheDocument();
    expect(screen.getByText('Choose a delivery area')).toBeInTheDocument();
    expect(screen.getByText('Enter your street address')).toBeInTheDocument();
    expect(screen.getByText('Add a landmark so our rider can find you')).toBeInTheDocument();
    expect(screen.getByLabelText('Address name')).toHaveFocus();

    await fillNewAddress('Home');
    fireEvent.click(screen.getByRole('button', { name: 'Save address' }));

    expect(await screen.findByText('Address saved.')).toBeInTheDocument();
    expect(screen.getByText('12 Jupiter Street, Poblacion')).toBeInTheDocument();
  });

  it('edits a saved address', async () => {
    await openAddressBook([home]);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit Home' }));
    expect(screen.getByRole('heading', { name: 'Edit Home' })).toBeInTheDocument();
    const label = screen.getByLabelText('Address name');
    expect(label).toHaveValue('Home');

    fireEvent.change(label, { target: { value: 'Condo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save address' }));

    expect(await screen.findByText('Address saved.')).toBeInTheDocument();
    expect(screen.getByText('Condo')).toBeInTheDocument();
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
  });

  it('deletes a saved address after confirmation', async () => {
    await openAddressBook([home]);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Home' }));
    expect(screen.getByText('Delete Home?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(screen.queryByText('Delete Home?')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Home' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));

    expect(await screen.findByText('Address deleted.')).toBeInTheDocument();
    expect(await screen.findByText('No saved addresses yet.')).toBeInTheDocument();
  });

  it('explains the five-address limit', async () => {
    await openAddressBook(['Home', 'Office', 'Studio', 'Gym', 'Family'].map((label) => ({ ...home, label })));

    fireEvent.click(screen.getByRole('button', { name: 'Add address' }));
    await fillNewAddress('Sixth');
    fireEvent.click(screen.getByRole('button', { name: 'Save address' }));

    expect(await screen.findByText('You can save up to 5 addresses.')).toBeInTheDocument();
  });
});
