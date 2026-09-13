import { formatPeso } from '@/lib/money';

describe('formatPeso', () => {
  it.each([
    [0, '₱0'],
    [50, '₱0.50'],
    [48000, '₱480'],
    [198000, '₱1,980'],
    [100050, '₱1,000.50'],
    [123456789, '₱1,234,567.89'],
    [-6000, '-₱60'],
  ])('formats %i centavos as %s', (centavos, expected) => {
    expect(formatPeso(centavos)).toBe(expected);
  });
});
