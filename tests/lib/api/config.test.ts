import { apiBaseUrl } from '@/lib/api/config';

describe('apiBaseUrl', () => {
  const original = process.env.NEXT_PUBLIC_API_BASE_URL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = original;
    }
  });

  it('reads the configured base URL without a trailing slash', () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.cinderandsalt.example/v1/';
    expect(apiBaseUrl()).toBe('https://api.cinderandsalt.example/v1');
  });

  it('fails loudly when the base URL is missing', () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    expect(() => apiBaseUrl()).toThrow('NEXT_PUBLIC_API_BASE_URL is not set');
  });
});
