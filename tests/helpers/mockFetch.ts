// jsdom 20 (Jest 29) has no fetch, Response, or Headers. These builders return
// only the Response surface that src/lib/api/client.ts reads.
export type FetchInit = RequestInit & { headers: Record<string, string> };

export function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-type' ? 'application/json; charset=utf-8' : null,
    },
    json: async () => body,
  } as unknown as Response;
}

export function emptyResponse(status = 204): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => {
      throw new SyntaxError('Unexpected end of JSON input');
    },
  } as unknown as Response;
}

export function installFetchMock() {
  const original = globalThis.fetch;
  const fetchMock = jest.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;

  return {
    fetchMock,
    restore() {
      globalThis.fetch = original;
    },
  };
}

export function lastFetchCall(fetchMock: jest.Mock): { url: string; init: FetchInit } {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return { url: url as string, init: init as FetchInit };
}
