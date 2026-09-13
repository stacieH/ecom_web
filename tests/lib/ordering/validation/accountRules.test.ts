
import { ApiError } from '@/lib/api/client';
import {
  accountErrorMessage,
  confirmPasswordRule,
  currentPasswordRule,
  deleteConfirmRule,
  deletePasswordRule,
  newPasswordRule,
  signInPasswordRule,
} from '@/lib/ordering/validation/accountRules';

describe('password rules', () => {
  it.each([
    ['short', 'alex@example.com', 'Use at least 10 characters'],
    ['x'.repeat(129), 'alex@example.com', 'Use 128 characters or fewer'],
    ['ALEX@example.com', ' alex@example.com ', 'Your password can’t be your email address'],
    ['copper-lantern-42', 'alex@example.com', undefined],
    ['copper-lantern-42', '', undefined],
  ])('new password %p for %p', (password, email, expected) => {
    expect(newPasswordRule(password, email)).toBe(expected);
  });

  it('needs the confirmation to match', () => {
    expect(confirmPasswordRule('copper-lantern-4', 'copper-lantern-42')).toBe(
      'Passwords don’t match',
    );
    expect(confirmPasswordRule('copper-lantern-42', 'copper-lantern-42')).toBeUndefined();
  });

  it('requires the passwords typed to sign in, change, or delete', () => {
    expect(signInPasswordRule('')).toBe('Enter your password');
    expect(currentPasswordRule('')).toBe('Enter your current password');
    expect(deletePasswordRule('')).toBe('Enter your password to delete your account');
    expect(signInPasswordRule('x')).toBeUndefined();
    expect(currentPasswordRule('x')).toBeUndefined();
    expect(deletePasswordRule('x')).toBeUndefined();
  });

  it('requires the delete confirmation', () => {
    expect(deleteConfirmRule(false)).toBe('Please confirm you understand this can’t be undone');
    expect(deleteConfirmRule(true)).toBeUndefined();
  });
});

describe('accountErrorMessage', () => {
  it.each([
    ['UNAUTHENTICATED', 401, 'Email or password is incorrect.'],
    ['EMAIL_NOT_VERIFIED', 403, 'Please verify your email first.'],
    ['ACCOUNT_LOCKED', 423, 'Too many attempts. Try again in 15 minutes or reset your password.'],
    ['INVALID_OR_EXPIRED_TOKEN', 400, 'This link has expired or was already used.'],
    ['RATE_LIMITED', 429, 'Too many attempts. Please wait a minute and try again.'],
  ] as const)('explains %s', (errorCode, status, expected) => {
    expect(accountErrorMessage(new ApiError(status, errorCode, 'API message'))).toBe(expected);
  });

  it('uses the API message for validation errors without field details', () => {
    expect(
      accountErrorMessage(new ApiError(422, 'VALIDATION_FAILED', 'You can save up to 5 addresses.')),
    ).toBe('You can save up to 5 addresses.');
  });

  it('falls back to a retry message', () => {
    expect(accountErrorMessage(new ApiError(0, 'NETWORK_ERROR', 'Offline'))).toBe(
      'Something went wrong. Please try again.',
    );
    expect(accountErrorMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
  });
});
