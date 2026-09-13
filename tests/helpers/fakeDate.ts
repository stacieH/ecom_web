// Fakes only Date. Timers stay real, so TanStack Query and the mock client's
// promises run as usual while "now" is a fixed service day. Call
// jest.useRealTimers() in afterEach.
const REAL_APIS = [
  'hrtime',
  'nextTick',
  'performance',
  'queueMicrotask',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'requestIdleCallback',
  'cancelIdleCallback',
  'setImmediate',
  'clearImmediate',
  'setInterval',
  'clearInterval',
  'setTimeout',
  'clearTimeout',
] as const;

export function fakeDateAt(now: Date | string): void {
  jest.useFakeTimers({ now: new Date(now), doNotFake: [...REAL_APIS] });
}
