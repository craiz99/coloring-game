import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { alphaBounds, floodFill } from '../src/pixels';
import { History, duplicateFriend, initialState, validateBackup, type Friend } from '../src/model';
import { templates, templateSVG, sceneSVG } from '../src/art';
import { loadState, saveState } from '../src/storage';

describe('bounded raster fill', () => {
  const closedSquare = () => {
    const pixels = new Uint8ClampedArray(7 * 7 * 4);
    for (let y = 1; y <= 5; y++) for (let x = 1; x <= 5; x++) if (x === 1 || y === 1 || x === 5 || y === 5) pixels.set([30, 20, 40, 255], (y * 7 + x) * 4);
    return pixels;
  };
  it('fills only the enclosed region, preserving outlines and transparent outside', () => {
    const pixels = closedSquare();
    expect(floodFill(pixels, 7, 7, 3, 3, [164, 122, 229, 255])).toBe(true);
    expect([...pixels.slice((3 * 7 + 3) * 4, (3 * 7 + 3) * 4 + 4)]).toEqual([164, 122, 229, 255]);
    expect([...pixels.slice((1 * 7 + 3) * 4, (1 * 7 + 3) * 4 + 4)]).toEqual([30, 20, 40, 255]);
    expect(pixels[3]).toBe(0);
  });
  it('refuses a leaking contour without changing a single pixel', () => {
    const pixels = closedSquare(); pixels.set([0, 0, 0, 0], (1 * 7 + 3) * 4);
    const before = pixels.slice();
    expect(floodFill(pixels, 7, 7, 3, 3, [164, 122, 229, 255])).toBe(false);
    expect(pixels).toEqual(before);
  });
  it('does not flood the transparent outside of a freestyle drawing', () => {
    const pixels = closedSquare();
    expect(floodFill(pixels, 7, 7, 0, 0, [164, 122, 229, 255])).toBe(false);
  });
  it('permits an edge-to-edge background fill', () => {
    const pixels = new Uint8ClampedArray(4 * 4 * 4);
    expect(floodFill(pixels, 4, 4, 0, 0, [164, 122, 229, 255], false)).toBe(true);
    expect([...pixels.slice(-4)]).toEqual([164, 122, 229, 255]);
  });
  it('is a no-op for the same color and rejects outside coordinates', () => {
    const pixels = new Uint8ClampedArray(4 * 4 * 4);
    expect(floodFill(pixels, 4, 4, 1, 1, [0, 0, 0, 0])).toBe(false);
    expect(floodFill(pixels, 4, 4, -1, 1, [0, 0, 0, 255])).toBe(false);
  });
});

describe('transparent cutout bounds', () => {
  it('does not save an empty freestyle image', () => expect(alphaBounds(new Uint8ClampedArray(100), 5, 5)).toBeNull());
  it('crops to visible alpha, with padding clamped to the canvas', () => {
    const pixels = new Uint8ClampedArray(100 * 100 * 4);
    pixels[(20 * 100 + 15) * 4 + 3] = 255; pixels[(60 * 100 + 55) * 4 + 3] = 255;
    expect(alphaBounds(pixels, 100, 100)).toEqual({ x: 7, y: 12, width: 57, height: 57 });
    expect(alphaBounds(pixels, 100, 100, 30)).toEqual({ x: 0, y: 0, width: 86, height: 91 });
  });
});

describe('undo and redo', () => {
  it('restores fill and brush data together and clears redo after a new edit', () => {
    const original = { fills: {}, ink: '' }, filled = { fills: { head: '#a47ae5' }, ink: '' }, brushed = { fills: { head: '#a47ae5' }, ink: 'ink' };
    const history = new History(original);
    history.push(filled); history.push(brushed);
    expect(history.undo()).toEqual(filled);
    expect(history.undo()).toEqual(original);
    expect(history.undo()).toBeUndefined();
    expect(history.redo()).toEqual(filled);
    history.push({ fills: {}, ink: 'new-ink' });
    expect(history.canRedo).toBe(false);
  });
  it('bounds memory while retaining the latest edits', () => {
    const history = new History(0, 2); history.push(1); history.push(2); history.push(3);
    expect(history.undo()).toBe(2); expect(history.undo()).toBe(1); expect(history.undo()).toBeUndefined();
  });
});

describe('independent world instances', () => {
  it('duplicates a drawing reference without sharing transforms', () => {
    const friend: Friend = { id: 'a', artId: 'drawing-1', x: .4, y: .5, scale: 1, flipped: false };
    const copy = duplicateFriend(friend); copy.scale = 1.5; copy.flipped = true;
    expect(copy.artId).toBe(friend.artId); expect(copy.id).not.toBe(friend.id);
    expect(friend).toMatchObject({ x: .4, y: .5, scale: 1, flipped: false });
  });
});

describe('all promised artwork', () => {
  it('includes the complete roster, each with independently fillable regions', () => {
    expect(templates).toHaveLength(18);
    expect(templates.filter(t => t.category === 'kpop').map(t => t.name)).toEqual(['Rumi', 'Mira', 'Zoey', 'Jinu', 'Romance', 'Abs', 'Baby', 'Mystery', 'Derpy Tiger', 'Sussie Bird']);
    expect(new Set(templates.map(t => t.id)).size).toBe(18);
    for (const template of templates) {
      expect(template.regions.length).toBeGreaterThan(4);
      expect(new Set(template.regions.map(r => r.id)).size).toBe(template.regions.length);
      expect(templateSVG(template)).toContain(`aria-label="${template.name} coloring picture"`);
      expect(templateSVG(template)).not.toMatch(/<script|<image|href=|undefined|NaN/);
      expect(templateSVG(template)).not.toContain('#a47ae5');
    }
  });
  it('changes only the selected fill region', () => {
    const svg = templateSVG(templates[0], { head: '#a47ae5' });
    expect(svg.match(/fill="#a47ae5"/g)).toHaveLength(1);
    expect(svg).toContain('fill="#ffffff"');
  });
  it('renders all four scenes without external images', () => {
    for (const scene of ['park', 'stage', 'garden', 'blank'] as const) expect(sceneSVG(scene)).toContain('viewBox="0 0 1000 650"');
  });
});

describe('backup validation and atomic storage', () => {
  it('round-trips drafts, worlds, drawings, backgrounds, and settings through IndexedDB', async () => {
    const state = initialState();
    state.introSeen = true;
    const png = 'data:image/png;base64,AAAA';
    state.drawings.push({ id: 'art', name: 'Rumi', templateId: 'rumi', fills: { hair: '#a47ae5' }, ink: png, image: png, created: 123 });
    state.worlds[0].background = png;
    state.worlds[0].friends.push({ id: 'friend', artId: 'art', x: .3, y: .6, scale: 1.2, flipped: true });
    state.draft = { templateId: 'freestyle', fills: {}, ink: png };
    await saveState(state);
    const restored = await loadState(); expect(restored).toEqual(state);
    restored.worlds[0].friends[0].x = .8;
    expect((await loadState()).worlds[0].friends[0].x).toBe(.3);
    expect(validateBackup(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });
  it('rejects invalid backups rather than silently replacing creations', () => {
    for (const value of [null, {}, { ...initialState(), version: 2 }, { ...initialState(), worlds: [] }, { ...initialState(), activeWorldId: 'missing' }]) expect(() => validateBackup(value)).toThrow();
  });
  it('rejects missing artwork references and unsafe image URLs', () => {
    const state = initialState();
    state.worlds[0].friends.push({ id: 'f', artId: 'missing', x: .5, y: .5, scale: 1, flipped: false });
    expect(() => validateBackup(state)).toThrow();
    state.worlds[0].friends = [];
    state.worlds[0].background = 'https://example.com/tracking.png';
    expect(() => validateBackup(state)).toThrow();
  });
  it('rejects non-finite transforms and duplicate instance IDs', () => {
    const state = initialState();
    state.worlds[0].friends.push({ id: 'f', prop: 'ball', x: NaN, y: .5, scale: 1, flipped: false });
    expect(() => validateBackup(state)).toThrow();
    state.worlds[0].friends[0].x = .5; state.worlds[0].friends.push({ ...state.worlds[0].friends[0] });
    expect(() => validateBackup(state)).toThrow();
  });
  it('returns an independent snapshot for an accepted backup', () => {
    const state = initialState(); const restored = validateBackup(state); restored.worlds[0].name = 'New name'; expect(state.worlds[0].name).toBe('My World 1');
  });
  it('rejects IDs that could become HTML attributes or malformed selectors', () => {
    const state = initialState();
    state.worlds[0].id = 'bad" onclick="alert(1)';
    state.activeWorldId = state.worlds[0].id;
    expect(() => validateBackup(state)).toThrow();
  });
});
