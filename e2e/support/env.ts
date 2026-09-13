export const E2E_PORT = 3100;
export const E2E_SITE_ORIGIN = `http://localhost:${E2E_PORT}`;
// A host that never resolves: every request to it must be answered by a mock.
export const E2E_API_ORIGIN = 'http://api.e2e.test';
export const E2E_API_BASE_URL = `${E2E_API_ORIGIN}/v1`;
