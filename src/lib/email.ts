const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A deliberately loose check: the API and a real inbox are the final word. */
export function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}
