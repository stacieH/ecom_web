import {
  browserStorage,
  DEMO_STORAGE_KEY,
  DemoStore,
  emptyDemoState,
  StorageLike,
} from '@/lib/ordering/mock/mockStore';

class MemoryStorage implements StorageLike {
  items = new Map<string, string>();
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
}

describe('DemoStore', () => {
  it('starts empty', () => {
    expect(new DemoStore(new MemoryStorage()).read()).toEqual(emptyDemoState());
  });

  it('persists updates, so a new store on the same storage sees them', () => {
    const storage = new MemoryStorage();
    const store = new DemoStore(storage);

    const result = store.update((state) => {
      state.sessionCustomerId = 'cust-1';
      return 'done';
    });

    expect(result).toBe('done');
    expect(JSON.parse(storage.getItem(DEMO_STORAGE_KEY) as string).sessionCustomerId).toBe('cust-1');
    expect(new DemoStore(storage).read().sessionCustomerId).toBe('cust-1');
  });

  it('hands out copies, so changing a read never changes the store', () => {
    const store = new DemoStore(new MemoryStorage());

    store.read().orders.push({} as never);

    expect(store.read().orders).toEqual([]);
  });

  it('discards an update whose change function throws', () => {
    const store = new DemoStore(new MemoryStorage());

    expect(() =>
      store.update((state) => {
        state.sessionCustomerId = 'cust-1';
        throw new Error('validation failed');
      }),
    ).toThrow('validation failed');
    expect(store.read().sessionCustomerId).toBeNull();
  });

  it('works in memory without storage', () => {
    const store = new DemoStore(null);

    store.update((state) => {
      state.sessionCustomerId = 'cust-1';
    });

    expect(store.read().sessionCustomerId).toBe('cust-1');
  });

  it('ignores corrupt data and older versions', () => {
    const corrupt = new MemoryStorage();
    corrupt.setItem(DEMO_STORAGE_KEY, '{not json');
    const old = new MemoryStorage();
    old.setItem(DEMO_STORAGE_KEY, JSON.stringify({ version: 0, orders: [1] }));

    expect(new DemoStore(corrupt).read()).toEqual(emptyDemoState());
    expect(new DemoStore(old).read()).toEqual(emptyDemoState());
  });

  it('keeps working in memory when storage refuses writes', () => {
    const storage = new MemoryStorage();
    storage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    const store = new DemoStore(storage);

    store.update((state) => {
      state.sessionCustomerId = 'cust-1';
    });

    expect(store.read().sessionCustomerId).toBe('cust-1');
  });

  it('resets everything', () => {
    const storage = new MemoryStorage();
    const store = new DemoStore(storage);
    store.update((state) => {
      state.sessionCustomerId = 'cust-1';
    });

    store.reset();

    expect(store.read()).toEqual(emptyDemoState());
    expect(storage.getItem(DEMO_STORAGE_KEY)).toBeNull();
  });
});

describe('browserStorage', () => {
  it('returns localStorage when it works, and null when access throws', () => {
    expect(browserStorage()).toBe(window.localStorage);

    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    try {
      expect(browserStorage()).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });
});
