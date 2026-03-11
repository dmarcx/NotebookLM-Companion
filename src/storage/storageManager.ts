/**
 * StorageManager — the single access point for all persistent data.
 *
 * Uses chrome.storage.local under the hood.
 * All reads go through the in-memory cache after the first load.
 * Writes update the cache and persist to storage atomically.
 *
 * Callers can subscribe to updates via onUpdate().
 */

import {
  StorageData,
  AccountData,
  NotebookMetadata,
  StatsResult,
  createDefaultMetadata,
} from './schema.js';
import { migrate } from './migration.js';
import { STORAGE_KEY } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

type UpdateCallback = (data: StorageData) => void;

class StorageManager {
  private cache: StorageData | null = null;
  private listeners = new Set<UpdateCallback>();

  // ─── Low-level chrome.storage wrappers ──────────────────────────────────────

  private readRaw(): Promise<unknown> {
    return new Promise((resolve) => {
      chrome.storage.local.get(STORAGE_KEY, (result) => {
        resolve(result[STORAGE_KEY]);
      });
    });
  }

  private writeRaw(data: StorageData): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [STORAGE_KEY]: data }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  /**
   * Loads data from storage (with migration) and caches it.
   * Always call this once at startup before other operations.
   */
  async load(): Promise<StorageData> {
    const raw = await this.readRaw();
    this.cache = migrate(raw);
    logger.log('Storage loaded:', Object.keys(this.cache.accounts).length, 'accounts');
    return this.cache;
  }

  /** Returns the raw cached data (loads first if not yet loaded). */
  async getData(): Promise<StorageData> {
    if (!this.cache) return this.load();
    return this.cache;
  }

  /** Retrieves metadata for a single notebook. Returns default if not found. */
  async getNotebook(accountScope: string, notebookId: string): Promise<NotebookMetadata> {
    const data = await this.getData();
    return data.accounts[accountScope]?.notebooks[notebookId] ?? createDefaultMetadata();
  }

  /**
   * Writes (upserts) metadata for a notebook.
   * Deep-merges the partial update with existing data, sets updatedAt.
   */
  async setNotebook(
    accountScope: string,
    notebookId: string,
    meta: Partial<NotebookMetadata>,
  ): Promise<void> {
    const data = await this.getData();
    const account = this.ensureAccount(data, accountScope);
    const existing = account.notebooks[notebookId] ?? createDefaultMetadata();

    account.notebooks[notebookId] = {
      ...existing,
      ...meta,
      updatedAt: Date.now(),
    };

    this.cache = data;
    await this.writeRaw(data);
    this.emit(data);
    logger.log(`setNotebook: saved ${notebookId} in ${accountScope}`);
  }

  /** Returns all notebook metadata for the given account scope. */
  async getAllNotebooks(accountScope: string): Promise<Record<string, NotebookMetadata>> {
    const data = await this.getData();
    return { ...(data.accounts[accountScope]?.notebooks ?? {}) };
  }

  /** Removes a notebook record from storage. */
  async deleteNotebook(accountScope: string, notebookId: string): Promise<void> {
    const data = await this.getData();
    const account = data.accounts[accountScope];
    if (!account?.notebooks[notebookId]) return;

    delete account.notebooks[notebookId];
    this.cache = data;
    await this.writeRaw(data);
    this.emit(data);
  }

  /** Serialises all data to a pretty-printed JSON string. */
  async exportData(): Promise<string> {
    const data = await this.getData();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Parses, migrates, and replaces all stored data with the imported JSON.
   * Throws on invalid JSON.
   */
  async importData(json: string): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Import failed: not valid JSON.');
    }

    const migrated = migrate(parsed);
    this.cache = migrated;
    await this.writeRaw(migrated);
    this.emit(migrated);
    logger.log('importData: import successful');
  }

  /** Returns summary statistics across all (or a specific) account. */
  async getStats(accountScope?: string): Promise<StatsResult> {
    const data = await this.getData();

    const notebooksToCount: Record<string, NotebookMetadata> = {};

    if (accountScope) {
      Object.assign(notebooksToCount, data.accounts[accountScope]?.notebooks ?? {});
    } else {
      for (const account of Object.values(data.accounts)) {
        Object.assign(notebooksToCount, account.notebooks);
      }
    }

    const folders = new Set<string>();
    const tags = new Set<string>();
    let favorites = 0;

    for (const meta of Object.values(notebooksToCount)) {
      if (meta.folder) folders.add(meta.folder);
      meta.tags.forEach((t) => tags.add(t));
      if (meta.favorite) favorites++;
    }

    return {
      totalNotebooks: Object.keys(notebooksToCount).length,
      totalFavorites: favorites,
      totalFolders: folders.size,
      totalTags: tags.size,
      accounts: Object.keys(data.accounts),
    };
  }

  /**
   * Registers a callback that is called after every write.
   * Returns an unsubscribe function.
   */
  onUpdate(cb: UpdateCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** Clears the in-memory cache (forces next read to hit chrome.storage). */
  invalidateCache(): void {
    this.cache = null;
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private ensureAccount(data: StorageData, accountScope: string): AccountData {
    if (!data.accounts[accountScope]) {
      data.accounts[accountScope] = { notebooks: {} };
    }
    return data.accounts[accountScope];
  }

  private emit(data: StorageData): void {
    for (const cb of this.listeners) {
      try {
        cb(data);
      } catch (err) {
        logger.error('StorageManager listener error:', err);
      }
    }
  }
}

/** Singleton instance — import this everywhere storage access is needed. */
export const storageManager = new StorageManager();
