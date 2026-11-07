import { describe, expect, it, vi } from 'vitest';
import { initialState } from '../src/model';
import { SaveSession } from '../src/storage';

describe('protect existing creations after an unsuccessful load', () => {
  it('blocks autosave until existing data has been read successfully', async () => {
    const old = initialState(), current = initialState(), writer = vi.fn();
    const reader = vi.fn().mockRejectedValueOnce(new Error('temporarily denied')).mockResolvedValue(old);
    const session = new SaveSession(reader, writer);
    await expect(session.load()).rejects.toThrow('denied');
    await expect(session.save(current)).rejects.toThrow('paused');
    expect(writer).not.toHaveBeenCalled();
    expect(await session.inspectSaved()).toBe(old);
    // Merely detecting old work must not authorize a new session to overwrite it.
    await expect(session.save(current)).rejects.toThrow('paused');
    expect(writer).not.toHaveBeenCalled();
  });
  it('allows autosave after opening the recovered creations', async () => {
    const old = initialState(), writer = vi.fn().mockResolvedValue(undefined);
    const session = new SaveSession(vi.fn().mockRejectedValue(new Error('denied')), writer);
    const recovered = session.useSaved(old);
    recovered.worlds[0].name = 'Recovered world';
    await session.save(recovered);
    expect(writer).toHaveBeenCalledWith(recovered);
    expect(old.worlds[0].name).toBe('My World 1');
  });
  it('unlocks saving only after an explicit replacement transaction succeeds', async () => {
    const state = initialState();
    const writer = vi.fn().mockRejectedValueOnce(new Error('full')).mockResolvedValue(undefined);
    const session = new SaveSession(vi.fn(), writer);
    await expect(session.replace(state)).rejects.toThrow('full');
    expect(session.needsRecovery).toBe(true);
    await expect(session.save(state)).rejects.toThrow('paused');
    await session.replace(state);
    expect(session.needsRecovery).toBe(false);
    await session.save(state);
    expect(writer).toHaveBeenCalledTimes(3);
  });
  it('does not pass invalid recovery data to storage', async () => {
    const writer = vi.fn(), state = initialState();
    state.activeWorldId = 'missing';
    const session = new SaveSession(vi.fn(), writer);
    expect(() => session.useSaved(state)).toThrow();
    await expect(session.replace(state)).rejects.toThrow();
    expect(writer).not.toHaveBeenCalled();
    expect(session.needsRecovery).toBe(true);
  });
});
