# Little Purple Drawing Club

A tablet-first, entirely browser-based drawing and pretend-play game for young artists. Color 18 animal and character templates, draw freely, then bring reusable cutouts into your own worlds.

## Play on iPad

Open **https://craiz99.github.io/coloring-game/** in Safari after GitHub Pages has been enabled and its deployment has completed. No computer, account, or app installation is needed to play.

For an app-like experience, use Safari’s Share menu → Add to Home Screen. The first visit needs internet; the production build caches the complete game for later offline visits. Keep the first visit open until all artwork has loaded. Updates become active after all older game tabs are closed and the game is reopened. Safari may evict offline files and saves, so keep JSON backups. Device speech voices may require an initial download through iPadOS.

To move existing creations from the local preview, export a backup under **For grown-ups**, then import it at the hosted address on the iPad. Saves stay on each device/browser; they do not sync.

## GitHub Pages deployment

In repository **Settings → Pages**, select **GitHub Actions** as the source once. `.github/workflows/pages.yml` runs the tests, builds the self-contained static game, and publishes it on each push to `main`. It can also be run manually from Actions. Relative asset paths support the `/coloring-game/` project URL. The build generates a versioned service worker with all game files; no external fonts, APIs, or media hosts are used.

## Run locally

Requires Node.js 22.12+ (Node 24 recommended).

```sh
npm ci
npm run dev
```

Open the printed local URL. For a tablet on the same Wi-Fi, use the printed Network URL with the development computer’s LAN address. Allow local-network access if prompted. The computer and server must remain running; localhost on an iPad refers to the iPad itself.

```sh
npm test
npm run build
npm run preview
```

The production `dist/` directory can be served by any static HTTP host. No server APIs, accounts, API keys, or microphone access are needed. Serve over HTTP/HTTPS rather than opening `index.html` as a file.

## Play

- Pick an uncolored, named picture; tap Fill and a color, or use Brush and Eraser. Eraser removes brush marks without touching template outlines. Brush size and undo/redo apply to the current picture.
- Freestyle creates transparent cutouts. Fill works inside closed shapes; open regions are left alone. Blank freestyle pictures cannot be saved.
- “Let’s play!” saves an independent drawing and adds it to the active world. Select friends to drag, resize, flip, duplicate, jump, dance, or recolor a copy. Recoloring never changes earlier drawings or their instances.
- Add saved friends and props through Add Friend. Tap props to play with them. Use keyboard arrows to move focused friends, Shift+arrows for larger moves, and Enter/Space to select and play.
- Make additional worlds in My Creations. Changing a scene keeps the friends; replacing painted background work requires confirmation. Paint Background edits a separate layer.
- The introduction is skippable and replayable from Help. Its cat is a demonstration, never a saved creation. Reduced-motion devices show still steps instead of animations.

## Saving and privacy

The versioned game is stored in IndexedDB in this browser, for this exact origin (including port). Clearing browser data, private browsing, changing the URL/port, or changing devices can make saves unavailable. No child data leaves the device. Fonts, artwork, sound synthesis, and game code are all local to the site; there are no third-party network dependencies.

Use **For grown-ups → Export backup** regularly. Import validates the backup before asking to replace current data. Export a backup before restoring another one. PNG downloads are pictures; only JSON backups preserve editable layers and worlds. Storage failures show a persistent banner; keep the tab open and export a backup if it appears.

If the game cannot open existing saves at startup, autosave pauses to protect them. Use **For grown-ups → Save again** to retry. If saved creations are found, you can open them or explicitly replace them with the current session. Export the current session’s backup before switching collections if you want to keep both.

## Audio and assets

Voice cues use the browser’s installed English speech voices, so voice quality and availability vary. Music is initially off; tap Music to opt in. Three original compositions are synthesized locally using Web Audio: Purple Daydream, Little Star Stage, and Garden Groove. They are not arrangements of film songs. Music ducks under narration and pauses when the page is hidden.

All coloring templates and scenes are authored SVG regions; brush layers are PNG canvases. Category thumbnails were created with the built-in image-generation tool: Rumi with her purple braid/yellow jacket, JJ and Mikey together, and a kitten with a panda. Their prompts are recorded in `public/art/ASSETS.md`. The game is an unofficial fan project and is not affiliated with the character owners. No redistribution license is asserted for third-party characters.

## Checks and handoff

Tests cover bounded fill, cutout bounds, history, independent copies, the complete roster, backup validation, IndexedDB round trips, failed-load protection, and editor navigation races. Browser QA is recorded in `QA.md`. Actual iPad Safari, physical stylus feel, and available device speech voices require testing on the device.

Source repository: [craiz99/coloring-game](https://github.com/craiz99/coloring-game). The game is published by the GitHub Pages workflow after changes reach main.
