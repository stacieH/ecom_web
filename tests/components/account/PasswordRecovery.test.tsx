import { fireEvent, screen } from '@testing-library/react';
import ForgotPasswordForm from '@/components/account/ForgotPasswordForm';
import ResetPasswordForm from '@/components/account/ResetPasswordForm';
import { DEFAULT_CUSTOMER, registerVerifiedCustomer } from '../../helpers/mockOrdering';
import { visit } from '../../helpers/navigation';
import { createGuestClient, renderGuest } from '../../helpers/renderGuest';

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('password recovery', () => {
  it('gives the same answer to every reset request', async () => {
    const client = createGuestClient();
    renderGuest(<ForgotPasswordForm />, { client });

    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();

    type('Email', 'nobody@example.com');
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByText('If that email has an account, we’ve sent a reset link.')).toBeInTheDocument();
    await expect(client.demo.getOutbox()).resolves.toEqual([]);
  });

  it('sets a new password from the emailed link', async () => {
    const client = createGuestClient();
    await registerVerifiedCustomer(client);
    await client.forgotPassword(DEFAULT_CUSTOMER.email);
    const [email] = await client.demo.getOutbox();
    visit(email.links[0].href);
    renderGuest(<ResetPasswordForm />, { client });

    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }));
    expect(screen.getByText('Please fix the 1 highlighted field.')).toBeInTheDocument();
    expect(screen.getByText('Use at least 10 characters')).toBeInTheDocument();

    type('New password', 'river-stone-new-99');
    const confirm = screen.getByLabelText('Confirm new password');
    fireEvent.change(confirm, { target: { value: 'river-stone-new-9' } });
    fireEvent.blur(confirm);
    expect(screen.getByText('Passwords don’t match')).toBeInTheDocument();

    fireEvent.change(confirm, { target: { value: 'river-stone-new-99' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }));

    expect(await screen.findByText('Password updated. Sign in with your new password.')).toBeInTheDocument();
    await expect(client.signIn(DEFAULT_CUSTOMER.email, 'river-stone-new-99')).resolves.toMatchObject({
      email: DEFAULT_CUSTOMER.email,
    });
  });

  it('explains a used or expired reset link', async () => {
    visit('/account/reset-password#token=not-a-real-token');
    renderGuest(<ResetPasswordForm />);

    type('New password', 'river-stone-new-99');
    type('Confirm new password', 'river-stone-new-99');
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }));

    expect(await screen.findByText('This link has expired or was already used.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Request a new link' })).toHaveAttribute(
      'href',
      '/account/forgot-password',
    );
  });
});
