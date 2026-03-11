/**
 * NotebookLM DOM Parser.
 *
 * ⚠️  ALL selectors that target NotebookLM's own DOM are isolated in this file.
 *
 * NotebookLM is an Angular SPA hosted by Google. Its DOM structure and CSS class
 * names may change without notice. If the extension stops working after a
 * NotebookLM update, inspect the page in Chrome DevTools and update the
 * SELECTORS object and/or the parsing logic below.
 *
 * HOW TO UPDATE SELECTORS:
 *   1. Open https://notebooklm.google.com in Chrome.
 *   2. Right-click a notebook card → Inspect.
 *   3. Find the anchor element whose href contains "/notebook/<uuid>".
 *   4. Identify the outermost card wrapper element.
 *   5. Update SELECTORS.notebookCard (and CARD_CONTAINER_STRATEGIES if needed).
 */

import { logger } from '../utils/logger.js';
import { extractNotebookIdFromHref } from '../utils/url.js';

// ─── Selector registry ────────────────────────────────────────────────────────

/**
 * All NotebookLM DOM selectors in one place.
 * Each value is a comma-separated CSS selector list (tried left-to-right).
 */
export const SELECTORS = {
  /**
   * The container that holds all notebook cards on the home page.
   * We inject the toolbar immediately before this element.
   */
  notebookGrid: [
    '.notebook-list',
    '[class*="NotebookList"]',
    '[class*="notebook-list"]',
    '[data-testid="notebook-list"]',
    'main > div',
    'main',
  ].join(', '),

  /**
   * Individual notebook card elements.
   * Strategy: find all anchors with /notebook/ in href — these are the most
   * reliable signal that a card is a notebook link, regardless of class names.
   */
  notebookCardAnchor: 'a[href*="/notebook/"]',

  /**
   * Title element within a card.
   * Tried in order until one yields a non-empty text node.
   */
  cardTitleSelectors: ['h3', 'h2', '[class*="title"]', '[class*="Title"]', 'strong', 'p'],

  /**
   * The main content area on an open notebook page.
   * Used as the anchor point for injecting the side panel.
   */
  notebookMainContent: [
    'main',
    '[role="main"]',
    '[class*="notebook-view"]',
    '[class*="NotebookView"]',
    '[class*="main-content"]',
  ].join(', '),
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedCard {
  /** The outermost DOM element representing the card (used for badge injection). */
  element: Element;
  /** Notebook UUID extracted from the card's href. */
  notebookId: string;
  /** Display title of the notebook. */
  title: string;
  /** The raw href value of the notebook anchor. */
  href: string;
}

// ─── Card parsing ─────────────────────────────────────────────────────────────

/**
 * Finds all notebook card anchors on the home page and returns parsed metadata.
 * Returns [] if nothing is found (e.g. page hasn't loaded yet or selectors changed).
 */
export function parseNotebookCards(): ParsedCard[] {
  try {
    const anchors = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(SELECTORS.notebookCardAnchor),
    );

    if (anchors.length === 0) {
      logger.warn('parseNotebookCards: no notebook anchor links found. Selectors may need updating.');
      return [];
    }

    const seen = new Set<string>();
    const cards: ParsedCard[] = [];

    for (const anchor of anchors) {
      const href = anchor.getAttribute('href') ?? '';
      const notebookId = extractNotebookIdFromHref(href);
      if (!notebookId || seen.has(notebookId)) continue;
      seen.add(notebookId);

      const container = findCardContainer(anchor);
      const title = extractTitle(container) || extractTitle(anchor) || 'Untitled';

      cards.push({ element: container, notebookId, title, href });
    }

    logger.log(`parseNotebookCards: found ${cards.length} notebooks`);
    return cards;
  } catch (err) {
    logger.error('parseNotebookCards threw:', err);
    return [];
  }
}

/**
 * Extracts a notebook ID from a DOM element by checking:
 *   1. data-notebook-id attribute
 *   2. href attribute
 *   3. href of a descendant anchor
 */
export function extractNotebookIdFromElement(el: Element): string | null {
  // data attribute
  const dataId = el.getAttribute('data-notebook-id');
  if (dataId && /^[0-9a-f-]{36}$/i.test(dataId)) return dataId.toLowerCase();

  // own href
  const href = el.getAttribute('href') ?? '';
  const fromHref = extractNotebookIdFromHref(href);
  if (fromHref) return fromHref;

  // descendant anchor
  const childAnchor = el.querySelector<HTMLAnchorElement>('a[href*="/notebook/"]');
  if (childAnchor) {
    return extractNotebookIdFromHref(childAnchor.getAttribute('href') ?? '');
  }

  return null;
}

/**
 * Attempts to find the outermost "card" wrapper for a given notebook anchor.
 *
 * Walks up the DOM looking for natural card boundaries:
 *   - <li> or <article> elements
 *   - Elements whose class name contains "card", "item", "notebook"
 *   - Stops after 6 levels to avoid walking too far up
 */
function findCardContainer(anchor: Element): Element {
  let current: Element | null = anchor.parentElement;
  let depth = 0;
  const MAX_DEPTH = 6;

  while (current && depth < MAX_DEPTH) {
    const tag = current.tagName.toLowerCase();
    if (tag === 'li' || tag === 'article') return current;

    const cls = typeof current.className === 'string' ? current.className.toLowerCase() : '';
    if (cls.includes('card') || cls.includes('item') || cls.includes('notebook')) {
      return current;
    }

    current = current.parentElement;
    depth++;
  }

  // Fallback: use the immediate parent of the anchor
  return anchor.parentElement ?? anchor;
}

/** Extracts visible text from the first matching title selector inside an element. */
function extractTitle(root: Element): string {
  for (const sel of SELECTORS.cardTitleSelectors) {
    try {
      const el = root.querySelector(sel);
      const text = el?.textContent?.trim();
      if (text) return text.slice(0, 100);
    } catch {
      // ignore invalid selector
    }
  }
  return '';
}

// ─── Grid detection ───────────────────────────────────────────────────────────

/**
 * Finds the container element that holds all notebook cards.
 * First tries the configured selectors; falls back to the common ancestor
 * of the first few notebook anchor links.
 */
export function findNotebookGrid(): Element | null {
  // Strategy 1: configured selectors
  const selList = SELECTORS.notebookGrid.split(',').map((s) => s.trim());
  for (const sel of selList) {
    try {
      const el = document.querySelector(sel);
      if (el && el.querySelector('a[href*="/notebook/"]')) {
        return el;
      }
    } catch {
      // ignore
    }
  }

  // Strategy 2: parent of the first notebook anchor
  const firstAnchor = document.querySelector<HTMLAnchorElement>('a[href*="/notebook/"]');
  if (firstAnchor) {
    return firstAnchor.closest('ul, ol, div[class], main') ?? firstAnchor.parentElement;
  }

  return null;
}
