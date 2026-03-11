/**
 * Lightweight observable state store — no external dependencies.
 *
 * Pattern:
 *   store.set('searchQuery', 'my query');
 *   const unsub = store.subscribe('searchQuery', (val) => console.log(val));
 *   unsub(); // stop listening
 *
 * Components read state with store.get() and react to changes via subscribe().
 * The store does NOT trigger re-renders automatically — each subscriber is
 * responsible for updating the DOM.
 */

import { NotebookMetadata } from '../storage/schema.js';
import { DEFAULT_ACCOUNT_SCOPE } from '../utils/constants.js';

// ─── State shape ──────────────────────────────────────────────────────────────

export interface StoreState {
  /** Which page type is currently active. */
  currentPage: 'home' | 'notebook' | 'unknown';
  /** The open notebook's ID (null on home page). */
  currentNotebookId: string | null;
  /** Active account scope, e.g. "authuser:1". */
  currentAccountScope: string;
  /** All notebook metadata for the current account (loaded from storage). */
  notebooks: Record<string, NotebookMetadata>;

  // ── Filter / search state (home page toolbar) ───────────────────────────────
  searchQuery: string;
  filterFolder: string | null;
  filterTag: string | null;
  filterStatus: 'active' | 'inactive' | 'archived' | null;
  filterFavorite: boolean;
  sortBy: 'updatedAt' | 'createdAt' | 'lastOpened' | 'name';
  sortDir: 'asc' | 'desc';

  // ── UI state ────────────────────────────────────────────────────────────────
  sidebarOpen: boolean;
}

// ─── Store implementation ─────────────────────────────────────────────────────

type Listener<T> = (value: T) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyListener = Listener<any>;

class Store {
  private state: StoreState = {
    currentPage: 'unknown',
    currentNotebookId: null,
    currentAccountScope: DEFAULT_ACCOUNT_SCOPE,
    notebooks: {},

    searchQuery: '',
    filterFolder: null,
    filterTag: null,
    filterStatus: null,
    filterFavorite: false,
    sortBy: 'updatedAt',
    sortDir: 'desc',

    sidebarOpen: false,
  };

  private keyListeners = new Map<keyof StoreState, Set<AnyListener>>();
  private allListeners = new Set<Listener<StoreState>>();

  // ─── Read ──────────────────────────────────────────────────────────────────

  get<K extends keyof StoreState>(key: K): StoreState[K] {
    return this.state[key];
  }

  getState(): Readonly<StoreState> {
    return { ...this.state };
  }

  // ─── Write ─────────────────────────────────────────────────────────────────

  set<K extends keyof StoreState>(key: K, value: StoreState[K]): void {
    // Skip if value is unchanged (shallow equality for primitives/references)
    if (this.state[key] === value) return;
    this.state[key] = value;

    // Notify per-key subscribers
    const keySet = this.keyListeners.get(key);
    if (keySet) {
      for (const cb of keySet) cb(value);
    }

    // Notify all-state subscribers with a snapshot
    const snapshot = { ...this.state };
    for (const cb of this.allListeners) cb(snapshot);
  }

  /** Batch-update multiple keys, triggering all-state listeners only once. */
  patch(updates: Partial<StoreState>): void {
    let changed = false;
    for (const [k, v] of Object.entries(updates) as [keyof StoreState, StoreState[keyof StoreState]][]) {
      if (this.state[k] !== v) {
        this.state[k] = v as never;
        changed = true;

        const keySet = this.keyListeners.get(k);
        if (keySet) {
          for (const cb of keySet) cb(v);
        }
      }
    }

    if (changed) {
      const snapshot = { ...this.state };
      for (const cb of this.allListeners) cb(snapshot);
    }
  }

  // ─── Subscribe ─────────────────────────────────────────────────────────────

  /**
   * Subscribe to changes of a specific key.
   * Returns an unsubscribe function.
   */
  subscribe<K extends keyof StoreState>(
    key: K,
    cb: Listener<StoreState[K]>,
  ): () => void {
    if (!this.keyListeners.has(key)) {
      this.keyListeners.set(key, new Set());
    }
    const set = this.keyListeners.get(key)!;
    set.add(cb as AnyListener);
    return () => set.delete(cb as AnyListener);
  }

  /**
   * Subscribe to any state change.
   * The callback receives a shallow copy of the full state.
   * Returns an unsubscribe function.
   */
  subscribeAll(cb: Listener<StoreState>): () => void {
    this.allListeners.add(cb);
    return () => this.allListeners.delete(cb);
  }

  /** Reset filter-related state to defaults. */
  resetFilters(): void {
    this.patch({
      searchQuery: '',
      filterFolder: null,
      filterTag: null,
      filterStatus: null,
      filterFavorite: false,
    });
  }
}

/** Singleton store — import this everywhere state access is needed. */
export const store = new Store();
