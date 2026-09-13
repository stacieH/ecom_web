import { recallOrderToken, rememberOrderToken } from '@/lib/ordering/orderTokens';

describe('order tokens', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it('remembers a tracking token per order reference for this tab', () => {
    rememberOrderToken('O-7K2M9Q', 'token-abc');

    expect(recallOrderToken('O-7K2M9Q')).toBe('token-abc');
    expect(window.sessionStorage.getItem('cs-order-token:O-7K2M9Q')).toBe('token-abc');
    expect(recallOrderToken('O-OTHER1')).toBeNull();
  });

  it('treats blocked storage as having no token', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => rememberOrderToken('O-7K2M9Q', 'token-abc')).not.toThrow();
    expect(recallOrderToken('O-7K2M9Q')).toBeNull();
  });
});
