import { act, renderHook } from '@testing-library/react';
import { readFragmentToken, useLocationHash, useLocationSearch } from '@/lib/ordering/fragment';
import { visit } from '../../helpers/navigation';

describe('readFragmentToken', () => {
  it('reads the token from a fragment, with or without #, and ignores blanks', () => {
    expect(readFragmentToken('#token=abc-123')).toBe('abc-123');
    expect(readFragmentToken('token=abc-123')).toBe('abc-123');
    expect(readFragmentToken('#utm=mail&token=abc%2F123')).toBe('abc/123');
    expect(readFragmentToken('#token=%20')).toBeNull();
    expect(readFragmentToken('')).toBeNull();
  });
});

describe('location hooks', () => {
  it('follows the hash as it changes', () => {
    visit('/order/track#token=first');
    const { result } = renderHook(() => useLocationHash());
    expect(result.current).toBe('#token=first');

    act(() => {
      visit('/order/track#token=second');
      window.dispatchEvent(new Event('hashchange'));
    });

    expect(result.current).toBe('#token=second');
  });

  it('reads the query string', () => {
    visit('/order/pay-demo?session=cs-abc');
    const { result } = renderHook(() => useLocationSearch());
    expect(result.current).toBe('?session=cs-abc');
  });
});
