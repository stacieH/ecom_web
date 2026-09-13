import { safeNextPath } from '@/lib/ordering/nextPath';

describe('safeNextPath', () => {
  it('returns to ordering and account pages', () => {
    expect(safeNextPath('/order/checkout')).toBe('/order/checkout');
    expect(safeNextPath('/order')).toBe('/order');
    expect(safeNextPath('/account/orders?page=2')).toBe('/account/orders?page=2');
  });

  it('sends anything else to the account page', () => {
    [null, '', '/', 'https://example.com/order', '//example.com/order', '/ordering', '/account/sign-in?next=%2Faccount'].forEach(
      (next) => {
        expect(safeNextPath(next)).toBe('/account');
      },
    );
  });
});
