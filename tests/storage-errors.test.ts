import { afterEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { initialState } from '../src/model';

afterEach(() => vi.unstubAllGlobals());
describe('unavailable browser storage', () => {
  it('reports denied IndexedDB and can recover after access is restored', async () => {
    vi.resetModules();
    const { loadState, saveState } = await import('../src/storage');
    const factory = indexedDB;
    vi.stubGlobal('indexedDB', { open() { throw new DOMException('Storage denied', 'SecurityError'); } });
    await expect(loadState()).rejects.toThrow('Storage denied');
    vi.stubGlobal('indexedDB', factory);
    const state = initialState();
    await saveState(state);
    expect(await loadState()).toEqual(state);
  });
  it('propagates save failures instead of reporting that data was saved', async () => {
    vi.resetModules();
    const { saveState } = await import('../src/storage');
    vi.stubGlobal('indexedDB', { open() { throw new DOMException('Storage full', 'QuotaExceededError'); } });
    await expect(saveState(initialState())).rejects.toThrow('Storage full');
  });
});
