/**
 * Safe DOM utilities.
 * All query functions wrap selectors in try/catch and log failures gracefully.
 */

import { logger } from './logger.js';
import { ELEMENT_WAIT_TIMEOUT_MS, ELEMENT_POLL_INTERVAL_MS } from './constants.js';

// ─── Safe querying ────────────────────────────────────────────────────────────

/**
 * querySelector with fallback selectors and graceful error handling.
 * Logs which fallback was used (if any) for debugging selector drift.
 */
export function safeQuery<T extends Element>(
  root: Element | Document,
  selector: string,
  fallbacks: string[] = [],
): T | null {
  const candidates = [selector, ...fallbacks];
  for (const sel of candidates) {
    try {
      const el = root.querySelector<T>(sel);
      if (el) {
        if (sel !== selector) {
          logger.log(`safeQuery: fallback selector used: "${sel}" (primary: "${selector}")`);
        }
        return el;
      }
    } catch (err) {
      logger.warn(`safeQuery: invalid selector "${sel}"`, err);
    }
  }
  return null;
}

/**
 * querySelectorAll with fallback selectors.
 * Returns the first non-empty NodeList result across all candidate selectors.
 */
export function safeQueryAll<T extends Element>(
  root: Element | Document,
  selector: string,
  fallbacks: string[] = [],
): T[] {
  const candidates = [selector, ...fallbacks];
  for (const sel of candidates) {
    try {
      const els = Array.from(root.querySelectorAll<T>(sel));
      if (els.length > 0) {
        if (sel !== selector) {
          logger.log(`safeQueryAll: fallback selector used: "${sel}" (primary: "${selector}")`);
        }
        return els;
      }
    } catch (err) {
      logger.warn(`safeQueryAll: invalid selector "${sel}"`, err);
    }
  }
  return [];
}

// ─── Async waiting ────────────────────────────────────────────────────────────

/**
 * Polls the DOM until the selector matches or the timeout expires.
 * Rejects with an Error on timeout so callers can handle gracefully.
 */
export function waitForElement(
  selector: string,
  timeout = ELEMENT_WAIT_TIMEOUT_MS,
): Promise<Element> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const deadline = Date.now() + timeout;
    const interval = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(interval);
        resolve(el);
        return;
      }
      if (Date.now() > deadline) {
        clearInterval(interval);
        reject(new Error(`waitForElement: timed out waiting for "${selector}"`));
      }
    }, ELEMENT_POLL_INTERVAL_MS);
  });
}

// ─── Injection guard ─────────────────────────────────────────────────────────

/**
 * Ensures an element with the given id is only injected once.
 * If it already exists, returns the existing element.
 * Otherwise calls factory(), sets its id, appends to container, and returns it.
 */
export function injectOnce(
  id: string,
  factory: () => HTMLElement,
  container: Element,
): HTMLElement {
  const existing = document.getElementById(id);
  if (existing) return existing;
  const el = factory();
  el.id = id;
  container.appendChild(el);
  return el;
}

// ─── Debounce ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function (this: unknown, ...args: Parameters<T>) {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

// ─── HTML escaping ────────────────────────────────────────────────────────────

/** Escape a string for safe insertion into HTML attribute values or text content. */
export function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── Element creation ─────────────────────────────────────────────────────────

/** Convenience helper to create a typed element with optional attributes. */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  return el;
}
