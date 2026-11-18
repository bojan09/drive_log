# Driver Activity Tracker

A small, offline web app that records which drivers drive on which days and shows how often each driver uses their assigned vehicle. It is not a fleet, GPS, mileage or trip system: a record is only a **driver** and a **date**.

Plain HTML, CSS and JavaScript. No frameworks, no build step, no server, no network. Data is stored in your browser (LocalStorage).

## Install and run

1. Unzip the archive anywhere.
2. Open `index.html` in a current browser (Chrome, Edge, Firefox or Safari). That is all.

Optional: serve the folder instead of opening the file, for example `python3 -m http.server 8000` and visit `http://localhost:8000`.

**Where your data lives.** LocalStorage belongs to the browser profile *and* the address the app is opened from. Opening the file directly (`file://…`) and serving it from `http://localhost:8000` are different places with separate data. Pick one way to open the app and stay with it. Clearing browser data, using private windows, or moving the folder may hide or remove your data, so **export a backup regularly** (see below).

## Using the app

| Page | What you do there |
| --- | --- |
| **Dashboard** | See active drivers, registered vehicles, who drove today, driving days this week, the most active driver, recent activity, and comparison charts (weeks, months or years). |
| **Drivers** | Add, edit, deactivate/reactivate and remove drivers. Each driver has a full name, one assigned vehicle and an optional registration number. Click a name to open the driver's profile. |
| **Records** | Pick a driver and a date, then **Add record**. The date stays after each add so several drivers can be entered quickly. Filter history by driver, edit or delete records. |
| **Statistics** | Filter by Today, This week, This month, This year, All time or a custom date range. See rankings, the previous period and the change, and a history of the last weeks, months or years. |
| **Driver profile** | Details, week/month/year/all-time driving days with comparison, an activity chart and the list of all driving days. |
| **Settings** | Export and import data, see stored counts, switch theme. |

The light or dark theme can also be switched from the sidebar (top corner on phones). The layout adapts to desktop, tablet and phone.

## Rules the app follows

- **One driver + one calendar date = one driving day.** A second record for the same driver and date is rejected, and statistics count distinct dates anyway.
- Different drivers can drive on the same date.
- Every number is calculated from the records each time. There are no stored counters that could drift out of sync, so editing or deleting a record updates everything.
- Weeks run **Monday to Sunday**. "This week/month/year" are the current calendar periods and are compared with the full previous period.
- Dates are stored as plain `YYYY-MM-DD` text, so time zones never shift a date.
- A vehicle can be assigned to only one **active** driver at a time, and registration numbers must be unique.
- Deactivating a driver keeps all their history. Removing a driver who has records deletes those records too, after a clear warning. Deactivate instead to keep them.
- "Registered vehicles" counts the distinct vehicles assigned to active drivers.

## Backup, export and import

**Settings → Export data** downloads `driver-activity-backup-YYYY-MM-DD.json`.
**Settings → Import data** replaces *all* current data with a backup file. Before anything changes you are shown how many drivers and records the file holds and how many invalid or duplicate items will be skipped, and you must confirm. Export first if unsure.

Import rejects files that are not valid JSON, are not a backup from this app, come from a newer version, or are larger than 10 MB. The file format is described in [docs/DATA-FORMAT.md](docs/DATA-FORMAT.md).

If saved data ever cannot be read, the app starts empty, shows a warning, and keeps the unreadable copy so you can download it from Settings.

Several tabs may be open at once: changes made in one tab appear in the others, and writes never overwrite newer data from another tab.

## Project layout

```
index.html              page shell and script loading order
css/styles.css          themes, layout, components
js/app.js               startup, theme, router, Settings page, notifications
js/utils/dateUtils.js   date helpers (strings, Monday weeks, month/year maths)
js/services/validation.js   validation of drivers, records, datasets and imports
js/storage/storage.js   repository + storage adapters (LocalStorage, memory)
js/services/stats.js    statistics engine (pure functions of drivers and records)
js/charts/charts.js     column and bar charts without libraries
js/views/               dashboard, drivers, driver (profile), records, statistics
tests/                  Node tests (run: node tests/run-all.js)
docs/DATA-FORMAT.md     backup file format
```

Scripts are plain `<script>` files sharing one `window.DAT` object, so the app runs straight from `index.html` (ES modules would not load from `file://`).

## Tests (optional)

With Node.js 18 or newer: `node tests/run-all.js`. They cover dates and week boundaries, validation, the repository rules, import hardening, the statistics engine, the dashboard and profile numbers, and multi-tab behavior. No packages are needed.

## Moving to a database later

All data access goes through the repository in `js/storage/storage.js`. It talks to an *adapter* with three methods: `load()`, `save(data)` and optionally `backupCorrupt(raw)` / `readCorrupt()`. The dashboard, driver management and statistics code never touch LocalStorage, so a database can be added by writing a new adapter (an asynchronous backend would also mean making the repository calls asynchronous). Existing LocalStorage data can be moved with Export, then a one-off import into the new store.

## Known limits

- Data is per browser and per address; there is no sync between devices or users.
- LocalStorage holds roughly 5 MB, which is many thousands of driving days. The app reports a clear error if storage is full.
- Future dates are allowed in Records. Statistics for "this week/month" include them.
