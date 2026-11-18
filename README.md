# Возачки дневник — Vercel PWA

## Deploy to Vercel
1. Push this folder to a Git repository.
2. Import the repository in Vercel.
3. Framework Preset: **Other**.
4. Build Command: leave empty. Output Directory: `.`.
5. Deploy. `index.html` is the application entry point.

## Project structure
- `index.html` — app entry point and markup
- `styles/app.css` — custom styles
- `scripts/tailwind.config.js` — Tailwind configuration
- `scripts/app.js` — application logic
- `manifest.webmanifest` — PWA manifest
- `sw.js` — offline service worker
- `icons/` — PWA and Apple icons
- `vercel.json` — response headers for PWA files

Records are stored in browser local storage. Export JSON backups regularly; installing the PWA does not sync data between devices.
