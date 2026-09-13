import { fireEvent, screen, waitFor } from '@testing-library/react';
import SignInForm from '@/components/account/SignInForm';
import { ApiError } from '@/lib/api/client';
import { orderingKeys } from '@/lib/ordering/queryKeys';
import { DEFAULT_CUSTOMER, registerVerifiedCustomer } from '../../helpers/mockOrdering';
import { mockRouter, visit } from '../../helpers/navigation';
import { createGuestClient, renderGuest } from '../../helpers/renderGuest';

function signInWith(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

async function signedOutCustomer() {
  const client = createGuestClient();
  await registerVerifiedCustomer(client);
  await client.signOut();
  return client;
}

describe('SignInForm', () => {
  beforeEach(() => {
    visit('/account/sign-in');
    mockRouter().push.mockClear();
  });

  it('checks both fields on submit', () => {
    renderGuest(<SignInForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('Please fix the 2 highlighted fields.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveFocus();
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/account/forgot-password');
  });

  it('rejects a wrong password with a single message', async () => {
    const client = await signedOutCustomer();
    renderGuest(<SignInForm />, { client });

    signInWith(DEFAULT_CUSTOMER.email, 'not-the-password');

    expect(await screen.findByText('Email or password is incorrect.')).toBeInTheDocument();
  });

  it('offers to send the verification link again for an unverified account', async () => {
    const client = createGuestClient();
    await client.register(DEFAULT_CUSTOMER);
    renderGuest(<SignInForm />, { client });

    signInWith(DEFAULT_CUSTOMER.email, DEFAULT_CUSTOMER.password);
    expect(await screen.findByText('Please verify your email first.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Send the link again' }));

    expect(
      await screen.findByText('If that account still needs verifying, we’ve sent a new link.'),
    ).toBeInTheDocument();
    const outbox = await client.demo.getOutbox();
    expect(outbox.filter((email) => email.subject === 'Verify your email')).toHaveLength(2);
  });

  it('signs in, stores the session, and returns to a safe next path', async () => {
    const client = await signedOutCustomer();
    visit('/account/sign-in?next=%2Forder%2Fcheckout');
    const { queryClient } = renderGuest(<SignInForm />, { client });

    signInWith(DEFAULT_CUSTOMER.email, DEFAULT_CUSTOMER.password);

    await waitFor(() => expect(mockRouter().push).toHaveBeenCalledWith('/order/checkout'));
    expect(queryClient.getQueryData(orderingKeys.session)).toMatchObject({ email: DEFAULT_CUSTOMER.email });
  });

  it('goes to the account page instead of an outside address', async () => {
    const client = await signedOutCustomer();
    visit('/account/sign-in?next=https%3A%2F%2Fexample.com');
    renderGuest(<SignInForm />, { client });

    signInWith(DEFAULT_CUSTOMER.email, DEFAULT_CUSTOMER.password);

    await waitFor(() => expect(mockRouter().push).toHaveBeenCalledWith('/account'));
  });

  it('explains a locked account', async () => {
    const client = createGuestClient();
    jest.spyOn(client, 'signIn').mockRejectedValueOnce(new ApiError(423, 'ACCOUNT_LOCKED', 'Too many attempts.'));
    renderGuest(<SignInForm />, { client });

    signInWith(DEFAULT_CUSTOMER.email, DEFAULT_CUSTOMER.password);

    expect(
      await screen.findByText('Too many attempts. Try again in 15 minutes or reset your password.'),
    ).toBeInTheDocument();
  });
});
