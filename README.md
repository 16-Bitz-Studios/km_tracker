# TruckLedger

An offline-first, installable iPhone web app for tracking work kilometres, personal kilometres, client-specific billing, vehicle operating costs and attached receipts. This is a static app: no server or account is required to store data.

## Features in v0.1

- Start a **work** trip with just the morning odometer, then finish it using the evening reading. Record date, destination/jobsite, task, hours worked and optional vehicle hours.
- Log **personal** trips with starting and ending odometer and destination.
- Set up unlimited clients with vehicle billing **per km**, **per truck hour**, **both**, or **neither**. Labour hourly charges are independent; fuel surcharges can be a **percentage of truck charges**, **per actual km**, **flat per trip**, or none.
- Each work trip has toggles for which charges are allowed; saved trip rates are snapshots so company price changes do not recalculate history.
- Record fuel, maintenance, repairs, tires, insurance, registration and other costs, optionally with a camera image or PDF receipt (max 20 MB each).
- Dashboard distinguishes **vehicle revenue**, **labour billings**, **all vehicle costs**, work/personal distance and vehicle net. Date filter: month/year/all time.
- ZIP backup contains JSON data and actual receipt files. Audit ZIP includes the same restore-ready data plus CSV tables, including a local create/edit/delete history. Both can be restored in the app.
- All records, receipts and edit-history events live in IndexedDB on the device. Assets can be cached with a service worker for offline use.

## Install on an iPhone (after publishing)

1. Open the published HTTPS link in **Safari**.
2. Tap Safari's **Share** icon, then **Add to Home Screen**.
3. Open **TruckLedger from the new Home Screen icon** and make one test entry. Keep using the same installed copy for data consistency.
4. Go to **Data → Export full backup**, save the resulting ZIP to **Files / iCloud Drive**, and verify the file exists.

**Important:** Do not use the `index.html` file opened directly from iPhone Files or the ChatGPT file preview as the production app. Those previews can block JavaScript, IndexedDB and service workers. The installed app needs to be served from HTTPS. Safari and a Home Screen app may have separate website storage; enter your ongoing records in the Home Screen app once installed.

## Deploy on GitHub Pages

The app is plain static HTML, JS and CSS, and uses only relative URLs. You can deploy from the repository root.

1. Create a new **public** repository named `km_tracker` under your GitHub account, initializing it with a README so the `main` branch exists.
2. Upload these project files to the repository root (or let the GitHub connector commit them).
3. Under **Settings → Pages**, choose **Deploy from a branch**, select `GrimBlade` and `/(root)`, and save.
4. Open `https://16-bitz-studios.github.io/km_tracker/` in Safari and use the install steps above.

The code being public does **not** publish client names, receipt photos or mileage data because those records live locally in your browser, not in GitHub. Do not commit backup ZIPs or real receipt files to the repository.

## Backup and export

- **Export full backup:** `TruckLedger_backup_YYYY-MM-DD.zip` — JSON records, edit history, receipts.
- **Export audit package:** `TruckLedger_audit_YYYY-MM-DD.zip` — all of the above plus `work_trips.csv`, `personal_trips.csv`, `vehicle_expenses.csv`, `clients.csv`, `change_history.csv`.
- **Restore:** Data & backup → Choose backup ZIP → Restore selected backup. This **replaces** current local data after explicit confirmation. Back up existing records first.

The ZIPs intentionally use the standard uncompressed ZIP format (`STORE`) to allow a small dependency-free restore implementation on iPhone. Receipts are capped at 20 MB apiece; total export size grows with receipt volume. Very large backups may exceed available iPhone memory.

## Calculations

- Work km = end odometer − start odometer, when the trip is complete.
- Vehicle revenue = (work km × eligible client km rate) + (eligible truck hours × truck hourly rate) + applicable fuel surcharge.
- Labour billings = eligible hours worked × client labour hourly rate (**separate from truck revenue**).
- Client total = vehicle revenue + labour billings.
- Truck net (dashboard) = **vehicle revenue − all vehicle expenses**, including expenses incurred during personal driving. This is not an allocated business-only net, accounting income statement or tax filing calculation.
- Fuel surcharge percentage is applied to billed **vehicle** charges only, not labour. Per-km fuel surcharge is based on actual recorded work kilometres; it may apply to hourly-only clients if enabled.
- These figures exclude GST/PST and are planning/audit aids, not issued invoices.

## Privacy and limitations

- **Local only in v0.1:** No cloud sync, login, multi-device sync, server backup or receipt cloud storage. Clearing browser website data or deleting the installed app can erase records. Export backups regularly.
- The locally stored edit history helps explain changes; it is **not tamper-proof**. Formal compliance requirements vary by organization and tax jurisdiction.
- There is no GPS tracking or automatic trip detection; odometer records are entered manually.
- Each trip should represent a distinct odometer segment. The app does not yet automatically detect overlaps or unlogged mileage gaps.
- Any hosting domain change creates a new local storage namespace; export and restore when moving domains.
- iPhone Safari/installed PWA device testing is required before relying on this for production records.

## Files

- `index.html` — app shell and views
- `style.css` — mobile-first dark theme
- `app.js` — all local data, forms, rate calculations and ZIP import/export
- `manifest.webmanifest` — install metadata
- `sw.js` — optional offline caching (increment the cache name when shipping a frontend update)
- `icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` — app icons

Version: **v0.1.0**. No npm install, build tool, paid service or Mac required to run once hosted.
