# [Spin the Wheel](https://spin.alsatian.co)

Spin the Wheel is a local-first wheel spinner and random picker for classrooms, raffles, giveaways, live streams, team picks, and quick decisions. It is a static PWA built with HTML, CSS, and vanilla JavaScript modules, with no backend, no accounts, and no build step.

Live site: https://spin.alsatian.co

## Highlights

- Crypto-random winner selection with `crypto.getRandomValues()`
- Weighted entries, elimination mode, seed mode, tournament mode, manual stop, and mystery wheel mode
- Save named wheels locally and reopen them later
- Share full-edit or spin-only wheels through compressed URLs with checksum validation
- Bulk entry paste, CSV import, wheel export, results CSV export, and audit JSON export
- Built-in templates, themes, event presets, sounds, celebration effects, and fullscreen mode
- Offline-ready PWA with install support and a service worker
- Local-first storage: wheel state and preferences in `localStorage`, saved wheels in `IndexedDB`
- Multilingual UI with English, Vietnamese, Spanish, Portuguese, French, German, Japanese, Korean, Chinese, and Indonesian
- Supporting pages for About, Help, Fairness, and Privacy

## Tech Stack

- HTML, CSS, and vanilla ES modules
- Canvas 2D for wheel rendering and spin animation
- Web Audio API for tick, spin, and win sounds
- `crypto.getRandomValues()` for secure winner selection
- `localStorage` and `IndexedDB` for persistence
- Service Worker and Web App Manifest for offline support and installability

## Run Locally

Because the app uses ES modules, root-relative asset paths, and a service worker, serve it from the repository root with a local HTTP server instead of opening `index.html` directly.

### Option 1: Python

```bash
cd /path/to/spin-the-wheel
python3 -m http.server 8080
```

Open http://localhost:8080.

### Option 2: Node

```bash
cd /path/to/spin-the-wheel
npx serve .
```

Open the URL printed by the server.

No `npm install` is required for the app itself.

## Deployment Notes

- The project currently assumes root deployment at `/`, not a subpath. Asset links, the manifest, and the service worker scope all use root-based paths.
- If you deploy to a different domain or a forked site, update the canonical, Open Graph, Twitter, and `hreflang` URLs in the HTML pages.
- Update `SITE_ORIGIN` in `app.js` if the production origin changes.
- Update `CNAME` if you deploy with GitHub Pages and a custom domain.
- If you add or remove cached app-shell files, update `APP_SHELL_ASSETS` and bump `CACHE_VERSION` in `sw.js`.

## Project Structure

```text
.
|-- index.html            # Main app shell
|-- app.js                # UI orchestration and event wiring
|-- wheel-engine.js       # Canvas renderer and spin physics
|-- state-manager.js      # State persistence and change tracking
|-- share-codec.js        # Share URL encoding, decoding, and checksum validation
|-- wheel-library.js      # Saved wheel library stored in IndexedDB
|-- audio-engine.js       # Web Audio engine
|-- defaults.js           # Default state, entries, and supported languages
|-- themes.js             # Theme and visual presets
|-- templates.js          # Built-in wheel templates
|-- i18n.js               # Language loading and translation binding
|-- utils.js              # Shared helpers and storage wrappers
|-- sw.js                 # Service worker and app-shell cache
|-- manifest.json         # PWA manifest
|-- about.html            # Product overview page
|-- fairness.html         # Randomness and fairness explanation
|-- help.html             # Feature guide, FAQ, and shortcuts
|-- privacy.html          # Local-first privacy policy
|-- support.css           # Styles for About/Help/Fairness/Privacy pages
|-- support.js            # Shared script for support page localization and metadata
|-- lang/                 # Translation packs
```

## How Data Works

- Current wheel state, UI preferences, theme choice, and language selection are stored in the browser.
- Saved wheel library entries are stored locally in IndexedDB.
- Shared wheels are encoded into the URL itself, so there is no server-side storage by default.
- Winner selection happens before animation; the wheel then animates to the selected result.

## Browser Support

The app targets modern versions of Chrome, Firefox, Safari, and Edge. It depends on these browser features:

- ES modules
- Canvas 2D
- Web Audio API
- `crypto.getRandomValues()`
- Service Worker
- IndexedDB

## License

MIT. See `LICENSE`.