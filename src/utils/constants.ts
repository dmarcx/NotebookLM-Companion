/** Chrome storage key for all companion data. */
export const STORAGE_KEY = 'nlm_companion_data';

/** Current schema version. Increment when making breaking storage changes. */
export const SCHEMA_VERSION = 1;

/** Fallback account scope when no authuser param is present. */
export const DEFAULT_ACCOUNT_SCOPE = 'authuser:0';

/** Debounce delay for the SPA navigation observer (ms). */
export const DEBOUNCE_OBSERVER_MS = 150;

/** Debounce delay for the search input (ms). */
export const DEBOUNCE_SEARCH_MS = 300;

/** Debounce delay for the notebook panel autosave (ms). */
export const DEBOUNCE_AUTOSAVE_MS = 600;

/** Max time (ms) to wait for a DOM element before giving up. */
export const ELEMENT_WAIT_TIMEOUT_MS = 12_000;

/** Polling interval (ms) for waitForElement. */
export const ELEMENT_POLL_INTERVAL_MS = 250;

/** DOM id of the injected companion toolbar. */
export const TOOLBAR_ID = 'nlm-companion-toolbar';

/** DOM id of the injected companion sidebar. */
export const SIDEBAR_ID = 'nlm-companion-sidebar';

/** DOM id of the injected notebook metadata panel. */
export const PANEL_ID = 'nlm-companion-panel';

/** DOM id prefix for notebook badge elements. */
export const BADGE_PREFIX = 'nlm-badge-';
