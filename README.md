# Surgical Logbook (PWA)

A private, offline surgical logbook that follows the RACS Morbidity Audit and Logbook Tool (MALT) case-entry workflow. It runs full screen on iPhone, iPad and Android once it is installed from a web link. Each surgeon who installs it gets their own independent logbook stored on their own device.

**Each surgeon's logbook is private to their device. There is no shared database.** There are no accounts, analytics or cloud sync. After the first visit the app works fully offline.

> Log procedures only. Never enter patient names, hospital numbers, dates of birth or any other identifiers.

---

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole app: UI, logic, styles, CSV/JSON export and import |
| `storage-worker.js` | Web Worker that does all OPFS reads and writes (required for iOS) |
| `sw.js` | Service worker that caches the app shell for offline use |
| `manifest.json` | PWA manifest (name, icons, standalone display) |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | App icons (Android / manifest) |
| `apple-touch-icon.png` | 180×180 Home Screen icon for iOS |
| `og-image.png` | Link-preview image for iMessage, WhatsApp and email |
| `.nojekyll` | Empty file that stops GitHub Pages from running Jekyll |
| `README.md` | This file |

There is no build step, no npm and no framework. Upload the files as they are.

## How data is stored

1. **OPFS (Origin Private File System)**, preferred. The logbook is saved as `surgical-logbook.json`. All reads and writes go through `storage-worker.js` using `createSyncAccessHandle()`, the only OPFS write method iOS Safari supports.
2. **IndexedDB** (`surgical_logbook` database, `cases` store) mirrors every save, and is used instead if OPFS is unavailable.
3. On launch the app loads from OPFS and falls back to IndexedDB if OPFS is missing or corrupt. If both are empty it starts a new logbook. It also asks the browser for persistent storage with `navigator.storage.persist()`. Settings shows the result.

`localStorage` is used only for the dark-mode choice and the "install banner dismissed" flag.

**Back up regularly:** Settings → Export JSON backup. If a phone is lost, reset or replaced, that backup is the only copy.

---

## Distribution and sharing

The app is distributed as a **static site served over HTTPS**. There is no server-side logic, database or account system. **HTTPS is mandatory**: service workers, PWA installation and OPFS do not work over plain HTTP.

**Deployment** (use one of the two paths below):

### Path A — GitHub Pages
1. Sign in at `github.com` → **New repository**.
2. Name it, for example, `surgical-logbook`. Set visibility to **Public** (free GitHub Pages requires this). Do not add a README. Click **Create repository**.
3. Click **uploading an existing file**.
4. Drag in **all** app files: `index.html`, `manifest.json`, `sw.js`, `storage-worker.js`, `.nojekyll`, `README.md` and the icon files (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `og-image.png`). Commit.
5. **Settings → Pages**.
6. Under **Source**, choose **Deploy from a branch**. Branch: **main**, folder: **/ (root)**. Click **Save**.
7. Wait 1–2 minutes, then reload the page. Your URL appears at the top: `https://YOUR-USERNAME.github.io/surgical-logbook/`
8. Open that URL on your phone and install the app.

**Notes:**
- `.nojekyll` is essential. Without it, GitHub runs Jekyll and may ignore files whose names begin with an underscore, which breaks the app.
  - macOS and Windows hide files that start with a dot. If `.nojekyll` doesn't appear when you drag files in, create it on GitHub instead: **Add file → Create new file**, name it `.nojekyll`, leave it empty and commit.
- All app paths are relative (no leading `/`), so the app works from the `/surgical-logbook/` subfolder.
- To update later, upload the new files to the same repository and bump `APP_VERSION` (see Versioning).

### Path B — Netlify Drop
1. Put all app files in a single folder on your computer, including `.nojekyll` (harmless if unused) and the icons.
2. Go to `app.netlify.com/drop` and drag the **folder** (not individual files) into the drop zone.
3. Netlify uploads the folder and gives you a live URL such as `https://cheerful-otter-1a2b3c.netlify.app`. **Sign up or log in when prompted to claim the site.** An unclaimed drop is temporary.
4. Optional: **Site configuration → Change site name** to something memorable, for example `surgical-logbook-jsmith`.
5. Open the URL on your phone and install the app.

**Notes:**
- To update later, drag the updated folder onto the same site in the Netlify dashboard (**Deploys → Drag and drop**).
- Netlify provides HTTPS automatically.

### Choosing a path
| | GitHub Pages | Netlify Drop |
|---|---|---|
| Setup time | ~10 min | ~2 min |
| Account needed | GitHub (free) | Netlify (free) |
| Permanent URL | Yes | Yes, once claimed |
| Update process | Upload files to repo | Drag folder again |
| Best for | Version history, repeatable deploys | Fastest first publish |

**Do not publish to both and share both links.** Each URL is a separate browser origin with separate storage, so the logbook would be split across two unrelated apps.

### Sharing model — independent copies, not shared data
- Everyone who opens the URL installs their **own** copy of the app, with their **own** OPFS/IndexedDB storage. Data never syncs between users.
- Settings has a **Share this app** section with a **Copy link** button and plain-English install steps for iOS and Android.
- **Each surgeon's logbook is private to their device.** There is no shared database.
- **Origin warning:** each hosting URL is a separate browser origin with separate storage. Installing from two different URLs produces two unrelated logbooks. Choose **one canonical URL** and share only that. If you ever change hosts, move your data with **Export JSON → Import JSON**.
- This version has no user accounts, shared storage or sync mechanism, by design.

### Versioning
- `APP_VERSION` is set near the top of the script in `index.html` and at the top of `sw.js`. It is shown in Settings (e.g. "v1.0.0").
- `sw.js` includes `APP_VERSION` in the cache name, so each new deployment replaces the old cached app shell.
- **When you update:** change `APP_VERSION` in **both** files to the same new value (e.g. `1.0.1`), then redeploy. Installed copies pick up the update the next time they're opened online. Logbook data is not affected.

### Verification checklist
- [ ] Open the URL in a desktop browser. The app loads, the privacy banner is visible and there are no console errors.
- [ ] iPhone → **Share → Add to Home Screen**. Launch from the Home Screen: no browser bars.
- [ ] Android → accept the in-app install banner (or Chrome ⋮ → **Add to Home screen**). Launch standalone.
- [ ] Add a test case on each phone. Force-quit. Reopen. The case is still there.
- [ ] Turn on Airplane Mode. Reopen. The app loads and a new case saves.
- [ ] Settings → **Export CSV**. Confirm the file opens correctly in Numbers or Google Sheets.
- [ ] Settings → **Copy link** → send it to a second person. They install the app and confirm their logbook is **empty** (proving the logbooks are independent).
- [ ] Delete test cases before real use.

---

## Optional: sharper link previews

Some apps (notably iMessage) need an absolute image URL for link previews. After you know your final URL, edit `index.html` and change

```html
<meta property="og:image" content="og-image.png">
```

to the full address, e.g. `https://YOUR-USERNAME.github.io/surgical-logbook/og-image.png`.

## Using the app

- **Journal**: newest cases first. Filter by month, role or procedure. Tap a case to edit it, or swipe left to delete it. Tap **+ New Case** to log a case. A new case is pre-filled with the hospital, department, rotation and level from your most recent case, to save typing.
- **New / Edit Case**: date, hospital and at least one procedure with a supervision level are required. Use **+ Add another procedure** for multiple procedures in one case. If a procedure isn't in the starter list, type it and choose **Can't find my procedure? Use "…"**.
- **Dashboard**: totals, counts by procedure (tap a column heading to sort), counts by role, and a cases-per-month chart covering your full history.
- **Settings**: dark mode, CSV export (one row per procedure, RFC 4180 quoting), JSON backup and restore (import **replaces** the logbook and never merges), storage status, share link and version.

## Exporting for RACS / MALT

The CSV is a personal record that opens in Numbers, Excel or Google Sheets. It is not an official MALT import file. Use it to copy cases into MALT, or as supporting evidence for your logbook.
