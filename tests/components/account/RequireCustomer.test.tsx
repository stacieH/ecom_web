import { fireEvent, screen } from '@testing-library/react';
import RequireCustomer from '@/components/account/RequireCustomer';
import { ApiError } from '@/lib/api/client';
import { registerVerifiedCustomer } from '../../helpers/mockOrdering';
import { mockRouter, visit } from '../../helpers/navigation';
import { createGuestClient, renderGuest } from '../../helpers/renderGuest';

describe('RequireCustomer', () => {
  beforeEach(() => {
    mockRouter().replace.mockClear();
  });

  it('checks the session first, then renders for the signed-in customer', async () => {
    const client = createGuestClient();
    await registerVerifiedCustomer(client);

    renderGuest(<RequireCustomer>{(customer) => <p>{`Hello ${customer.name}`}</p>}</RequireCustomer>, {
      client,
    });

    expect(screen.getByRole('status')).toHaveTextContent('Checking your account…');
    expect(await screen.findByText('Hello Alex Rivera')).toBeInTheDocument();
  });

  it('sends a signed-out visitor to sign in, returning here afterwards', async () => {
    visit('/account/orders?page=2');

    renderGuest(<RequireCustomer>{() => <p>Private</p>}</RequireCustomer>);

    expect(await screen.findByText('Taking you to sign in…')).toBeInTheDocument();
    expect(mockRouter().replace).toHaveBeenCalledWith(
      '/account/sign-in?next=%2Faccount%2Forders%3Fpage%3D2',
    );
    expect(screen.queryByText('Private')).not.toBeInTheDocument();
  });

  it('offers a retry when the session check fails', async () => {
    const client = createGuestClient();
    jest.spyOn(client, 'getSession').mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Offline'));

    renderGuest(<RequireCustomer>{() => <p>Private</p>}</RequireCustomer>, { client });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We couldn’t check your account. Please try again.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Taking you to sign in…')).toBeInTheDocument();
  });
});
