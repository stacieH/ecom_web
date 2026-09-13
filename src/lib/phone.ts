const PHONE_CHARACTERS = /^[+\d\s()-]+$/;

/** A tel: link that dials `phone` exactly, whatever spacing it is written with. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** 7 to 15 digits, written with any mix of spaces, brackets, hyphens, and a plus. */
export function isReachablePhone(value: string): boolean {
  const phone = value.trim();
  const digits = phone.replace(/\D/g, '').length;
  return PHONE_CHARACTERS.test(phone) && digits >= 7 && digits <= 15;
}
