
// Account field rules and non-field messages, copied from the "Register and
// passwords", "Sign in and recovery", and "Non-field messages" tables of the 3B spec.
import { ApiError } from '@/lib/api/client';

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export function newPasswordRule(password: string, email: string): string | undefined {
  if (password.length < PASSWORD_MIN_LENGTH) return 'Use at least 10 characters';
  if (password.length > PASSWORD_MAX_LENGTH) return 'Use 128 characters or fewer';

  const normalisedEmail = email.trim().toLowerCase();
  if (normalisedEmail && password.toLowerCase() === normalisedEmail) {
    return 'Your password can’t be your email address';
  }
  return undefined;
}

export function confirmPasswordRule(confirm: string, password: string): string | undefined {
  return confirm === password ? undefined : 'Passwords don’t match';
}

export function signInPasswordRule(value: string): string | undefined {
  return value ? undefined : 'Enter your password';
}

export function currentPasswordRule(value: string): string | undefined {
  return value ? undefined : 'Enter your current password';
}

export function deletePasswordRule(value: string): string | undefined {
  return value ? undefined : 'Enter your password to delete your account';
}

export function deleteConfirmRule(checked: boolean): string | undefined {
  return checked ? undefined : 'Please confirm you understand this can’t be undone';
}

export function accountErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.errorCode) {
      case 'UNAUTHENTICATED':
        return 'Email or password is incorrect.';
      case 'EMAIL_NOT_VERIFIED':
        return 'Please verify your email first.';
      case 'ACCOUNT_LOCKED':
        return 'Too many attempts. Try again in 15 minutes or reset your password.';
      case 'INVALID_OR_EXPIRED_TOKEN':
        return 'This link has expired or was already used.';
      case 'RATE_LIMITED':
        return 'Too many attempts. Please wait a minute and try again.';
      case 'VALIDATION_FAILED':
        return error.message;
      default:
        break;
    }
  }
  return 'Something went wrong. Please try again.';
}
