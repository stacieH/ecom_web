import { apiBaseUrl } from './config';
import { ApiErrorBody, ApiErrorCode } from './types';

// A custom header turns every cross-origin call into a CORS preflight, which
// the API pairs with its origin allow list as the CSRF defence.
export const CLIENT_HEADER = 'X-Requested-With';
export const CLIENT_HEADER_VALUE = 'cinder-web';

export class ApiError extends Error {
  readonly status: number;
  readonly errorCode: ApiErrorCode;
  readonly fieldErrors: Record<string, string[]>;
  readonly extras: Record<string, unknown>;

  constructor(
    status: number,
    errorCode: ApiErrorCode,
    message: string,
    fieldErrors: Record<string, string[]> = {},
    extras: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.fieldErrors = fieldErrors;
    this.extras = extras;
  }
}

export type QueryValue = string | number | undefined;

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  query?: Record<string, QueryValue>;
  body?: unknown;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
}

export function buildApiUrl(path: string, query: Record<string, QueryValue> = {}): string {
  const url = new URL(`${apiBaseUrl()}${path}`);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';

  if (response.status === 204 || !contentType.includes('application/json')) {
    return undefined;
  }

  return response.json();
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiErrorBody).errorCode === 'string' &&
    typeof (value as ApiErrorBody).message === 'string'
  );
}

function isAbort(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as Error).name === 'AbortError';
}

// Everything else in an error body (for example PRICE_CHANGED's quote) is kept
// on ApiError.extras.
const ERROR_BODY_KEYS = ['statusCode', 'errorCode', 'message', 'fieldErrors'];

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    [CLIENT_HEADER]: CLIENT_HEADER_VALUE,
    ...options.headers,
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;

  try {
    response = await fetch(buildApiUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: options.credentials ?? 'omit',
      signal: options.signal,
    });
  } catch (error) {
    if (isAbort(error)) {
      throw error;
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'We could not reach the Cinder & Salt service.');
  }

  const payload = await readJson(response).catch(() => undefined);

  if (response.ok) {
    return payload as T;
  }

  if (isErrorBody(payload)) {
    const extras = Object.fromEntries(
      Object.entries(payload).filter(([key]) => !ERROR_BODY_KEYS.includes(key)),
    );
    throw new ApiError(
      response.status,
      payload.errorCode,
      payload.message,
      payload.fieldErrors,
      extras,
    );
  }

  throw new ApiError(response.status, 'UNKNOWN', `Request failed with status ${response.status}`);
}
