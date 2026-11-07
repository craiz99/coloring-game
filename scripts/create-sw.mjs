import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

async function filesIn(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const groups = await Promise.all(entries.map(entry => {
    const path = `${dir}/${entry.name}`;
    return entry.isDirectory() ? filesIn(path) : [path];
  }));
  return groups.flat();
}

const files = (await filesIn('dist')).filter(path => !path.endsWith('/sw.js')).sort();
const hash = createHash('sha256');
for (const path of files) hash.update(path).update(await readFile(path));
const version = hash.digest('hex').slice(0, 16);
const urls = files.map(path => `./${path.slice('dist/'.length)}`);
await writeFile('dist/sw.js', `// Generated from the complete production build; do not edit.
const CACHE = 'drawing-club-${version}';
const FILES = ${JSON.stringify(urls)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('drawing-club-') && key !== CACHE)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    if (event.request.mode === 'navigate') {
      return (await cache.match(new URL('index.html', scope).href)) || fetch(event.request);
    }
    return (await cache.match(event.request)) || fetch(event.request);
  }));
});
`);
console.log(`Offline cache: ${files.length} files (${version})`);
