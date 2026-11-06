export const WIDTH = 1000;
export const HEIGHT = 680;
export const SCENES = ['park', 'stage', 'garden', 'blank'] as const;
export type Scene = typeof SCENES[number];
export type Fills = Record<string, string>;
export interface Drawing {
  id: string;
  name: string;
  templateId: string;
  fills: Fills;
  ink: string;
  image: string;
  created: number;
}
export interface Friend {
  id: string;
  artId?: string;
  prop?: 'ball' | 'flower' | 'microphone';
  x: number;
  y: number;
  scale: number;
  flipped: boolean;
}
export interface World {
  id: string;
  name: string;
  scene: Scene;
  background: string;
  friends: Friend[];
}
export interface Draft { templateId: string; fills: Fills; ink: string; backgroundWorldId?: string }
export interface GameState {
  version: 1;
  drawings: Drawing[];
  worlds: World[];
  activeWorldId: string;
  draft?: Draft;
  introSeen: boolean;
  preferences: { voice: boolean; music: boolean; track: number };
}
export const id = () => crypto.randomUUID();
export function newWorld(n = 1): World {
  return { id: id(), name: `My World ${n}`, scene: 'park', background: '', friends: [] };
}
export function initialState(): GameState {
  const world = newWorld();
  return { version: 1, drawings: [], worlds: [world], activeWorldId: world.id, introSeen: false, preferences: { voice: true, music: false, track: 0 } };
}
export function duplicateFriend(friend: Friend): Friend {
  return { ...friend, id: id(), x: Math.min(.88, friend.x + .07), y: Math.min(.83, friend.y + .04) };
}
export function boundedPosition(x: number, y: number) {
  return { x: Math.max(.08, Math.min(.92, x)), y: Math.max(.16, Math.min(.88, y)) };
}
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isText = (v: unknown, max = 100) => typeof v === 'string' && v.length <= max;
const isId = (v: unknown) => typeof v === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(v);
const isPNG = (v: unknown) => v === '' || (typeof v === 'string' && v.length <= 8_000_000 && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(v));
const finite = (v: unknown, lo: number, hi: number) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const validFills = (v: unknown) => isRecord(v) && Object.keys(v).length <= 250 && Object.entries(v).every(([k, color]) => /^[a-zA-Z0-9_-]{1,60}$/.test(k) && typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color));
export function validateBackup(value: unknown): GameState {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.drawings) || !Array.isArray(value.worlds) || !isRecord(value.preferences)) throw new Error('This is not a Drawing Club backup.');
  if (value.drawings.length > 500 || value.worlds.length < 1 || value.worlds.length > 100) throw new Error('This backup is too large.');
  const drawingIds = new Set<string>();
  for (const d of value.drawings) {
    if (!isRecord(d) || !isId(d.id) || drawingIds.has(d.id as string) || !isText(d.name) || !isId(d.templateId) || !validFills(d.fills) || !isPNG(d.ink) || !d.image || !isPNG(d.image) || !finite(d.created, 0, Number.MAX_SAFE_INTEGER)) throw new Error('A drawing in this backup is damaged.');
    drawingIds.add(d.id as string);
  }
  const worldIds = new Set<string>();
  const friendIds = new Set<string>();
  for (const w of value.worlds) {
    if (!isRecord(w) || !isId(w.id) || worldIds.has(w.id as string) || !isText(w.name) || !SCENES.includes(w.scene as Scene) || !isPNG(w.background) || !Array.isArray(w.friends) || w.friends.length > 100) throw new Error('A world in this backup is damaged.');
    worldIds.add(w.id as string);
    for (const f of w.friends) {
      if (!isRecord(f) || !isId(f.id) || friendIds.has(f.id as string) || !finite(f.x, 0, 1) || !finite(f.y, 0, 1) || !finite(f.scale, .3, 2) || typeof f.flipped !== 'boolean' || (f.artId ? !drawingIds.has(f.artId as string) || f.prop !== undefined : !['ball', 'flower', 'microphone'].includes(f.prop as string))) throw new Error('A friend in this backup is damaged.');
      friendIds.add(f.id as string);
    }
  }
  if (!worldIds.has(value.activeWorldId as string) || typeof value.introSeen !== 'boolean' || typeof value.preferences.voice !== 'boolean' || typeof value.preferences.music !== 'boolean' || !Number.isInteger(value.preferences.track) || !finite(value.preferences.track, 0, 2)) throw new Error('Backup settings are damaged.');
  if (value.draft !== undefined) {
    const d = value.draft;
    if (!isRecord(d) || !isId(d.templateId) || !validFills(d.fills) || !isPNG(d.ink) || (d.backgroundWorldId !== undefined && !worldIds.has(d.backgroundWorldId as string))) throw new Error('The unfinished drawing is damaged.');
  }
  return structuredClone(value) as unknown as GameState;
}

export class History<T> {
  private past: T[] = [];
  private future: T[] = [];
  constructor(private current: T, private limit = 35) {}
  push(next: T) { this.past.push(this.current); if (this.past.length > this.limit) this.past.shift(); this.current = next; this.future = []; }
  undo(): T | undefined { if (!this.past.length) return; this.future.push(this.current); return this.current = this.past.pop()!; }
  redo(): T | undefined { if (!this.future.length) return; this.past.push(this.current); return this.current = this.future.pop()!; }
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
}
