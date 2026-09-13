import { fireEvent, screen } from '@testing-library/react';
import RegisterForm from '@/components/account/RegisterForm';
import { ApiError } from '@/lib/api/client';
import { DEFAULT_CUSTOMER } from '../../helpers/mockOrdering';
import { createGuestClient, renderGuest } from '../../helpers/renderGuest';

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillRegistration() {
  type('Name', DEFAULT_CUSTOMER.name);
  type('Email', DEFAULT_CUSTOMER.email);
  type('Phone', DEFAULT_CUSTOMER.phone);
  type('Password', DEFAULT_CUSTOMER.password);
  type('Confirm password', DEFAULT_CUSTOMER.password);
  fireEvent.click(screen.getByLabelText('I agree to the privacy notice'));
}

describe('RegisterForm', () => {
  it('stays quiet while typing, checks on blur, and keeps the confirmation in step with the password', () => {
    renderGuest(<RegisterForm />);
    const password = screen.getByLabelText('Password');

    fireEvent.change(password, { target: { value: 'short' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.blur(password);
    expect(screen.getByText('Use at least 10 characters')).toBeInTheDocument();

    fireEvent.change(password, { target: { value: 'copper-lantern-42' } });
    expect(screen.queryByText('Use at least 10 characters')).not.toBeInTheDocument();

    const confirm = screen.getByLabelText('Confirm password');
    fireEvent.change(confirm, { target: { value: 'copper-lantern-4' } });
    fireEvent.blur(confirm);
    expect(screen.getByText('Passwords don’t match')).toBeInTheDocument();

    fireEvent.change(password, { target: { value: 'copper-lantern-4' } });
    expect(screen.queryByText('Passwords don’t match')).not.toBeInTheDocument();
  });

  it('checks every field on submit and focuses the first problem', () => {
    renderGuest(<RegisterForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Please fix the 5 highlighted fields.')).toBeInTheDocument();
    expect(screen.getByText('Please tell us your name')).toBeInTheDocument();
    expect(screen.getByText('Please agree to the privacy notice')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveFocus();
  });

  it('creates the account and points to the demo outbox for the link', async () => {
    const client = createGuestClient();
    renderGuest(<RegisterForm />, { client });

    fillRegistration();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Check your email to verify your account')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the demo outbox' })).toHaveAttribute('href', '/order/demo');
    const [email] = await client.demo.getOutbox();
    expect(email.subject).toBe('Verify your email');
  });

  it('shows server field errors on their fields', async () => {
    const client = createGuestClient();
    jest
      .spyOn(client, 'register')
      .mockRejectedValueOnce(
        new ApiError(422, 'VALIDATION_FAILED', 'Please check the highlighted fields.', {
          password: ['Choose a less common password'],
        }),
      );
    renderGuest(<RegisterForm />, { client });

    fillRegistration();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Choose a less common password')).toBeInTheDocument();
    expect(screen.getByText('Please check the highlighted fields.')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveFocus();
  });
});
