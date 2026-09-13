import { fireEvent, screen, within } from '@testing-library/react';
import AccountOverview from '@/components/account/AccountOverview';
import { DEFAULT_CUSTOMER, registerVerifiedCustomer } from '../../helpers/mockOrdering';
import { mockRouter, visit } from '../../helpers/navigation';
import { createGuestClient, renderGuest } from '../../helpers/renderGuest';

async function openAccount() {
  const client = createGuestClient();
  await registerVerifiedCustomer(client);
  visit('/account');
  renderGuest(<AccountOverview />, { client });
  await screen.findByRole('heading', { level: 2, name: 'Profile' });
  return client;
}

describe('AccountOverview', () => {
  beforeEach(() => {
    mockRouter().push.mockClear();
    mockRouter().replace.mockClear();
  });

  it('links the account pages and saves profile changes, with the email read-only', async () => {
    const client = await openAccount();

    const nav = screen.getByRole('navigation', { name: 'Account' });
    expect(within(nav).getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Profile', '/account'],
      ['Saved addresses', '/account/addresses'],
      ['Orders', '/account/orders'],
    ]);
    expect(within(nav).getByRole('link', { name: 'Profile' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByLabelText('Email')).toBeDisabled();
    expect(screen.getByLabelText('Email')).toHaveValue(DEFAULT_CUSTOMER.email);

    const phone = screen.getByLabelText('Phone');
    fireEvent.change(phone, { target: { value: 'abc' } });
    fireEvent.blur(phone);
    expect(screen.getByText('Enter a phone number we can reach you on')).toBeInTheDocument();

    fireEvent.change(phone, { target: { value: '+63 917 555 0199' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(await screen.findByText('Profile saved.')).toBeInTheDocument();
    await expect(client.getSession()).resolves.toMatchObject({ phone: '+63 917 555 0199' });
  });

  it('changes the password only with the current one', async () => {
    const client = await openAccount();
    const change = () => fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

    change();
    expect(screen.getByText('Enter your current password')).toBeInTheDocument();
    expect(screen.getByText('Use at least 10 characters')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'not-my-password' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'river-stone-new-99' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'river-stone-new-99' } });
    change();
    expect(await screen.findByText('Your current password is incorrect')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: DEFAULT_CUSTOMER.password } });
    change();
    expect(await screen.findByText('Password changed.')).toBeInTheDocument();
    expect(screen.getByLabelText('New password')).toHaveValue('');

    await client.signOut();
    await expect(client.signIn(DEFAULT_CUSTOMER.email, 'river-stone-new-99')).resolves.toBeTruthy();
  });

  it('needs the password and the confirmation to delete, then leaves for the menu', async () => {
    const client = await openAccount();
    const remove = () => fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));

    remove();
    expect(screen.getByText('Enter your password to delete your account')).toBeInTheDocument();
    expect(screen.getByText('Please confirm you understand this can’t be undone')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: DEFAULT_CUSTOMER.password } });
    fireEvent.click(screen.getByLabelText('I understand this can’t be undone'));
    remove();

    expect(await screen.findByText('Your account has been deleted.')).toBeInTheDocument();
    expect(mockRouter().push).toHaveBeenCalledWith('/order');
    expect(mockRouter().replace).not.toHaveBeenCalled();
    await expect(client.getSession()).resolves.toBeNull();
  });

  it('signs out and returns to the menu', async () => {
    const client = await openAccount();

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByText('You’re signed out.')).toBeInTheDocument();
    expect(mockRouter().push).toHaveBeenCalledWith('/order');
    expect(mockRouter().replace).not.toHaveBeenCalled();
    await expect(client.getSession()).resolves.toBeNull();
  });
});
