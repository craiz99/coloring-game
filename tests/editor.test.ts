// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DrawingEditor } from '../src/drawing';

/** Delayed image loading reproduces navigation while Undo is restoring ink. */
class DeferredImage {
  static pending: DeferredImage[] = [];
  onload?: () => void;
  onerror?: () => void;
  naturalWidth = 1000;
  naturalHeight = 680;
  set src(_: string) { DeferredImage.pending.push(this); }
  static finish() { DeferredImage.pending.shift()?.onload?.(); }
}
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };
let host: HTMLDivElement;
let inkVersion: number;
const changed = vi.fn(), history = vi.fn(), notice = vi.fn();
let editor: DrawingEditor | undefined;

beforeEach(() => {
  vi.clearAllMocks(); DeferredImage.pending = []; inkVersion = 0;
  vi.stubGlobal('Image', DeferredImage);
  const context = { clearRect: vi.fn(), drawImage: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), globalCompositeOperation: 'source-over' };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => `data:image/png;base64,${inkVersion}`);
  host = document.createElement('div'); document.body.appendChild(host);
  host.setPointerCapture = vi.fn(); host.releasePointerCapture = vi.fn(); host.hasPointerCapture = () => false;
  host.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 680 }) as DOMRect;
});
afterEach(() => { editor?.destroy(); editor = undefined; document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const makeEditor = (ink = '') => editor = new DrawingEditor(host, { templateId: 'cat', fills: {}, ink }, changed, history, notice);
function fillHead() {
  host.querySelector('[data-region="head"]')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1 }));
}

describe('editor lifecycle and interrupted gestures', () => {
  it('does not initialize callbacks after the editor has been left', async () => {
    const e = makeEditor('old-ink'); e.destroy();
    DeferredImage.finish(); await settle();
    expect(changed).not.toHaveBeenCalled(); expect(history).not.toHaveBeenCalled(); expect(notice).not.toHaveBeenCalled();
  });
  it('does not write an old draft into a new screen when Undo finishes late', async () => {
    const e = makeEditor('old-ink'); DeferredImage.finish(); await settle();
    fillHead(); expect(changed).toHaveBeenCalledTimes(1);
    const restoring = e.travel('undo');
    expect(DeferredImage.pending).toHaveLength(1);
    e.destroy(); changed.mockClear(); history.mockClear();
    DeferredImage.finish(); await restoring;
    expect(changed).not.toHaveBeenCalled(); expect(history).not.toHaveBeenCalled();
    expect(host.querySelector('[data-region="head"]')!.getAttribute('fill')).toBe('#a47ae5');
  });
  it('does not show an obsolete load error after navigation', async () => {
    const e = makeEditor('bad-ink'); e.destroy();
    DeferredImage.pending.shift()!.onerror!(); await settle();
    expect(notice).not.toHaveBeenCalled();
  });
  it('keeps history and the visible fill unchanged when an undo image is damaged', async () => {
    const e = makeEditor('old-ink'); DeferredImage.finish(); await settle();
    fillHead(); changed.mockClear();
    const restoring = e.travel('undo');
    DeferredImage.pending.shift()!.onerror!();
    await expect(restoring).rejects.toThrow('could not be opened');
    expect(changed).not.toHaveBeenCalled();
    expect(host.querySelector('[data-region="head"]')!.getAttribute('fill')).toBe('#a47ae5');
    expect(history).toHaveBeenLastCalledWith(true, false);
  });
  it('commits a partial stroke exactly once when a pointer is cancelled', async () => {
    const e = makeEditor(); await settle(); e.setTool('brush');
    host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 2, clientX: 50, clientY: 50 }));
    inkVersion++;
    host.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 2 }));
    host.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 2 }));
    expect(changed).toHaveBeenCalledTimes(1);
    expect(history).toHaveBeenLastCalledWith(true, false);
  });
  it('finishes an active brush stroke before switching to the eraser', async () => {
    const e = makeEditor(); await settle(); e.setTool('brush');
    host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 2, clientX: 50, clientY: 50 }));
    inkVersion++;
    e.setTool('eraser');
    expect(changed).toHaveBeenCalledTimes(1);
    e.destroy(); e.destroy();
    expect(changed).toHaveBeenCalledTimes(1);
  });
});
