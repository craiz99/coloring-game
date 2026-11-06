import { templateById, templateSVG, svgURL, type Template } from './art';
import { HEIGHT, WIDTH, History, type Draft, type Fills } from './model';
import { alphaBounds, floodFill } from './pixels';

export type Tool = 'fill' | 'brush' | 'eraser';
interface Snapshot { fills: Fills; ink: string }
function surfaceSVG(template: Template, fills: Fills = {}) {
  // Keep the portrait artwork centered inside the full landscape drawing surface.
  return templateSVG(template, fills).replace('viewBox="0 0 300 340"', 'viewBox="0 0 500 340"').replace('<g stroke=', '<g transform="translate(100 0)" stroke=');
}
export const imageFrom = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('This picture could not be opened.')); image.src = url;
});
export function canvas(width: number, height: number) { const c = document.createElement('canvas'); c.width = width; c.height = height; return c; }
export class DrawingEditor {
  readonly ink: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private fills: Fills;
  private history: History<Snapshot>;
  private drawing = false;
  private pointer?: number;
  private ready = false;
  private destroyed = false;
  private operation = 0;
  tool: Tool;
  color = '#a47ae5';
  size = 16;
  readonly width: number;
  readonly height: number;
  constructor(private host: HTMLElement, private draft: Draft, private onChange: (draft: Draft) => void, private onHistory: (undo: boolean, redo: boolean) => void, private notice: (message: string) => void) {
    this.width = draft.backgroundWorldId ? 1000 : WIDTH;
    this.height = draft.backgroundWorldId ? 650 : HEIGHT;
    this.fills = { ...draft.fills };
    this.tool = templateById(draft.templateId) ? 'fill' : 'brush';
    this.history = new History<Snapshot>({ fills: { ...this.fills }, ink: draft.ink });
    host.style.aspectRatio = `${this.width}/${this.height}`;
    host.innerHTML = '<div class="fill-layer"></div><div class="outline-layer" aria-hidden="true"></div>';
    this.ink = canvas(this.width, this.height); this.ink.className = 'ink-layer'; this.ink.setAttribute('aria-label', draft.backgroundWorldId ? 'Background drawing surface' : 'Drawing surface');
    host.insertBefore(this.ink, host.querySelector('.outline-layer'));
    this.ctx = this.ink.getContext('2d', { willReadFrequently: true })!;
    this.renderTemplate();
    host.addEventListener('pointerdown', this.down);
    host.addEventListener('pointermove', this.move);
    host.addEventListener('pointerup', this.up);
    host.addEventListener('pointercancel', this.up);
    host.addEventListener('lostpointercapture', this.up);
    void this.restoreInk(draft.ink).then(() => {
      if (this.destroyed) return;
      this.ready = true; this.onHistory(false, false);
    }).catch(() => {
      if (this.destroyed) return;
      this.ready = true; this.notice('The unfinished brush marks could not be restored.');
    });
  }
  private renderTemplate() {
    const template = templateById(this.draft.templateId);
    this.host.querySelector('.fill-layer')!.innerHTML = template ? surfaceSVG(template, this.fills) : '';
    // Opaque white regions occlude rear outlines; multiply keeps white invisible over ink.
    this.host.querySelector('.outline-layer')!.innerHTML = template ? surfaceSVG(template) : '';
    this.setTool(this.tool);
  }
  setTool(tool: Tool) {
    if (this.destroyed) return;
    if (this.tool !== tool) this.finishStroke();
    this.tool = tool;
    this.ink.style.pointerEvents = tool === 'fill' && !!templateById(this.draft.templateId) ? 'none' : 'auto';
    this.host.dataset.tool = tool;
  }
  private point(event: PointerEvent) {
    const b = this.host.getBoundingClientRect();
    return { x: (event.clientX - b.left) / b.width * this.width, y: (event.clientY - b.top) / b.height * this.height };
  }
  private down = (event: PointerEvent) => {
    if (!this.ready || this.drawing || event.button > 0 || this.destroyed) return;
    event.preventDefault();
    if (this.tool === 'fill') {
      const region = (event.target as Element).closest('[data-region]')?.getAttribute('data-region');
      if (templateById(this.draft.templateId)) {
        if (region && this.fills[region] !== this.color) { this.fills[region] = this.color; this.renderTemplate(); this.commit(); }
      } else {
        const { x, y } = this.point(event), data = this.ctx.getImageData(0, 0, this.width, this.height);
        const color = [1, 3, 5].map(start => parseInt(this.color.slice(start, start + 2), 16)).concat(255);
        if (floodFill(data.data, this.width, this.height, x, y, color, !this.draft.backgroundWorldId)) { this.ctx.putImageData(data, 0, 0); this.commit(); }
        else this.notice('Draw a closed shape, then tap inside it to fill.');
      }
      return;
    }
    this.drawing = true; this.pointer = event.pointerId;
    this.host.setPointerCapture(event.pointerId);
    const { x, y } = this.point(event);
    this.ctx.globalCompositeOperation = this.tool === 'eraser' ? 'destination-out' : 'source-over';
    this.ctx.strokeStyle = this.color; this.ctx.fillStyle = this.color;
    this.ctx.lineWidth = this.size; this.ctx.lineCap = 'round'; this.ctx.lineJoin = 'round';
    this.ctx.beginPath(); this.ctx.arc(x, y, this.size / 2, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.beginPath(); this.ctx.moveTo(x, y);
  };
  private move = (event: PointerEvent) => {
    if (!this.drawing || event.pointerId !== this.pointer) return;
    event.preventDefault();
    const points = event.getCoalescedEvents?.() ?? [event];
    for (const sample of points.length ? points : [event]) { const { x, y } = this.point(sample); this.ctx.lineTo(x, y); this.ctx.stroke(); this.ctx.beginPath(); this.ctx.moveTo(x, y); }
  };
  private up = (event: PointerEvent) => {
    if (!this.drawing || event.pointerId !== this.pointer) return;
    this.finishStroke();
  };
  private finishStroke() {
    if (!this.drawing) return;
    this.drawing = false;
    const pointer = this.pointer; this.pointer = undefined;
    if (pointer !== undefined && this.host.hasPointerCapture(pointer)) this.host.releasePointerCapture(pointer);
    this.ctx.globalCompositeOperation = 'source-over'; this.commit();
  }
  private commit() {
    this.history.push({ fills: { ...this.fills }, ink: this.ink.toDataURL() });
    this.onChange(this.snapshot()); this.onHistory(this.history.canUndo, this.history.canRedo);
  }
  snapshot(): Draft { return { ...this.draft, fills: { ...this.fills }, ink: this.ink.toDataURL() }; }
  async travel(direction: 'undo' | 'redo') {
    if (!this.ready || this.drawing || this.destroyed) return;
    const snap = this.history[direction](); if (!snap) return;
    this.ready = false;
    try {
      await this.restoreInk(snap.ink);
      if (this.destroyed) return;
      this.fills = { ...snap.fills }; this.renderTemplate(); this.onChange(this.snapshot());
    } catch (error) {
      // A damaged image must not advance history while leaving the visible picture unchanged.
      if (!this.destroyed) this.history[direction === 'undo' ? 'redo' : 'undo']();
      throw error;
    } finally {
      if (!this.destroyed) { this.ready = true; this.onHistory(this.history.canUndo, this.history.canRedo); }
    }
  }
  private async restoreInk(url: string) {
    const generation = ++this.operation;
    const image = url ? await imageFrom(url) : undefined;
    if (this.destroyed || generation !== this.operation) return;
    this.ctx.clearRect(0, 0, this.width, this.height);
    if (image) {
      // Preserve unfinished pictures from the original portrait canvas, without stretching.
      if (!this.draft.backgroundWorldId && image.naturalWidth === 600 && image.naturalHeight === 680) this.ctx.drawImage(image, 200, 0);
      else this.ctx.drawImage(image, 0, 0, this.width, this.height);
    }
  }
  async export(crop = true): Promise<string | null> {
    if (!this.ready) throw new Error('Your picture is still opening. Try again in a moment.');
    this.finishStroke();
    this.ready = false;
    try {
    const output = canvas(this.width, this.height), ctx = output.getContext('2d')!;
    const template = templateById(this.draft.templateId);
    if (template) ctx.drawImage(await imageFrom(svgURL(surfaceSVG(template, this.fills))), 0, 0, this.width, this.height);
    ctx.drawImage(this.ink, 0, 0);
    if (template) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(await imageFrom(svgURL(surfaceSVG(template))), 0, 0, this.width, this.height);
      ctx.globalCompositeOperation = 'source-over';
    }
    const bounds = alphaBounds(ctx.getImageData(0, 0, this.width, this.height).data, this.width, this.height);
    if (!bounds) return null;
    if (!crop) return output.toDataURL();
    const cropped = canvas(bounds.width, bounds.height);
    cropped.getContext('2d')!.drawImage(output, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);
    return cropped.toDataURL();
    } finally { this.ready = !this.destroyed; }
  }
  destroy() {
    if (this.destroyed) return;
    this.finishStroke(); this.destroyed = true; this.operation++;
    this.host.removeEventListener('pointerdown', this.down); this.host.removeEventListener('pointermove', this.move); this.host.removeEventListener('pointerup', this.up); this.host.removeEventListener('pointercancel', this.up); this.host.removeEventListener('lostpointercapture', this.up);
  }
}
