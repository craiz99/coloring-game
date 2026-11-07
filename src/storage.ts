import { initialState, validateBackup, type GameState } from './model';
let database: Promise<IDBDatabase> | undefined;
function open(): Promise<IDBDatabase> {
  return database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('little-purple-drawing-club', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('game');
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => { db.close(); database = undefined; }; resolve(db); };
    request.onerror = () => { database = undefined; reject(request.error); };
    request.onblocked = () => { database = undefined; reject(new Error('Close other Drawing Club tabs and try again.')); };
  }).catch(error => { database = undefined; throw error; });
}
export async function loadState(): Promise<GameState> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const request = db.transaction('game').objectStore('game').get('state');
    request.onsuccess = () => { try { resolve(request.result === undefined ? initialState() : validateBackup(request.result)); } catch (e) { reject(e); } };
    request.onerror = () => reject(request.error);
  });
}
export async function saveState(state: GameState): Promise<void> {
  const db = await open();
  const snapshot = structuredClone(state);
  return new Promise((resolve, reject) => {
    const tx = db.transaction('game', 'readwrite');
    tx.objectStore('game').put(snapshot, 'state');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Saving was interrupted.'));
  });
}

/** Autosave must never replace data that this session failed to read. */
export class SaveSession {
  private verified = false;
  constructor(private reader = loadState, private writer = saveState) {}
  get needsRecovery() { return !this.verified; }
  async load() {
    const state = await this.reader();
    this.verified = true;
    return state;
  }
  inspectSaved() { return this.reader(); }
  useSaved(state: GameState) {
    const restored = validateBackup(state);
    this.verified = true;
    return restored;
  }
  async save(state: GameState) {
    if (!this.verified) throw new Error('Saved creations could not be opened. Autosave is paused to protect them.');
    await this.writer(state);
  }
  async replace(state: GameState) {
    const restored = validateBackup(state);
    await this.writer(restored);
    this.verified = true;
  }
}
