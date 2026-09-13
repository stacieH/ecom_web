export interface MockRouter {
  push: jest.Mock;
  replace: jest.Mock;
  back: jest.Mock;
  forward: jest.Mock;
  refresh: jest.Mock;
  prefetch: jest.Mock;
}

/** The shared router mock from jest.setup.js. Clear the methods a test asserts on in beforeEach. */
export function mockRouter(): MockRouter {
  return jest.requireMock<{ mockRouter: MockRouter }>('next/navigation').mockRouter;
}

/** Puts the test at a URL, so components that read the location see it. */
export function visit(url: string): void {
  window.history.replaceState(null, '', url);
}
