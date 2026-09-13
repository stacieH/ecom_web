require('@testing-library/jest-dom');

// jsdom implements none of these; components under test rely on all three.
// Individual tests may override window.matchMedia to assert reduced-motion paths.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

if (typeof global.IntersectionObserver !== 'function') {
  global.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
}

if (typeof global.ResizeObserver !== 'function') {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// The API client reads these at call time. Tests never reach a real network.
process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test/v1';
process.env.NEXT_PUBLIC_ORDERING_DATA_SOURCE = 'mock';
