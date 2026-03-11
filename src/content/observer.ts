/**
 * SPA Navigation Observer.
 *
 * NotebookLM is a single-page application (Angular) that uses the History API
 * for navigation. The browser does NOT fire a full page reload when moving
 * between pages. We therefore intercept:
 *
 *   1. history.pushState / history.replaceState (most navigations)
 *   2. window.popstate (browser back / forward)
 *   3. document.title mutations (belt-and-suspenders fallback)
 *
 * All events are debounced to avoid double-firing when the SPA makes
 * multiple consecutive history calls for the same navigation.
 */

import { debounce } from '../utils/dom.js';
import { DEBOUNCE_OBSERVER_MS } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

export type NavigateCallback = (url: string) => void;

export function startObserver(onNavigate: NavigateCallback): void {
  const notify = debounce((url: string) => {
    logger.log('Navigation →', url);
    onNavigate(url);
  }, DEBOUNCE_OBSERVER_MS);

  // ── 1. Intercept history.pushState ──────────────────────────────────────────
  const originalPush = history.pushState.bind(history);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (history as any).pushState = function (...args: Parameters<typeof history.pushState>) {
    originalPush(...args);
    notify(location.href);
  };

  // ── 2. Intercept history.replaceState ───────────────────────────────────────
  const originalReplace = history.replaceState.bind(history);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (history as any).replaceState = function (...args: Parameters<typeof history.replaceState>) {
    originalReplace(...args);
    notify(location.href);
  };

  // ── 3. Back / forward navigation ────────────────────────────────────────────
  window.addEventListener('popstate', () => notify(location.href));

  // ── 4. Title change as last-resort fallback ─────────────────────────────────
  // Angular may update <title> on every route change even without a history push.
  let lastTitle = document.title;
  const titleEl = document.querySelector('head > title');
  if (titleEl) {
    new MutationObserver(() => {
      if (document.title !== lastTitle) {
        lastTitle = document.title;
        notify(location.href);
      }
    }).observe(titleEl, { childList: true, characterData: true, subtree: true });
  }

  logger.log('SPA observer initialised');
}
