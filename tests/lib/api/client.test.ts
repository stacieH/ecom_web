import { ApiError, apiRequest, buildApiUrl } from '@/lib/api/client';
import {
  emptyResponse,
  installFetchMock,
  jsonResponse,
  lastFetchCall,
} from '../../helpers/mockFetch';

describe('buildApiUrl', () => {
  it('joins the base URL, the path, and the defined query values', () => {
    expect(
      buildApiUrl('/ordering/slots', { date: '2026-10-02', fulfilment: 'PICKUP', areaId: undefined }),
    ).toBe('http://api.test/v1/ordering/slots?date=2026-10-02&fulfilment=PICKUP');
  });
});

describe('apiRequest', () => {
  let fetchMock: jest.Mock;
  let restore: () => void;

  beforeEach(() => {
    ({ fetchMock, restore } = installFetchMock());
  });

  afterEach(() => {
    restore();
  });

  it('sends a GET with the client header and without cookies by default', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await expect(apiRequest('/menu')).resolves.toEqual({ ok: true });

    const { url, init } = lastFetchCall(fetchMock);
    expect(url).toBe('http://api.test/v1/menu');
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('omit');
    expect(init.headers).toEqual({ Accept: 'application/json', 'X-Requested-With': 'cinder-web' });
  });

  it('serialises a JSON body, merges headers, and includes cookies when asked', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'o1' }, 201));

    await apiRequest('/orders', {
      method: 'POST',
      body: { lines: [] },
      headers: { 'Idempotency-Key': 'key-1' },
      credentials: 'include',
    });

    const { init } = lastFetchCall(fetchMock);
    expect(init.body).toBe('{"lines":[]}');
    expect(init.credentials).toBe('include');
    expect(init.headers).toEqual({
      Accept: 'application/json',
      'X-Requested-With': 'cinder-web',
      'Idempotency-Key': 'key-1',
      'Content-Type': 'application/json',
    });
  });

  it('resolves undefined for 204 No Content', async () => {
    fetchMock.mockResolvedValue(emptyResponse(204));
    await expect(apiRequest('/customer/session', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('turns an API error body into an ApiError, keeping extra fields', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          statusCode: 409,
          errorCode: 'PRICE_CHANGED',
          message: 'Prices changed',
          quote: { totalCentavos: 200000 },
        },
        409,
      ),
    );

    const error = await apiRequest('/orders', { method: 'POST', body: {} }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      errorCode: 'PRICE_CHANGED',
      message: 'Prices changed',
      fieldErrors: {},
      extras: { quote: { totalCentavos: 200000 } },
    });
  });

  it('reports a response without an error body as UNKNOWN', async () => {
    fetchMock.mockResolvedValue(emptyResponse(502));
    await expect(apiRequest('/menu')).rejects.toMatchObject({ status: 502, errorCode: 'UNKNOWN' });
  });

  it('reports a request that never got a response as NETWORK_ERROR', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(apiRequest('/menu')).rejects.toMatchObject({ status: 0, errorCode: 'NETWORK_ERROR' });
  });

  it('rethrows an aborted request untouched', async () => {
    const abort = Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' });
    fetchMock.mockRejectedValue(abort);
    await expect(apiRequest('/menu')).rejects.toBe(abort);
  });

  it('builds an ApiError directly with defaults for mock clients', () => {
    const error = new ApiError(409, 'SLOT_FULL', 'That time just filled up.');
    expect(error).toMatchObject({ fieldErrors: {}, extras: {}, name: 'ApiError' });
  });
});
