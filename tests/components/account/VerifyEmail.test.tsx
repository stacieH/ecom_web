import { screen } from '@testing-library/react';
import VerifyEmail from '@/components/account/VerifyEmail';
import { DEFAULT_CUSTOMER } from '../../helpers/mockOrdering';
import { visit } from '../../helpers/navigation';
import { createGuestClient, renderGuest } from '../../helpers/renderGuest';

describe('VerifyEmail', () => {
  it('confirms the emailed link and offers sign in', async () => {
    const client = createGuestClient();
    await client.register(DEFAULT_CUSTOMER);
    const [email] = await client.demo.getOutbox();
    visit(email.links[0].href);

    renderGuest(<VerifyEmail />, { client });

    expect(await screen.findByText('Email verified. You can sign in now.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/account/sign-in');
    await expect(client.signIn(DEFAULT_CUSTOMER.email, DEFAULT_CUSTOMER.password)).resolves.toMatchObject({
      emailVerified: true,
    });
  });

  it('explains an expired or used link and offers a new one', async () => {
    visit('/account/verify-email#token=not-a-real-token');

    renderGuest(<VerifyEmail />);

    expect(await screen.findByRole('alert')).toHaveTextContent('This link has expired or was already used.');
    expect(screen.getByRole('link', { name: 'Request a new link' })).toHaveAttribute('href', '/account/sign-in');
  });

  it('asks for the link when the page has no token', async () => {
    visit('/account/verify-email');

    renderGuest(<VerifyEmail />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This page needs the link from your verification email.',
    );
  });
});
