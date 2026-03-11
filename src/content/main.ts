/**
 * Content script entry point — injected into every notebooklm.google.com page.
 *
 * Boot sequence:
 *   1. Load storage data
 *   2. Detect current page type (home vs notebook)
 *   3. Start SPA observer for future navigation events
 *   4. Initialize UI for the current page
 *
 * On each SPA navigation, handleNavigation() is called which tears down
 * stale UI state and re-initialises for the new page.
 */

import { parseNotebookLMUrl } from '../utils/url.js';
import { waitForElement } from '../utils/dom.js';
import { logger } from '../utils/logger.js';
import { ELEMENT_WAIT_TIMEOUT_MS, TOOLBAR_ID, SIDEBAR_ID, PANEL_ID } from '../utils/constants.js';
import { storageManager } from '../storage/storageManager.js';
import { store } from '../state/store.js';
import { startObserver } from './observer.js';
import { parseNotebookCards, findNotebookGrid } from './parser.js';
import { initToolbar, setToolbarCards, updateToolbarOptions } from '../ui/toolbar.js';
import { initSidebar, updateSidebar } from '../ui/sidebar.js';
import { renderBadges } from '../ui/notebookBadges.js';
import { initNotebookPanel } from '../ui/notebookPanel.js';

// ─── Module state ─────────────────────────────────────────────────────────────

let lastUrl = '';
let cardObserver: MutationObserver | null = null;

// ─── Entry point ──────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  logger.log('NotebookLM Companion starting…');

  try {
    // 1. Load storage
    const data = await storageManager.load();

    // 2. Set initial account scope from URL
    const parsed = parseNotebookLMUrl(location.href);
    store.set('currentAccountScope', parsed.accountScope);

    // 3. Sync notebooks into store
    const notebooks = data.accounts[parsed.accountScope]?.notebooks ?? {};
    store.set('notebooks', { ...notebooks });

    // 4. Keep store in sync when storage changes (e.g. from popup import)
    storageManager.onUpdate((newData) => {
      const scope = store.get('currentAccountScope');
      store.set('notebooks', { ...(newData.accounts[scope]?.notebooks ?? {}) });
    });

    // 5. Start SPA observer
    startObserver(handleNavigation);

    // 6. Handle the initial page immediately
    await handleNavigation(location.href);
  } catch (err) {
    logger.error('init failed:', err);
  }
}

// ─── Navigation handler ───────────────────────────────────────────────────────

async function handleNavigation(url: string): Promise<void> {
  if (url === lastUrl) return;
  lastUrl = url;

  logger.log('handleNavigation:', url);

  const parsed = parseNotebookLMUrl(url);

  // Switch account scope if it changed (user navigated with different authuser)
  if (parsed.accountScope !== store.get('currentAccountScope')) {
    store.set('currentAccountScope', parsed.accountScope);
    const data = await storageManager.getData();
    store.set('notebooks', { ...(data.accounts[parsed.accountScope]?.notebooks ?? {}) });
  }

  // Tear down previous page UI
  teardown();

  if (parsed.isHome) {
    store.patch({
      currentPage: 'home',
      currentNotebookId: null,
    });
    await initHomePage();
  } else if (parsed.isNotebook && parsed.notebookId) {
    store.patch({
      currentPage: 'notebook',
      currentNotebookId: parsed.notebookId,
    });

    // Record lastOpened timestamp (fire-and-forget)
    storageManager
      .setNotebook(parsed.accountScope, parsed.notebookId, { lastOpened: Date.now() })
      .catch((err) => logger.error('lastOpened update failed:', err));

    await initNotebookPage(parsed.notebookId, parsed.accountScope);
  } else {
    store.set('currentPage', 'unknown');
    logger.log('Unknown page type, no UI injected');
  }
}

// ─── Home page ────────────────────────────────────────────────────────────────

async function initHomePage(): Promise<void> {
  logger.log('initHomePage: waiting for notebook cards…');

  // Wait for at least one notebook link to appear
  try {
    await waitForElement('a[href*="/notebook/"]', ELEMENT_WAIT_TIMEOUT_MS);
  } catch {
    logger.warn('initHomePage: no notebook cards appeared within timeout — nothing to do');
    return;
  }

  const grid = findNotebookGrid();
  if (!grid) {
    logger.warn('initHomePage: could not identify notebook grid container');
    return;
  }

  const gridParent = grid.parentElement;
  if (!gridParent) {
    logger.warn('initHomePage: grid has no parent — cannot inject toolbar');
    return;
  }

  const cards = parseNotebookCards();
  const notebooks = store.get('notebooks');
  const accountScope = store.get('currentAccountScope');

  // Inject toolbar (search / filter / sort) before the grid
  initToolbar(gridParent, grid as HTMLElement);
  setToolbarCards(cards);
  updateToolbarOptions(notebooks);

  // Inject sidebar (smart views, folders, tags)
  initSidebar(document.body);
  updateSidebar(notebooks);

  // Inject metadata badges onto each card
  renderBadges(cards, notebooks, accountScope);

  // Watch for dynamically loaded cards (infinite scroll / lazy load)
  startCardObserver(grid, accountScope);

  logger.log(`initHomePage: done (${cards.length} notebooks)`);
}

// ─── Notebook page ────────────────────────────────────────────────────────────

async function initNotebookPage(notebookId: string, accountScope: string): Promise<void> {
  logger.log(`initNotebookPage: ${notebookId}`);

  try {
    await waitForElement('main, [role="main"]', ELEMENT_WAIT_TIMEOUT_MS);
  } catch {
    logger.warn('initNotebookPage: main content not found within timeout');
    return;
  }

  const meta = await storageManager.getNotebook(accountScope, notebookId);
  initNotebookPanel(notebookId, accountScope, meta);

  logger.log('initNotebookPage: panel injected');
}

// ─── Teardown ─────────────────────────────────────────────────────────────────

function teardown(): void {
  // Disconnect card mutation observer
  if (cardObserver) {
    cardObserver.disconnect();
    cardObserver = null;
  }

  // Remove injected UI elements so they are re-created fresh on next init
  document.getElementById(TOOLBAR_ID)?.remove();
  document.getElementById(SIDEBAR_ID)?.remove();
  document.getElementById(PANEL_ID)?.remove();

  // Remove all badge elements
  document.querySelectorAll('.nlm-badge').forEach((el) => el.remove());
}

// ─── Dynamic card watcher ─────────────────────────────────────────────────────

/**
 * Watches the grid for new cards added by the SPA (e.g. after creating a notebook).
 * When new cards appear, re-runs the badge renderer for the whole list.
 */
function startCardObserver(grid: Element, accountScope: string): void {
  if (cardObserver) cardObserver.disconnect();

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  cardObserver = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const cards = parseNotebookCards();
      const notebooks = store.get('notebooks');
      setToolbarCards(cards);
      updateToolbarOptions(notebooks);
      renderBadges(cards, notebooks, accountScope);
      updateSidebar(notebooks);
    }, 400);
  });

  cardObserver.observe(grid, { childList: true, subtree: true });
}

// ─── Start ────────────────────────────────────────────────────────────────────

init();
