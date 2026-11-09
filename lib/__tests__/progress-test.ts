import { createProgressStore } from '../progress';

function memoryStorage(initial: string | null = null) {
  const box = { raw: initial };
  return {
    box,
    load: jest.fn(async () => box.raw),
    save: jest.fn(async (r: string) => {
      box.raw = r;
    }),
  };
}

it('starts empty and returns the same EMPTY array for unknown sections', async () => {
  const store = createProgressStore(memoryStorage());
  await store.hydrate();
  expect(store.getRevealed('kitchen')).toEqual([]);
  expect(store.getRevealed('kitchen')).toBe(store.getRevealed('beach'));
});

it('reveal adds an id, notifies once, and saves JSON under the data shape', async () => {
  const s = memoryStorage();
  const store = createProgressStore(s);
  await store.hydrate();
  const listener = jest.fn();
  store.subscribe(listener);
  store.reveal('kitchen', 'fork');
  expect(store.getRevealed('kitchen')).toEqual(['fork']);
  expect(listener).toHaveBeenCalledTimes(1);
  expect(JSON.parse(s.box.raw!)).toEqual({ kitchen: ['fork'] });
});

it('a second reveal of the same id is a no-op', async () => {
  const s = memoryStorage();
  const store = createProgressStore(s);
  await store.hydrate();
  store.reveal('kitchen', 'fork');
  const before = store.getRevealed('kitchen');
  const saves = s.save.mock.calls.length;
  const listener = jest.fn();
  store.subscribe(listener);
  store.reveal('kitchen', 'fork');
  expect(store.getRevealed('kitchen')).toBe(before);
  expect(listener).not.toHaveBeenCalled();
  expect(s.save.mock.calls.length).toBe(saves);
});

it('keeps array references stable per section until that section changes', async () => {
  const store = createProgressStore(memoryStorage());
  await store.hydrate();
  store.reveal('kitchen', 'fork');
  store.reveal('beach', 'sand');
  const k = store.getRevealed('kitchen');
  store.reveal('beach', 'wave');
  expect(store.getRevealed('kitchen')).toBe(k);
});

it('resetSection removes the key, notifies and saves; no-op when absent', async () => {
  const s = memoryStorage();
  const store = createProgressStore(s);
  await store.hydrate();
  store.reveal('kitchen', 'fork');
  const listener = jest.fn();
  store.subscribe(listener);
  store.resetSection('kitchen');
  expect(store.getRevealed('kitchen')).toEqual([]);
  expect(listener).toHaveBeenCalledTimes(1);
  expect(JSON.parse(s.box.raw!)).toEqual({});
  store.resetSection('kitchen');
  expect(listener).toHaveBeenCalledTimes(1);
});

it('hydrate reads back what was saved', async () => {
  const store = createProgressStore(memoryStorage('{"kitchen":["fork","spoon"]}'));
  await store.hydrate();
  expect(store.getRevealed('kitchen')).toEqual(['fork', 'spoon']);
});

it.each(['not json', '[]', '"x"', 'null', '{"kitchen":"fork"}', '{"kitchen":[1,2]}'])(
  'treats %s as empty',
  async (raw) => {
    const store = createProgressStore(memoryStorage(raw));
    await store.hydrate();
    expect(store.getRevealed('kitchen')).toEqual([]);
  },
);

it('survives a failing load and a failing save', async () => {
  const store = createProgressStore({
    load: async () => {
      throw new Error('x');
    },
    save: async () => {
      throw new Error('y');
    },
  });
  await expect(store.hydrate()).resolves.toBeUndefined();
  expect(() => store.reveal('kitchen', 'fork')).not.toThrow();
  await Promise.resolve();
  expect(store.getRevealed('kitchen')).toEqual(['fork']);
});

it('unsubscribe stops notifications', async () => {
  const store = createProgressStore(memoryStorage());
  await store.hydrate();
  const listener = jest.fn();
  const off = store.subscribe(listener);
  off();
  store.reveal('kitchen', 'fork');
  expect(listener).not.toHaveBeenCalled();
});
