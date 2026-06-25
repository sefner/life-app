# Life — personal health & wellness app

A modular, on-device PWA. The guiding principle is **don't be overbearing**: each
module surfaces at most one thing it wants today, logging is one tap, and a blank
day is a valid day.

## Architecture
- **Shell** (`core/app.js`): dumb registry + hash router. Renders a home grid of
  module tiles and a per-module detail view. Knows nothing about any domain.
- **Store** (`core/store.js`): the single data seam. localStorage-backed today
  (private, offline). To add cross-device sync later, change ONLY this file —
  no module is touched.
- **Modules** (`modules/*.js`): self-contained. Each calls `App.register({...})`.
  Add a file + a `<script>` line in `index.html` + a path in `sw.js` ASSETS → done.
- **PWA**: `manifest.webmanifest` + `sw.js` (cache-first offline) + `icons/icon.svg`.
  Bump `CACHE` in `sw.js` when shipping so clients update.

## Module contract
```js
App.register({
  id, title, icon, accent,        // identity + home-tile look
  tile(el),                       // render today's one-line status into el
  view(el, params),              // render detail; params = hash segments after /m/<id>
  onDeepLink(args),              // optional: handle #/log/<id>/<args> from iOS Shortcuts
});
```
Reusable CSS classes live in `core/styles.css`: `.section`, `.row`, `.check`,
`.btn`, `.field`, `.pill`, `.progress`, `.codeblock`.

## iOS Shortcuts integration
Reminders are an OS concern, not the app's. A time-based Shortcuts *Automation*
runs "Open URL" pointing at a deep link like
`<base>#/log/supplements/<id>@<time>`; opening the notification logs the action.
The Supplements "Manage" screen prints these links to copy.

## Current modules
- `training.js` — editable weekly plan (seeded: 3 strength + 3 easy runs, trail-
  durability focus), per-exercise + session logging.
- `supplements.js` — stack scheduling, one-tap logging, Shortcuts link generator.

## Deploy
Static host over https (GitHub Pages, like `~/scout`), then iPhone → Share →
Add to Home Screen. Service worker + add-to-home need https (localhost is fine
for dev: `python3 -m http.server`).

## Ideas backlog (add as modules when wanted, not before)
Sleep, habits/accountability, nutrition, bodyweight/recovery, finance.
