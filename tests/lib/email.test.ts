import { isEmail } from '@/lib/email';

describe('isEmail', () => {
  it.each(['alex@example.com', ' rhea@cinderandsalt.example '])('accepts %p', (value) => {
    expect(isEmail(value)).toBe(true);
  });

  it.each(['', 'alex', 'alex@', 'alex@example', 'alex example@mail.com'])('rejects %p', (value) => {
    expect(isEmail(value)).toBe(false);
  });
});
