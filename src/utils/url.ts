/**
 * URL parsing utilities for NotebookLM URLs.
 *
 * Notebook URL format:
 *   https://notebooklm.google.com/notebook/<uuid>?authuser=<n>
 *
 * notebookId  = UUID after /notebook/
 * accountScope = "authuser:" + authuser param value (defaults to "0")
 */

import { DEFAULT_ACCOUNT_SCOPE } from './constants.js';

export interface ParsedUrl {
  /** The notebook UUID, or null if not on a notebook page. */
  notebookId: string | null;
  /** e.g. "authuser:1" — used as the storage key for multi-account support. */
  accountScope: string;
  /** True when on the NotebookLM home page (no /notebook/ segment). */
  isHome: boolean;
  /** True when on an individual notebook page. */
  isNotebook: boolean;
}

const NOTEBOOKLM_HOST = 'notebooklm.google.com';
const NOTEBOOK_ID_RE = /\/notebook\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

const EMPTY: ParsedUrl = {
  notebookId: null,
  accountScope: DEFAULT_ACCOUNT_SCOPE,
  isHome: false,
  isNotebook: false,
};

export function parseNotebookLMUrl(rawUrl: string): ParsedUrl {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ...EMPTY };
  }

  if (url.hostname !== NOTEBOOKLM_HOST) {
    return { ...EMPTY };
  }

  const notebookMatch = url.pathname.match(NOTEBOOK_ID_RE);
  const notebookId = notebookMatch ? notebookMatch[1].toLowerCase() : null;

  const authuser = url.searchParams.get('authuser') ?? '0';
  const accountScope = `authuser:${authuser}`;

  const isNotebook = notebookId !== null;
  // Home: the path is "/" or "" (no /notebook/ segment)
  const isHome = !isNotebook && (url.pathname === '/' || url.pathname === '' || url.pathname === '/home');

  return { notebookId, accountScope, isHome, isNotebook };
}

/**
 * Extracts a notebook ID from a relative href such as "/notebook/<uuid>".
 * Returns null if not a valid notebook URL segment.
 */
export function extractNotebookIdFromHref(href: string): string | null {
  const match = href.match(NOTEBOOK_ID_RE);
  return match ? match[1].toLowerCase() : null;
}
