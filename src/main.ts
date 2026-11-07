import './style.css';
import { templates, templateById, templateSVG, svgURL, sceneSVG, propSVG } from './art';
import { GameAudio, TRACK_NAMES } from './audio';
import { DrawingEditor, canvas, imageFrom, type Tool } from './drawing';
import { icon } from './icons';
import { initialState, id, newWorld, duplicateFriend, validateBackup, type Drawing, type Draft, type Friend, type GameState, type Scene, type World } from './model';
import { SaveSession } from './storage';

const app = document.querySelector<HTMLDivElement>('#app')!;
const palette = [['Purple', '#a47ae5'], ['Violet', '#7243c6'], ['Lilac', '#d6b8f2'], ['Pink', '#f398b9'], ['Red', '#e56e70'], ['Orange', '#efa466'], ['Yellow', '#f2ce67'], ['Green', '#8bc795'], ['Blue', '#80b4e6'], ['Brown', '#ae8266'], ['Black', '#44394c'], ['White', '#ffffff']];
const sceneNames: Record<Scene, string> = { park: 'Animal park', stage: 'Concert stage', garden: 'Block garden', blank: 'Blank canvas' };
const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const button = (action: string, label: string, image = '', cls = 'soft-button', extra = '') => `<button type="button" class="${cls}" data-action="${action}" ${extra}>${image ? icon(image) : ''}<span>${label}</span></button>`;
let state: GameState;
let route: 'home' | 'pick' | 'draw' | 'world' | 'creations' | 'intro' = 'home';
let category = 'animals';
let editor: DrawingEditor | undefined;
let selected = '';
let color = palette[0][1];
let brushSize = 16;
let tool: Tool = 'fill';
let busy = false;
let introStep = -1;
let introReturn: 'home' | 'world' | 'draw' = 'home';
let introTimer: ReturnType<typeof setTimeout> | undefined;
let toastTimer: ReturnType<typeof setTimeout>;
let modalCallback: (() => void | Promise<void>) | undefined;
let saveQueue = Promise.resolve();
let revision = 0;
let storageFailed = false;
let savedStatus = 'Saved on this device';
const storageSession = new SaveSession();
let recoveredState: GameState | undefined;
let heardTools = new Set<string>();
const audio = new GameAudio(toast);

function world(): World { return state.worlds.find(w => w.id === state.activeWorldId) ?? state.worlds[0]; }
function toast(text: string) {
  const el = document.querySelector<HTMLElement>('#toast');
  if (!el) return;
  el.textContent = text; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 5500);
}
function setStatus(text: string, failed = false) {
  savedStatus = text;
  const el = document.querySelector<HTMLElement>('#save-status');
  if (el) { el.textContent = text; el.classList.toggle('save-error', failed); }
  document.querySelector<HTMLElement>('#storage-warning')?.toggleAttribute('hidden', !failed);
}
function persist() {
  if (storageSession.needsRecovery) {
    storageFailed = true;
    setStatus('Saving paused to protect unopened creations — ask a grown-up', true);
    return Promise.resolve();
  }
  const snapshot = structuredClone(state), currentRevision = ++revision;
  setStatus('Saving your imagination…', storageFailed);
  saveQueue = saveQueue.catch(() => {}).then(() => storageSession.save(snapshot)).then(() => {
    storageFailed = false;
    if (currentRevision === revision) setStatus('Saved on this device');
  }).catch(() => {
    storageFailed = true;
    setStatus(storageSession.needsRecovery ? 'Saving paused to protect unopened creations — ask a grown-up' : 'Could not save — export a backup', true);
  });
  return saveQueue;
}
function heading(title: string, subtitle: string, action = '') {
  return `<div class="screen-heading"><div><h1 id="screen-title">${title}</h1><p>${subtitle}</p></div>${action}</div>`;
}
function modal(title: string, contents: string, callback?: () => void | Promise<void>) {
  const dialog = document.querySelector<HTMLDialogElement>('#dialog')!;
  modalCallback = callback;
  dialog.innerHTML = `<div class="dialog-heading"><h2 id="dialog-title">${title}</h2>${button('close-dialog', 'Close', 'close', 'icon-button')}</div>${contents}`;
  dialog.showModal();
}
function closeModal() { document.querySelector<HTMLDialogElement>('#dialog')?.close(); modalCallback = undefined; }
function confirmAction(title: string, text: string, label: string, callback: () => void | Promise<void>) {
  modal(title, `<p>${text}</p><div class="dialog-actions">${button('close-dialog', 'Keep it', '', 'soft-button')}${button('confirm', label, '', 'primary')}</div>`, callback);
}
function syncAudio() { audio.settings(state.preferences.voice, state.preferences.music, state.preferences.track); }
function helpText() {
  if (route === 'draw') return state.draft?.backgroundWorldId ? 'Paint your background. Your friends stay safe on their own layer. Tap Done when you are ready.' : 'Choose a color, then tap inside your picture. Use Brush to draw and Eraser to rub out brush marks. Tap Let’s play to bring your picture to life!';
  if (route === 'world') return 'Tap Add friend to bring in a drawing. Drag a friend around. Tap Jump or Dance to play! Choose Scene to visit somewhere new.';
  if (route === 'pick') return 'Choose a friend to color. Every picture starts without colors. You can make them any color you like!';
  return 'Pick a friend, add some color, then bring them to life in My World. You can draw anything in Freestyle!';
}

function render() {
  editor?.destroy(); editor = undefined;
  clearTimeout(introTimer);
  audio.stopSpeech();
  document.title = `${route === 'draw' ? 'Color & Draw' : route === 'world' ? 'My World' : 'Little Purple Drawing Club'} · Drawing Game Fun`;
  app.innerHTML = `<div class="game-shell"><header class="game-header"><button type="button" class="brand" data-action="home" aria-label="Drawing Club Home"><span class="brand-mark" aria-hidden="true">✿</span><span>little purple<br><strong>drawing club</strong></span></button><div class="header-actions">${button('help', 'Help', 'help')}${button('voice', `Voice ${state.preferences.voice ? 'on' : 'off'}`, 'voice', 'soft-button', `aria-pressed="${state.preferences.voice}"`)}${button('music', `Music ${state.preferences.music ? 'on' : 'off'}`, 'music', 'soft-button', `aria-pressed="${state.preferences.music}"`)}</div></header><div id="storage-warning" class="storage-warning" role="alert" ${storageFailed ? '' : 'hidden'}>Saving needs a grown-up’s help. Keep this tab open, export this session’s backup, then use Save again to check saved creations. ${button('parents', 'Backup & settings', 'download')}</div><main id="main" aria-labelledby="screen-title">${route === 'home' ? homeScreen() : route === 'pick' ? pickerScreen() : route === 'draw' ? drawingScreen() : route === 'world' ? worldScreen() : route === 'creations' ? creationsScreen() : introScreen()}</main><footer><span aria-hidden="true">✿</span><span>A little color. A whole lot of imagination.</span><span id="save-status" role="status" class="${storageFailed ? 'save-error' : ''}">${escape(savedStatus)}</span>${button('parents', 'For grown-ups', 'settings', 'footer-button')}</footer></div><div id="toast" role="status" hidden></div><dialog id="dialog" aria-labelledby="dialog-title"></dialog>`;
  document.querySelector('#screen-title')?.setAttribute('tabindex', '-1');
  if (route === 'draw') mountEditor();
  if (route === 'world') mountWorld();
  if (route === 'intro' && introStep >= 0) animateIntro();
}
function navigate(next: typeof route, speak = true) {
  audio.stopSpeech(); route = next; render();
  document.querySelector<HTMLElement>('#screen-title')?.focus({ preventScroll: true });
  if (speak && next !== 'intro') audio.speak(helpText());
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function homeScreen() {
  return `<div class="home-heading"><div><span class="eyebrow">YOUR IMAGINATION LIVES HERE</span><h1 id="screen-title">What shall we make today?</h1><p>Pick a friend. Add some color. Bring them to life!</p></div><span class="welcome-flower" aria-hidden="true">✿</span></div>${state.draft ? `<div class="resume-strip"><span>Your ${state.draft.backgroundWorldId ? 'background' : escape(templateById(state.draft.templateId)?.name ?? 'freestyle drawing')} is waiting for you.</span>${button('resume', 'Keep coloring', 'brush')}</div>` : ''}<div class="collection-grid"><button class="collection" data-category="animals"><span class="collection-art animals"><img src="${import.meta.env.BASE_URL}art/animals.png" alt="A purple kitten and a panda"/></span><strong>Cute animals</strong><small>6 cuddly friends to color</small></button><button class="collection" data-category="kpop"><span class="collection-art kpop"><img class="rumi-portrait" src="${import.meta.env.BASE_URL}art/rumi.png" alt="Rumi with her purple braid and yellow jacket"/><span class="character-label">Rumi</span></span><strong>K-Pop friends</strong><small>HUNTR/X · Saja Boys · Derpy & Sussie</small></button><button class="collection" data-category="minecraft"><span class="collection-art minecraft"><img src="${import.meta.env.BASE_URL}art/jj-mikey.png" alt="JJ and Mikey waving hello"/></span><strong>JJ & Mikey</strong><small>A blocky little adventure</small></button><button class="collection" data-action="freestyle"><span class="collection-art freestyle-art" aria-hidden="true"><span class="doodle-arc"></span><span class="doodle-line"></span>${icon('brush')}</span><strong>Freestyle</strong><small>Anything you can imagine</small></button><button class="collection" data-action="world"><span class="collection-art mini-world" aria-hidden="true"><img class="mini-scene" src="${svgURL(sceneSVG(world().scene))}" alt=""/><span class="mini-friend">${templateSVG(templates[0], { head: '#bb97e8', body: '#bb97e8' })}</span></span><strong>My World</strong><small>Make a place for your friends</small></button><button class="collection" data-action="creations"><span class="collection-art mini-gallery" aria-hidden="true">${state.drawings.slice(-2).map(d => `<span class="mini-print"><img src="${d.image}" alt=""/></span>`).join('') || `<span class="mini-print">${templateSVG(templates[0], { head: '#f5b8cb', body: '#f5b8cb' })}</span><span class="mini-print">${templateSVG(templates[0], { head: '#bb97e8', body: '#bb97e8' })}</span>`}</span><strong>My Creations</strong><small>All your little masterpieces</small></button></div>`;
}
function pickerScreen() {
  const names: Record<string, string> = { animals: 'Choose a cuddly friend', kpop: 'Choose your K-Pop friend', minecraft: 'A blocky little adventure' };
  const list = templates.filter(t => t.category === category);
  const grid = (items: typeof templates) => `<div class="template-grid">${items.map(t => `<button class="template-card" data-template="${t.id}"><span class="uncolored-picture">${templateSVG(t)}</span><strong>${t.name}</strong></button>`).join('')}</div>`;
  const groups = category === 'kpop' ? [
    { id: 'huntrix', title: 'HUNTR/X', ids: ['rumi', 'mira', 'zoey'] },
    { id: 'saja-boys', title: 'Saja Boys', ids: ['jinu', 'romance', 'abs', 'baby', 'mystery'] },
    { id: 'companions', title: 'Derpy & Sussie', ids: ['derpy', 'sussie'] },
  ] : undefined;
  return `${heading(names[category], 'Pick a picture. What colors will you choose?', button('home', 'Home', 'back'))}${groups ? groups.map(group => `<section class="picture-group" aria-labelledby="group-${group.id}"><h2 id="group-${group.id}">${group.title}</h2>${grid(list.filter(t => group.ids.includes(t.id)))}</section>`).join('') : grid(list)}`;
}
function startDrawing(templateId: string, saved?: Drawing, backgroundWorldId?: string) {
  const begin = () => {
    state.draft = { templateId, fills: saved ? { ...saved.fills } : {}, ink: saved?.ink ?? (backgroundWorldId ? world().background : ''), ...(backgroundWorldId ? { backgroundWorldId } : {}) };
    tool = templateById(templateId) ? 'fill' : 'brush'; persist(); navigate('draw');
  };
  if (state.draft) confirmAction('Start a new picture?', 'Your unfinished picture will be replaced. Tap Keep it to go back and finish it first.', 'Start new picture', begin);
  else begin();
}
function drawingScreen() {
  const draft = state.draft!;
  const background = !!draft.backgroundWorldId;
  const name = background ? 'Your background' : templateById(draft.templateId)?.name ?? 'Freestyle';
  return `${heading(background ? 'Paint your background' : `A little color for ${escape(name)}`, background ? 'Your friends stay safe on their own layer.' : templateById(draft.templateId) ? 'Pick a color, then tap inside your picture.' : 'Draw anything you can imagine. Close shapes to fill them.', button('home', 'Home', 'home'))}<div class="editor-layout ${background ? 'background-editor' : ''}"><aside class="tool-column" aria-label="Art tools"><div class="tools">${[['fill', 'Fill', 'fill'], ['brush', 'Brush', 'brush'], ['eraser', 'Eraser', 'eraser']].map(([key, label, image]) => button(`tool-${key}`, label, image, 'tool-button', `aria-pressed="${tool === key}"`)).join('')}${button('undo', 'Undo', 'undo', 'tool-button', 'disabled')}${button('redo', 'Redo', 'redo', 'tool-button', 'disabled')}</div><div class="brush-sizes" role="group" aria-label="Brush size">${[7, 16, 30].map((size, i) => `<button type="button" data-size="${size}" aria-label="${['Small', 'Medium', 'Large'][i]} brush" aria-pressed="${brushSize === size}"><span style="width:${[6, 11, 17][i]}px;height:${[6, 11, 17][i]}px"></span></button>`).join('')}</div></aside><div class="paper-shell"><span class="paper-label">${escape(name)}</span><div id="drawing-surface" class="drawing-surface" ${background ? `style="background-image:url('${svgURL(sceneSVG(world().scene))}')"` : ''}></div></div></div><div class="palette-row"><div class="palette" role="group" aria-label="Colors">${palette.map(([name, c]) => `<button type="button" class="swatch" style="--swatch:${c}" data-color="${c}" aria-label="${name}" aria-pressed="${color === c}">${color === c ? icon('check') : ''}</button>`).join('')}</div>${button('finish', background ? 'Done!' : 'Let’s play!', 'arrow', 'primary')}</div><p class="tool-hint" id="tool-hint" aria-live="polite">${toolHint()}</p>`;
}
function toolHint() { return tool === 'fill' ? 'Tap inside a shape to give it your color.' : tool === 'brush' ? 'Draw with your finger, a pencil, or your mouse.' : 'Rub out brush marks. Your picture’s outlines stay safe.'; }
function mountEditor() {
  editor = new DrawingEditor(document.querySelector<HTMLElement>('#drawing-surface')!, state.draft!, draft => { state.draft = draft; persist(); }, (undo, redo) => {
    const u = document.querySelector<HTMLButtonElement>('[data-action="undo"]'), r = document.querySelector<HTMLButtonElement>('[data-action="redo"]');
    if (u) u.disabled = !undo; if (r) r.disabled = !redo;
  }, toast);
  editor.setTool(tool); editor.color = color; editor.size = brushSize;
}
async function finishDrawing() {
  if (!editor || busy) return;
  if (!state.draft?.backgroundWorldId && state.drawings.length >= 500) { toast('Your collection has 500 drawings. Export a backup to keep this collection and your unfinished drawing safe.'); return; }
  busy = true;
  const finishButton = document.querySelector<HTMLButtonElement>('[data-action="finish"]')!; finishButton.disabled = true;
  try {
    const draft = editor.snapshot(), background = !!draft.backgroundWorldId;
    const image = await editor.export(!background);
    if (!image && !background) { toast('Add a little drawing first, then we can play!'); return; }
    if (background) {
      const targetWorld = state.worlds.find(w => w.id === draft.backgroundWorldId)!;
      targetWorld.background = image ? draft.ink : ''; state.activeWorldId = targetWorld.id;
    } else {
      const art: Drawing = { id: id(), name: templateById(draft.templateId)?.name ?? `My drawing ${state.drawings.filter(d => d.templateId === 'freestyle').length + 1}`, templateId: draft.templateId, fills: { ...draft.fills }, ink: draft.ink, image: image!, created: Date.now() };
      state.drawings.push(art); addArtwork(art.id, false);
    }
    editor.destroy(); editor = undefined; state.draft = undefined;
    await persist(); selected = world().friends.at(-1)?.id ?? ''; audio.effect('done'); navigate('world');
  } catch (error) { toast(error instanceof Error ? error.message : 'We could not finish that picture. Please try again.'); }
  finally { busy = false; if (finishButton.isConnected) finishButton.disabled = false; }
}
function friendFrame(f: Friend) { return { width: f.prop ? 100 : 180, height: f.prop ? 100 : 220 }; }
function clampFriend(f: Friend) {
  const frame = friendFrame(f), mx = frame.width * f.scale / 2000 + .01, my = frame.height * f.scale / 1300 + .01;
  f.x = Math.max(mx, Math.min(1 - mx, f.x)); f.y = Math.max(my, Math.min(1 - my, f.y));
}
function friendImage(friend: Friend) { return friend.prop ? svgURL(propSVG(friend.prop)) : state.drawings.find(d => d.id === friend.artId)?.image ?? ''; }
function friendName(friend: Friend) { return friend.prop ? ({ ball: 'Ball', flower: 'Flower', microphone: 'Microphone' })[friend.prop] : state.drawings.find(d => d.id === friend.artId)?.name ?? 'Friend'; }
function friendStyle(f: Friend) { return `left:${f.x * 100}%;top:${f.y * 100}%;--friend-scale:${f.scale};--friend-flip:${f.flipped ? -1 : 1}`; }
function friendMarkup(f: Friend) { return `<button type="button" class="friend ${f.prop ? 'prop' : ''} ${selected === f.id ? 'selected' : ''}" data-instance="${f.id}" style="${friendStyle(f)}" aria-label="${escape(friendName(f))}. Drag to move; arrow keys move the selected friend." aria-pressed="${selected === f.id}"><span class="friend-motion"><img src="${friendImage(f)}" alt="" draggable="false"/></span></button>`; }
function worldScreen() {
  const w = world();
  return `${heading(escape(w.name), 'Drag your friends. Make up a story.', button('worlds', 'My worlds', 'image'))}<div id="world-stage" class="world-stage" aria-label="${sceneNames[w.scene]} play scene"><img class="scene-background" src="${svgURL(sceneSVG(w.scene))}" alt="" draggable="false"/>${w.background ? `<img class="painted-background" src="${w.background}" alt="Your painted background" draggable="false"/>` : ''}${w.friends.map(friendMarkup).join('')}${!w.friends.length ? '<div class="world-empty"><span>Every story starts with a friend.</span><p>Tap Add friend to bring your drawings here!</p></div>' : ''}</div><div class="action-row world-actions" role="group" aria-label="Selected friend actions">${[['jump', 'Jump', 'jump'], ['dance', 'Dance', 'music'], ['bigger', 'Bigger', 'bigger'], ['smaller', 'Smaller', 'smaller'], ['flip', 'Flip', 'flip'], ['more', 'More', 'more']].map(([a, label, image]) => button(a, label, image, 'soft-button', !w.friends.some(f => f.id === selected) ? 'disabled' : '')).join('')}</div><div class="world-bottom">${button('add-friend', 'Add friend', 'plus', 'primary')}<div class="action-row">${button('scenes', 'Scene', 'image')}${button('paint-background', 'Paint background', 'brush')}</div></div><p id="selection-hint" class="tool-hint" aria-live="polite">${selected && w.friends.some(f => f.id === selected) ? `${escape(friendName(w.friends.find(f => f.id === selected)!))} is ready to play.` : 'Tap a friend to choose them. Add props from Add friend.'}</p>`;
}
function selectFriend(friend: Friend, bringForward = true) {
  selected = friend.id;
  if (bringForward) { const w = world(); w.friends = [...w.friends.filter(f => f.id !== friend.id), friend]; }
  const stage = document.querySelector('#world-stage')!;
  stage.querySelectorAll<HTMLButtonElement>('[data-instance]').forEach(el => { const chosen = el.dataset.instance === selected; el.classList.toggle('selected', chosen); el.setAttribute('aria-pressed', String(chosen)); if (chosen && bringForward) stage.appendChild(el); });
  document.querySelectorAll<HTMLButtonElement>('.world-actions button').forEach(el => { el.disabled = false; });
  document.querySelector('#selection-hint')!.textContent = `${friendName(friend)} is ready to play.`;
}
function mountWorld() {
  const stage = document.querySelector<HTMLElement>('#world-stage')!;
  let drag: { id: string; pointer: number; startX: number; startY: number; x: number; y: number } | undefined;
  stage.addEventListener('pointerdown', event => {
    const el = (event.target as Element).closest<HTMLElement>('[data-instance]');
    if (!el || drag || event.button > 0) return;
    const f = world().friends.find(f => f.id === el.dataset.instance)!;
    selectFriend(f); el.focus({ preventScroll: true });
    drag = { id: f.id, pointer: event.pointerId, startX: event.clientX, startY: event.clientY, x: f.x, y: f.y };
    stage.setPointerCapture(event.pointerId); event.preventDefault();
  });
  stage.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointer) return;
    const box = stage.getBoundingClientRect(), f = world().friends.find(f => f.id === drag!.id)!;
    f.x = drag.x + (event.clientX - drag.startX) / box.width; f.y = drag.y + (event.clientY - drag.startY) / box.height; clampFriend(f);
    stage.querySelector<HTMLElement>(`[data-instance="${f.id}"]`)!.setAttribute('style', friendStyle(f)); event.preventDefault();
  });
  const stop = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointer) return;
    const previous = drag; drag = undefined;
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    const f = world().friends.find(f => f.id === previous.id);
    if (f?.prop && Math.hypot(event.clientX - previous.startX, event.clientY - previous.startY) < 8) playAction(f, f.prop);
    persist();
  };
  stage.addEventListener('pointerup', stop); stage.addEventListener('pointercancel', stop); stage.addEventListener('lostpointercapture', stop);
  stage.addEventListener('keydown', event => {
    const el = (event.target as Element).closest<HTMLElement>('[data-instance]');
    if (!el) return;
    const f = world().friends.find(f => f.id === el.dataset.instance)!;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault(); selectFriend(f); const step = event.shiftKey ? .05 : .015;
      if (event.key === 'ArrowLeft') f.x -= step; if (event.key === 'ArrowRight') f.x += step; if (event.key === 'ArrowUp') f.y -= step; if (event.key === 'ArrowDown') f.y += step;
      clampFriend(f); el.setAttribute('style', friendStyle(f)); persist();
    }
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectFriend(f); if (f.prop) playAction(f, f.prop); else playAction(f, 'jump'); persist(); }
  });
}
function addArtwork(artId: string, save = true) {
  if (world().friends.length >= 60) { toast('This world is full of friends! Start another world for more stories.'); return; }
  const f: Friend = { id: id(), artId, x: .35 + Math.random() * .3, y: .57, scale: 1, flipped: false };
  world().friends.push(f); selected = f.id;
  if (save) { persist(); closeModal(); navigate('world', false); }
}
function playAction(f: Friend, action: 'jump' | 'dance' | 'ball' | 'flower' | 'microphone') {
  const motion = document.querySelector<HTMLElement>(`[data-instance="${f.id}"] .friend-motion`);
  if (!motion) return;
  motion.className = 'friend-motion'; void motion.offsetWidth;
  motion.classList.add(action === 'ball' ? 'jump' : action === 'microphone' ? 'dance' : action);
  audio.effect(action);
  const text = `${friendName(f)} ${action === 'jump' || action === 'ball' ? 'jumps!' : action === 'flower' ? 'blooms!' : 'dances!'}`;
  document.querySelector('#selection-hint')!.textContent = text;
}
function addFriendDialog() {
  modal('Who shall we play with?', `<p>Add a drawing from My Friends, or a little prop.</p><div class="friend-picker">${state.drawings.map(d => `<button type="button" class="saved-card" data-add-art="${d.id}"><img src="${d.image}" alt=""/><strong>${escape(d.name)}</strong></button>`).join('') || '<p class="empty-note">Your drawings will appear here when you finish coloring.</p>'}</div><div class="prop-picker">${(['ball', 'flower', 'microphone'] as const).map(p => `<button type="button" data-prop="${p}"><img src="${svgURL(propSVG(p))}" alt=""/><span>${p === 'ball' ? 'Ball' : p === 'flower' ? 'Flower' : 'Microphone'}</span></button>`).join('')}</div><div class="dialog-actions">${button('make-friend', 'Make a new friend', 'plus', 'primary')}</div>`);
}
function creationsScreen() {
  return `${heading('My Creations', 'Your little masterpieces, ready for another adventure.', button('home', 'Home', 'home'))}<div class="section-heading"><h2>My Friends</h2>${button('home', 'Make a friend', 'plus')}</div>${state.drawings.length ? `<div class="saved-grid">${state.drawings.map(d => `<button type="button" class="saved-card" data-art="${d.id}"><img src="${d.image}" alt="Your ${escape(d.name)} drawing"/><strong>${escape(d.name)}</strong></button>`).join('')}</div>` : '<div class="empty-state"><span aria-hidden="true">✿</span><h3>Your first masterpiece is waiting to happen.</h3><p>Finish a picture and it will be kept here.</p></div>'}<div class="section-heading"><h2>My Worlds</h2>${button('new-world', 'New world', 'plus')}</div><div class="world-grid">${state.worlds.map(w => `<button type="button" class="world-card" data-world="${w.id}"><span class="world-thumbnail"><img src="${svgURL(sceneSVG(w.scene))}" alt=""/>${w.background ? `<img src="${w.background}" alt=""/>` : ''}${w.friends.slice(0, 15).map(f => `<img class="thumb-friend" src="${friendImage(f)}" style="left:${f.x * 100}%;top:${f.y * 100}%;width:${(f.prop ? 10 : 18) * f.scale}%;transform:translate(-50%,-50%) scaleX(${f.flipped ? -1 : 1})" alt=""/>`).join('')}</span><strong>${escape(w.name)}</strong><small>${w.friends.length} ${w.friends.length === 1 ? 'friend' : 'friends'}</small></button>`).join('')}</div>`;
}
function artDialog(art: Drawing) {
  modal(escape(art.name), `<div class="art-preview"><img src="${art.image}" alt="Your ${escape(art.name)} drawing"/></div><div class="dialog-actions">${button(`add-art-${art.id}`, 'Play with it', 'plus', 'primary')}${button(`recolor-${art.id}`, 'Recolor a copy', 'brush')}${button(`download-art-${art.id}`, 'Download PNG', 'download')}</div>`);
}
function introScreen() {
  const step = Math.max(0, introStep);
  const titles = ['Pick a color. Make it yours!', 'Your picture becomes a friend!', 'Now play together!'];
  const text = ['Tap a color, then tap inside your picture to fill it in.', 'Tap “Let’s play!” to bring your drawing into My World.', 'Drag your friend around. Tap Dance to make them wiggle!'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  return `<div class="intro-wrap"><span class="eyebrow">A LITTLE TOUR OF YOUR DRAWING CLUB</span><h1 id="screen-title">${introStep < 0 ? 'Color it. Keep it. Play with it.' : titles[step]}</h1><p id="intro-instruction">${introStep < 0 ? 'Your imagination is about to come to life.' : text[step]}</p><div class="intro-canvas ${step > 0 ? 'play' : ''}" id="intro-canvas">${step > 0 ? `<img class="intro-scene" src="${svgURL(sceneSVG('park'))}" alt=""/>` : ''}<div id="intro-cat" class="intro-cat ${step === 2 && !reduced ? 'intro-play' : ''}">${templateSVG(templates[0], introStep < 0 ? {} : { head: '#bb97e8', body: '#bb97e8', tail: '#bb97e8', belly: '#e3d0f7', 'ear-left': '#f6bdcd', 'ear-right': '#f6bdcd' })}</div>${introStep === 0 ? '<span class="demo-pointer" aria-hidden="true">●</span>' : ''}${introStep === 1 ? '<span class="demo-play">Let’s play! →</span>' : ''}${introStep === 2 ? '<span class="demo-play">♪ Dance</span>' : ''}</div><div class="steps" aria-label="${introStep < 0 ? 'Tour not started' : `Step ${step + 1} of 3`}">${[0, 1, 2].map(i => `<span class="${i === step ? 'active' : ''}"></span>`).join('')}</div><div class="intro-actions">${button('intro-next', introStep < 0 ? 'Start the little tour' : step === 2 ? 'Let’s make something!' : 'Next', 'arrow', 'primary')}${button('intro-skip', 'Skip for now', '', 'text-button')}</div><p class="intro-note">${reduced ? 'Still pictures are shown because reduced motion is on.' : 'A quick tour. No right or wrong colors.'}</p></div>`;
}
function animateIntro() {
  audio.speak(document.querySelector('#intro-instruction')!.textContent!);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (introStep === 0) {
    const cat = document.querySelector('#intro-cat')!;
    cat.innerHTML = templateSVG(templates[0]);
    introTimer = setTimeout(() => {
      if (route !== 'intro' || introStep !== 0) return;
      cat.innerHTML = templateSVG(templates[0], { head: '#bb97e8', body: '#bb97e8', tail: '#bb97e8', belly: '#e3d0f7', 'ear-left': '#f6bdcd', 'ear-right': '#f6bdcd' });
    }, 900);
  }
}
function startIntro() {
  if (route === 'draw' || route === 'world' || route === 'home') introReturn = route;
  else introReturn = 'home';
  introStep = -1; navigate('intro', false);
}
function parentDialog() {
  modal('For grown-ups', `<p>Creations stay in this browser on this device. Export a backup to keep them safe or move them to another device.</p><div class="parent-actions">${button('backup-export', 'Export backup', 'download')}${button('backup-import', 'Import backup', 'plus')}${button('download-world', 'Download this world as PNG', 'image')}${button('retry-save', 'Save again', 'check')}</div><label class="track-label" for="music-track">Original background music</label><select id="music-track">${TRACK_NAMES.map((name, i) => `<option value="${i}" ${state.preferences.track === i ? 'selected' : ''}>${name}</option>`).join('')}</select><p class="small-note">Music begins after a tap. Voice depends on the English voices available in your browser. No microphone or account is needed.</p><div class="dialog-actions">${button('intro-replay', 'Replay the little tour', 'help')}</div><input id="backup-file" type="file" accept="application/json,.json" hidden/>`);
  document.querySelector('#backup-file')!.addEventListener('change', event => { void importBackup((event.target as HTMLInputElement).files?.[0]); });
  document.querySelector('#music-track')!.addEventListener('change', event => { state.preferences.track = Number((event.target as HTMLSelectElement).value); syncAudio(); persist(); });
}
function hasCreations(game: GameState) {
  return game.drawings.length > 0 || !!game.draft || game.worlds.length > 1 || game.worlds.some(w => w.friends.length > 0 || !!w.background || w.scene !== 'park');
}
async function retrySaving() {
  await saveQueue;
  if (!storageSession.needsRecovery) {
    await persist();
    toast(storageFailed ? 'Still unable to save. Please export a backup.' : 'All your creations are saved.');
    return;
  }
  const saved = await storageSession.inspectSaved();
  if (!hasCreations(saved)) {
    await storageSession.replace(state);
    storageFailed = false; setStatus('Saved on this device');
    toast('Saving is working again. Your creations are safe.');
    return;
  }
  recoveredState = saved;
  modal('Your saved creations are still here', `<p>We found ${saved.drawings.length} drawings and ${saved.worlds.length} worlds already on this device. Your current session has not replaced them. Export this session’s backup before opening the saved creations if you want to keep both.</p><div class="parent-actions">${button('backup-export', 'Export this session’s backup', 'download')}${button('open-recovered', 'Open saved creations', 'image')}${button('replace-recovered', 'Save this session instead', 'check')}</div>`);
}
function recoverExisting() {
  const saved = recoveredState;
  if (!saved) return;
  const openSaved = () => {
    editor?.destroy(); editor = undefined;
    state = storageSession.useSaved(saved); recoveredState = undefined;
    selected = ''; storageFailed = false; setStatus('Saved on this device'); syncAudio(); navigate('home');
    toast('Your saved creations are open.');
  };
  if (hasCreations(state)) confirmAction('Open the saved creations?', 'This session’s new pictures will be replaced. Export this session’s backup first if you want to keep them too.', 'Open saved creations', openSaved);
  else { closeModal(); openSaved(); }
}
function replaceRecovered() {
  if (!recoveredState) return;
  confirmAction('Replace the saved creations?', 'This replaces the drawings already saved on this device with this session. Open the saved creations and export their backup first if you want to keep both.', 'Save this session instead', async () => {
    busy = true;
    try {
      editor?.destroy(); editor = undefined;
      await saveQueue;
      await storageSession.replace(state);
      recoveredState = undefined; storageFailed = false; setStatus('Saved on this device');
      toast('This session is now saved.');
    } finally { busy = false; render(); }
  });
}
function download(url: string, name: string) {
  let fileURL = url;
  // WebViews and Safari handle Blob downloads more consistently than data URLs.
  if (url.startsWith('data:image/png;base64,')) {
    const bytes = Uint8Array.from(atob(url.slice(url.indexOf(',') + 1)), c => c.charCodeAt(0));
    fileURL = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
  }
  const a = document.createElement('a'); a.href = fileURL; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  if (fileURL !== url) setTimeout(() => URL.revokeObjectURL(fileURL), 30_000);
}
function exportBackup() {
  if (editor) state.draft = editor.snapshot();
  const url = URL.createObjectURL(new Blob([JSON.stringify(state)], { type: 'application/json' }));
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  download(url, `drawing-club-backup-${date}.json`); setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
async function importBackup(file?: File) {
  if (!file) return;
  if (file.size > 40_000_000) { toast('That file is too large. Please choose a Drawing Club backup under 40 MB.'); return; }
  try {
    const restored = validateBackup(JSON.parse(await file.text()));
    for (const drawing of restored.drawings) if (drawing.templateId !== 'freestyle' && !templateById(drawing.templateId)) throw new Error('This backup uses a picture this version does not know.');
    if (restored.draft && !['freestyle', 'background'].includes(restored.draft.templateId) && !templateById(restored.draft.templateId)) throw new Error('The unfinished picture is not supported by this version.');
    confirmAction('Restore this backup?', `This replaces the drawings and worlds currently on this device. Export your current backup first if you want to keep both. The backup contains ${restored.drawings.length} drawings and ${restored.worlds.length} worlds.`, 'Restore backup', async () => {
      busy = true;
      try {
        editor?.destroy(); editor = undefined;
        await saveQueue;
        await storageSession.replace(restored); // Keep the current session until the transaction succeeds.
        state = restored; recoveredState = undefined; selected = ''; storageFailed = false;
        setStatus('Saved on this device'); syncAudio(); closeModal(); navigate('home'); toast('Your drawings and worlds are back!');
      } catch (error) { render(); throw error; }
      finally { busy = false; }
    });
  } catch (error) { toast(error instanceof Error ? error.message : 'This backup could not be opened. Your current creations are safe.'); }
}
async function exportWorld() {
  const w = structuredClone(world());
  const output = canvas(1000, 650), ctx = output.getContext('2d')!;
  ctx.drawImage(await imageFrom(svgURL(sceneSVG(w.scene))), 0, 0, 1000, 650);
  if (w.background) ctx.drawImage(await imageFrom(w.background), 0, 0, 1000, 650);
  for (const f of w.friends) {
    const image = await imageFrom(friendImage(f)), frame = friendFrame(f);
    const fit = Math.min(frame.width / image.naturalWidth, frame.height / image.naturalHeight) * f.scale;
    const width = image.naturalWidth * fit, height = image.naturalHeight * fit;
    ctx.save(); ctx.translate(f.x * 1000, f.y * 650); ctx.scale(f.flipped ? -1 : 1, 1); ctx.drawImage(image, -width / 2, -height / 2, width, height); ctx.restore();
  }
  download(output.toDataURL(), `${w.name.replace(/[^a-z0-9-]/gi, '-')}.png`);
}

app.addEventListener('click', async event => {
  const el = (event.target as Element).closest<HTMLButtonElement>('button');
  if (!el || el.disabled || busy) return;
  void audio.activate().catch(() => toast('Audio could not start. You can keep drawing and try Music again.'));
  try {
    if (el.dataset.category) { category = el.dataset.category; navigate('pick'); return; }
    if (el.dataset.template) { startDrawing(el.dataset.template); return; }
    if (el.dataset.color) { color = el.dataset.color; if (editor) editor.color = color; app.querySelectorAll<HTMLButtonElement>('[data-color]').forEach(b => { b.setAttribute('aria-pressed', String(b === el)); b.innerHTML = b === el ? icon('check') : ''; }); return; }
    if (el.dataset.size) { brushSize = Number(el.dataset.size); if (editor) editor.size = brushSize; app.querySelectorAll('[data-size]').forEach(b => b.setAttribute('aria-pressed', String(b === el))); return; }
    if (el.dataset.addArt) { addArtwork(el.dataset.addArt); return; }
    if (el.dataset.prop) {
      if (world().friends.length >= 60) { toast('This world is full. Start another world to add more!'); return; }
      const f: Friend = { id: id(), prop: el.dataset.prop as Friend['prop'], x: .6, y: .76, scale: 1, flipped: false };
      world().friends.push(f); selected = f.id; persist(); closeModal(); navigate('world', false); return;
    }
    if (el.dataset.art) { artDialog(state.drawings.find(d => d.id === el.dataset.art)!); return; }
    if (el.dataset.world) { state.activeWorldId = el.dataset.world; selected = ''; persist(); closeModal(); navigate('world'); return; }
    if (el.dataset.scene) {
      const scene = el.dataset.scene as Scene;
      const change = () => { world().scene = scene; world().background = ''; persist(); closeModal(); navigate('world', false); };
      if (scene === world().scene) { closeModal(); return; }
      if (world().background) confirmAction('Choose a new background?', 'Your friends will stay. This replaces the background you painted. Download this world or export a backup first if you want to keep it.', 'Change background', change); else change();
      return;
    }
    const action = el.dataset.action;
    if (!action) return;
    if (action.startsWith('tool-')) {
      tool = action.slice(5) as Tool; editor?.setTool(tool);
      app.querySelectorAll('[data-action^="tool-"]').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
      app.querySelector('#tool-hint')!.textContent = toolHint();
      if (!heardTools.has(tool)) { audio.speak(toolHint()); heardTools.add(tool); } return;
    }
    if (action === 'home') { closeModal(); navigate('home'); }
    else if (action === 'close-dialog') closeModal();
    else if (action === 'confirm') { const callback = modalCallback; closeModal(); await callback?.(); }
    else if (action === 'voice' || action === 'music') { state.preferences[action] = !state.preferences[action]; syncAudio(); persist(); const isOn = state.preferences[action]; el.setAttribute('aria-pressed', String(isOn)); el.querySelector('span')!.textContent = `${action === 'voice' ? 'Voice' : 'Music'} ${isOn ? 'on' : 'off'}`; if (action === 'music' && isOn) await audio.activate(); if (action === 'voice' && isOn) audio.speak('Voice help is on. Let’s make something!'); }
    else if (action === 'help') modal('A little helping hand', `<p>${helpText()}</p><div class="dialog-actions">${button('speak-help', 'Hear it again', 'voice', 'primary')}${button('intro-replay', 'Show me how', 'image')}</div>`), audio.speak(helpText());
    else if (action === 'speak-help') audio.speak(helpText());
    else if (action === 'intro-replay') { closeModal(); startIntro(); }
    else if (action === 'intro-next') { if (++introStep > 2) { state.introSeen = true; persist(); navigate(introReturn); } else render(); }
    else if (action === 'intro-skip') { state.introSeen = true; persist(); navigate(introReturn); }
    else if (action === 'freestyle') startDrawing('freestyle');
    else if (action === 'resume') { if (state.draft!.backgroundWorldId) state.activeWorldId = state.draft!.backgroundWorldId; tool = templateById(state.draft!.templateId) ? 'fill' : 'brush'; persist(); navigate('draw'); }
    else if (action === 'undo' || action === 'redo') await editor?.travel(action);
    else if (action === 'finish') await finishDrawing();
    else if (action === 'world') navigate('world');
    else if (action === 'creations' || action === 'worlds') { closeModal(); navigate('creations'); }
    else if (action === 'new-world') { if (state.worlds.length >= 100) { toast('You have 100 worlds! Export a backup to keep this big collection safe.'); return; } const w = newWorld(state.worlds.length + 1); state.worlds.push(w); state.activeWorldId = w.id; selected = ''; persist(); navigate('world'); }
    else if (action === 'add-friend') addFriendDialog();
    else if (action === 'make-friend') { closeModal(); navigate('home'); }
    else if (action === 'scenes') modal('Where shall we play?', `<div class="scene-picker">${(Object.keys(sceneNames) as Scene[]).map(scene => `<button type="button" data-scene="${scene}" aria-pressed="${world().scene === scene}"><img src="${svgURL(sceneSVG(scene))}" alt=""/><strong>${sceneNames[scene]}</strong></button>`).join('')}</div>`);
    else if (action === 'paint-background') startDrawing('background', undefined, world().id);
    else if (['jump', 'dance', 'bigger', 'smaller', 'flip', 'more', 'duplicate', 'remove', 'recolor'].includes(action)) {
      const f = world().friends.find(f => f.id === selected); if (!f) { toast('Tap a friend first.'); return; }
      if (action === 'jump' || action === 'dance') playAction(f, action);
      else if (action === 'more') modal(`Play with ${escape(friendName(f))}`, `<div class="more-actions">${button('duplicate', 'Duplicate', 'duplicate')}${!f.prop ? button('recolor', 'Recolor a copy', 'brush') : ''}${button('remove', 'Remove from world', 'trash')}</div>`);
      else if (action === 'recolor') { const art = state.drawings.find(d => d.id === f.artId)!; closeModal(); startDrawing(art.templateId, art); }
      else if (action === 'remove') { world().friends = world().friends.filter(item => item.id !== f.id); selected = ''; persist(); closeModal(); navigate('world', false); toast('Removed from this world. Your drawing is still in My Friends.'); }
      else if (action === 'duplicate') {
        if (world().friends.length >= 60) { toast('This world is full. Start another world for more friends.'); return; }
        const copy = duplicateFriend(f); clampFriend(copy); world().friends.push(copy); selected = copy.id; persist(); closeModal(); navigate('world', false);
      } else { if (action === 'flip') f.flipped = !f.flipped; else f.scale = Math.max(.45, Math.min(1.6, f.scale + (action === 'bigger' ? .12 : -.12))); clampFriend(f); const element = app.querySelector<HTMLElement>(`[data-instance="${f.id}"]`)!; element.setAttribute('style', friendStyle(f)); persist(); }
    }
    else if (action.startsWith('add-art-')) addArtwork(action.slice(8));
    else if (action.startsWith('recolor-')) { const art = state.drawings.find(d => d.id === action.slice(8))!; closeModal(); startDrawing(art.templateId, art); }
    else if (action.startsWith('download-art-')) { const art = state.drawings.find(d => d.id === action.slice(13))!; download(art.image, `${art.name.replace(/[^a-z0-9-]/gi, '-')}.png`); }
    else if (action === 'parents') parentDialog();
    else if (action === 'backup-export') exportBackup();
    else if (action === 'backup-import') document.querySelector<HTMLInputElement>('#backup-file')!.click();
    else if (action === 'download-world') await exportWorld();
    else if (action === 'retry-save') await retrySaving();
    else if (action === 'open-recovered') recoverExisting();
    else if (action === 'replace-recovered') replaceRecovered();
  } catch (error) { toast(error instanceof Error ? error.message : 'Something went wrong. Please try again.'); }
});

async function boot() {
  app.innerHTML = '<div class="loading"><span aria-hidden="true">✿</span><p>Opening your drawing club…</p></div>';
  try { state = await storageSession.load(); }
  catch { state = initialState(); storageFailed = true; savedStatus = 'Could not open saved creations — try another browser or import a backup'; }
  syncAudio(); route = state.introSeen ? 'home' : 'intro'; render();
}
void boot();

// Production installs cache the complete game for later offline play.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(error => {
      console.warn('Offline play is unavailable. The online game still works.', error);
    });
  });
}
