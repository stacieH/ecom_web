import { isReachablePhone, telHref } from '@/lib/phone';

describe('telHref', () => {
  it('keeps only the digits and a leading plus', () => {
    expect(telHref('+63 2 8123 4567')).toBe('tel:+63281234567');
    expect(telHref('(02) 8123-4567')).toBe('tel:0281234567');
  });
});

describe('isReachablePhone', () => {
  it.each(['(02) 8123-4567', '+63 2 8123 4567', '09175550142'])('accepts %p', (value) => {
    expect(isReachablePhone(value)).toBe(true);
  });

  it.each(['', '12345', 'call me', '+63 917 555 0142 0000 1'])('rejects %p', (value) => {
    expect(isReachablePhone(value)).toBe(false);
  });
});
