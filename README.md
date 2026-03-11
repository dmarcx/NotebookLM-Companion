# NotebookLM Companion

A production-quality Chrome Extension (Manifest V3) that adds a full organizational layer on top of [Google NotebookLM](https://notebooklm.google.com).

---

## Features

| Feature | Description |
|---|---|
| 🔍 **Search** | Instant search across all notebook titles |
| 📁 **Folders** | Group notebooks into custom folders |
| 🏷️ **Tags** | Add multiple tags to each notebook |
| ⭐ **Favorites** | Star important notebooks |
| 🎨 **Colors** | Assign a color swatch per notebook |
| 📊 **Status** | Mark notebooks as Active / Inactive / Archived |
| 📝 **Notes** | Add a private note to each notebook |
| 🗄️ **Archive** | Archive notebooks to clean up the default view |
| 📋 **Smart Views** | All, Favorites, Active, Archived, Recently Opened |
| 🌐 **Multi-Account** | Full support for multiple Google accounts (authuser params) |
| 💾 **Import / Export** | Backup and restore your metadata as JSON |

---

## Architecture

```
src/
├── background/
│   └── service-worker.ts     # MV3 service worker — handles messages, badge updates
├── content/
│   ├── main.ts               # Entry point — bootstraps all layers
│   ├── observer.ts           # SPA navigation observer (history API override)
│   └── parser.ts             # ⚠️ ALL NotebookLM DOM selectors isolated here
├── storage/
│   ├── schema.ts             # TypeScript types + factory functions
│   ├── migration.ts          # Schema version upgrades
│   └── storageManager.ts    # CRUD API over chrome.storage.local
├── state/
│   └── store.ts              # Lightweight pub/sub state store
├── ui/
│   ├── toolbar.ts            # Search / filter / sort bar (home page)
│   ├── sidebar.ts            # Smart views / folder / tag panel
│   ├── notebookBadges.ts     # Metadata badges on each card
│   ├── notebookPanel.ts      # Collapsible metadata panel (notebook page)
│   └── modal.ts              # Reusable edit modal
├── utils/
│   ├── constants.ts          # Shared constants
│   ├── dom.ts                # Safe DOM utilities
│   ├── logger.ts             # Prefixed logger (suppressed in production)
│   └── url.ts                # URL parsing helpers
└── popup/
    ├── popup.html
    └── popup.ts              # Stats, export, import
```

---

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- [npm](https://npmjs.com/) ≥ 9

### Install

```bash
cd "d:\My Apps\NotebookLM Companion"
npm install
```

### Build

```bash
# Production build
npm run build

# Development watch mode (with inline sourcemaps)
npm run watch

# Type check only (no output)
npm run typecheck
```

The build output goes to `dist/`. Load this folder as an unpacked Chrome extension.

---

## Installing in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder
5. Navigate to [notebooklm.google.com](https://notebooklm.google.com)

---

## Usage

### Home Page

After loading, a **toolbar** appears above your notebook grid:

- **Search box** — filters cards in real-time as you type
- **Folder / Tag / Status dropdowns** — filter by specific metadata
- **★ Favorites** — toggle to show only starred notebooks
- **Sort** — sort by Last Updated, Created, Last Opened, or Name (A–Z)
- **≡ Views** — opens the Companion sidebar

Each notebook card gains a **badge row** at the bottom showing its color, star, folder, tags, and a ✎ edit button.

### Sidebar

Click **≡ Views** to open the sidebar:

- **Smart Views**: All / Favorites / Active / Archived / Recently Opened
- **Folders**: Click any folder to filter by it
- **Tags**: Click any tag pill to filter by it

### Notebook Page

Inside an open notebook, a **◀ Companion** tab appears on the right edge of the screen. Click it to expand a panel where you can edit all metadata. Changes autosave after 600ms.

### Popup

Click the extension icon in the Chrome toolbar to:

- View statistics (total notebooks, favorites, folders, tags)
- **Export** all metadata as a JSON file
- **Import** a previously exported JSON file

---

## Multi-Account Support

All metadata is scoped by the `authuser` query parameter in the NotebookLM URL.

| URL | Account Scope |
|---|---|
| `notebooklm.google.com/...?authuser=0` | `authuser:0` |
| `notebooklm.google.com/...?authuser=1` | `authuser:1` |

When you switch between accounts, the companion automatically loads the correct metadata set.

---

## Data Storage Format

All data is stored in `chrome.storage.local` under the key `nlm_companion_data`:

```json
{
  "version": 1,
  "accounts": {
    "authuser:0": {
      "notebooks": {
        "14f7c2a9-1c56-4ace-895d-c023223e6137": {
          "folder": "Work",
          "tags": ["research", "ai"],
          "status": "active",
          "color": "#1a73e8",
          "favorite": true,
          "note": "My main research notebook",
          "archived": false,
          "createdAt": 1700000000000,
          "updatedAt": 1700001000000,
          "lastOpened": 1700002000000
        }
      }
    }
  }
}
```

---

## Debugging

### Check if the extension loaded

Open DevTools on `notebooklm.google.com` → Console → look for:

```
[NLM Companion] NotebookLM Companion starting…
[NLM Companion] Storage loaded: 1 accounts
[NLM Companion] initHomePage: done (12 notebooks)
```

### Inspect stored data

In the background service worker console (`chrome://extensions` → Inspect service worker):

```javascript
chrome.storage.local.get(null, console.log)
```

### If notebook cards are not detected

NotebookLM may have updated its DOM structure. Open DevTools on the home page:

1. Right-click a notebook card → Inspect
2. Find the `<a>` element with `href="/notebook/<uuid>"`
3. Identify the selector and update `SELECTORS` in [src/content/parser.ts](src/content/parser.ts)
4. Rebuild with `npm run build` and reload the extension

### Enable verbose logging

In watch mode (`npm run watch`), `process.env.DEBUG` is `"true"`, so all `logger.log()` calls are visible in the console. In production builds they are stripped.

---

## Updating Selectors

All NotebookLM DOM selectors live in **one place**: [`src/content/parser.ts`](src/content/parser.ts)

The `SELECTORS` object at the top of that file has detailed comments explaining each selector's purpose. If the extension breaks after a NotebookLM update, this is the only file you need to edit.

---

## Future Improvements

- [ ] **Cloud sync** via Google Drive API (backup across devices)
- [ ] **Drag-and-drop** folder assignment on the home page
- [ ] **Bulk operations** — multi-select + batch tag / archive
- [ ] **Keyboard shortcuts** — `⌘/Ctrl + K` to search, etc.
- [ ] **Dark mode** — detect `prefers-color-scheme: dark`
- [ ] **Notebook templates** — apply a metadata preset to new notebooks
- [ ] **Firefox port** — the codebase is WebExtension API compatible
- [ ] **Export formats** — CSV in addition to JSON

---

## License

MIT — see LICENSE file.
