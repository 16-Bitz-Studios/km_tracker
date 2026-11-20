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

## Optional Google Drive backups (v0.2 integration)

- **Data → Google Drive cloud backup** includes Link Google Account, Reconnect, Unlink, Back up to Google Drive, Find backups, and Restore selected backup.
- Each person authorizes their own Google account. The app uses the narrow, non-sensitive `drive.appdata` scope so it can only store or access its own private backup files in that user's hidden Google Drive application data folder. It also requests email permission to show which account is connected and prevent accidentally switching accounts on a device.
- The first deployment requires the app developer to create a Google Cloud project, enable **Google Drive API**, set up an OAuth consent screen (**External**, with test users added while in Testing), and create an OAuth 2.0 **Web application** client with the Authorized JavaScript origin `https://16-bitz-studios.github.io`. Set `GOOGLE_CLIENT_ID` (a public identifier, never a client secret) in `cloud.js`.
- Until a valid Client ID is configured, the cloud section displays **SETUP NEEDED** and remains inactive. This is intentional and does not affect local logging or ZIP exports.
- The access token is held in memory only; the associated email is saved locally for convenience. Reconnect each browser session to authorize Google operations. On iOS, if Google popup authorization is blocked from a Home Screen app, open the same website in Safari (note Safari and installed PWA may not share the same local records).
- This is **manual cloud backup and restore**, **not live sync**. Cloud restore explicitly replaces current local records with a confirmation prompt. Cloud files are not directly visible in regular Google Drive browsing; keep manual ZIP exports as independent backups.
- A shared phone/browser is not a separate local user profile. Separate users should use separate devices/browser storage until account-based local isolation is implemented.

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

### v0.3 — vehicle-only tracking

Labour-hour inputs, labour prices, labour billing, and labour dashboard totals were removed. Work trips still support optional billable **truck hours** and company-specific truck-hour prices. Existing legacy labour fields remain in saved records and JSON backups for audit history but are no longer billed, exported as regular CSV columns, or shown in the app. Historical vehicle-hour totals still fall back to old `hours` values if no truck-hours field existed, to avoid silently changing existing mileage/vehicle revenue.

### v0.4 — personal earnings and PDF audit

- The dashboard, client earnings, and trip previews show only the owner's share of truck charges (default **85%**), applied to kilometre charges, billable truck hours, and fuel surcharges.
- **Data & backup → Your share of client charges** can change this for new trips. Each trip snapshots the percentage; previously saved trips retain 85% unless their own snapshot says otherwise.
- **Audit export** is now a multi-page, searchable PDF containing work/personal trips, earnings, expenses, clients, receipt references and the local edit history. The backup ZIP remains for original receipt files and full restoration. Receipt binaries are not part of the PDF.

### v0.5 — hourly fuel surcharge

- Fuel surcharge choices now include **CAD per truck hour**, in addition to percentage, CAD per actual km and flat CAD per trip. Select it in a client's rate card or override the fuel surcharge for one trip.
- Hourly surcharge = entered truck hours × hourly surcharge rate, even when truck-hour base billing is disabled. The user's earnings percentage (85% by default) applies to the entire charge.
- Client summaries and the audit PDF show the owner's portion of hourly fuel surcharges. Existing trips keep their saved pricing selections.

### v0.6 — actual vs billed kilometres and iPhone keypad

- Work trips now have an optional **Billed kilometres** field alongside actual start/end odometer readings; leaving it empty uses actual driven distance, including for existing trips.
- Per-kilometre client charges use the billed distance, but **per actual km** fuel surcharges continue to use the odometer distance. The 85% earnings share is applied afterward as before.
- The dashboard shows actual work distance, charged distance, and the difference between billed and driven distance for trips where km billing is enabled. Trip previews, trip list and audit PDF include billed distance/difference as applicable.
- Odometer, billed kilometres and other numeric fields request the iPhone **decimal number keyboard** rather than the QWERTY keyboard.

### v0.7 — opening YTD totals and truck purchase investment

- Data & backup → **Opening YTD earnings** lets the user capture prior truck kilometre revenue, truck-hour revenue and fuel-surcharge revenue without creating fictional historical trips or mileage. Users choose whether input figures are client charge-out (apply their usual earnings %) or already their share (do not apply % twice). The opening is dated through a cutoff date and saved for a specific calendar year.
- This year / All time dashboard views add historical opening earnings to earnings from trips after the cutoff. This month shows tracked earnings only. Existing trips on or before the cutoff remain in the trip list and audit history, but their earnings are excluded from aggregate totals to avoid double counting. A clear badge marks those trips.
- **Vehicle details → Truck purchase price** records purchase cost once. The **Lifetime truck investment** dashboard shows all-time owner earnings, recorded vehicle expenses, operating profit, purchase price, net after purchase, purchase-cost recovery and investment ROI; monthly operating profit remains separate.
- The PDF audit includes categorized YTD opening earnings and the purchase cost/investment calculations. Openings and purchase price are stored in regular settings and included in the full restore ZIP and optional personal Google Drive backups. The app cannot reconstruct missing historical mileage, expenses or receipt evidence and does not incorporate resale value, taxes or financing principal as extra profit/loss assumptions.

### v0.8 — opening YTD amounts are already owner earnings

- **Opening YTD earnings** accepts only amounts that the vehicle owner has already earned (after the employer's percentage). It never applies 85% again to these entries; regular newly logged trips still use their own 85% or configured percentage.
- Previously saved YTD records that had been marked as `amount_mode: client` are also interpreted as already earned, without rewriting their original saved fields or history. Saving the opening balance again records it as `amount_mode: owner`; the audit report uses the corrected earnings basis.
- The combined lifetime investment view still subtracts logged expenses and the purchase price as separate calculations. Opening earnings are not automatically reduced for any historical costs that were never logged.

### v0.9 — Dashboard and Investment navigation

- **Overview** supports This week (Monday–Sunday), This month, This year, and All time. The opening YTD totals remain included only in year/all-time. Weekly entries are filtered by the phone's local calendar week.
- Overview now prioritizes the owner's earned revenue, recorded expenses and operating profit, with a breakdown of earnings by kilometres, vehicle hours and fuel surcharges. It shows actual, personal, billed and additional billed km, recent trips and client activity.
- Lifetime purchase recovery moved entirely off the Overview and into a sixth bottom-navigation **Invest** tab, which shows purchase cost, operating profit, net after purchase and investment return. Data remains the place to edit opening YTD and purchase price.
- All client records, earnings calculations, local backups and the PDF audit format are preserved.

### v1.0 — iPhone Home Screen keyboard compatibility

- On iPhones running TruckLedger from the Home Screen, work-trip, personal-trip, client and expense forms now open as normal in-page editors instead of native modal `<dialog>` popups. This avoids a potential iOS standalone web-app keyboard/focus problem. The Safari and desktop versions retain their native dialog layout.
- Numeric odometer, billed-distance and amount fields continue requesting the iPhone decimal keypad. No data is migrated, deleted or reset by this update.
- If an installed app has a system-level keyboard issue, opening the site in Safari can help diagnose it. **Do not delete the installed app without exporting its backup first**, because Safari and Home Screen app data may be separate.
