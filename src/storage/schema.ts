/**
 * Storage schema types for NotebookLM Companion.
 *
 * All data lives in chrome.storage.local under STORAGE_KEY.
 * The `version` field drives schema migrations.
 */

// ─── Core data types ──────────────────────────────────────────────────────────

export interface NotebookMetadata {
  /** Optional folder name for grouping notebooks. */
  folder?: string;
  /** User-defined tags. */
  tags: string[];
  /** Workflow status. */
  status: 'active' | 'inactive' | 'archived';
  /** Hex color string, e.g. "#1a73e8". */
  color?: string;
  /** Whether this notebook is starred as a favorite. */
  favorite: boolean;
  /** Free-form note / description. */
  note?: string;
  /** Whether the notebook is archived (hidden from default views). */
  archived: boolean;
  /** Timestamp (ms) when this metadata record was first created. */
  createdAt: number;
  /** Timestamp (ms) of the last metadata update. */
  updatedAt: number;
  /** Timestamp (ms) of the last time the notebook page was opened. */
  lastOpened?: number;
}

export interface AccountData {
  /** Map of notebookId → metadata. */
  notebooks: Record<string, NotebookMetadata>;
}

export interface StorageData {
  /** Schema version. Used for migrations. */
  version: number;
  /** Map of accountScope (e.g. "authuser:1") → account data. */
  accounts: Record<string, AccountData>;
}

// ─── Message protocol (content ↔ background ↔ popup) ─────────────────────────

export type ExtensionMessage =
  | { type: 'EXPORT_DATA' }
  | { type: 'IMPORT_DATA'; payload: string }
  | { type: 'GET_STATS'; accountScope?: string }
  | { type: 'GET_NOTEBOOKS'; accountScope: string }
  | { type: 'SET_NOTEBOOK'; accountScope: string; notebookId: string; meta: Partial<NotebookMetadata> };

export interface StatsResult {
  totalNotebooks: number;
  totalFavorites: number;
  totalFolders: number;
  totalTags: number;
  /** All accountScope strings present in storage. */
  accounts: string[];
}

// ─── Factory functions ────────────────────────────────────────────────────────

export function createDefaultMetadata(): NotebookMetadata {
  const now = Date.now();
  return {
    tags: [],
    status: 'active',
    favorite: false,
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function createEmptyStorageData(): StorageData {
  return {
    version: 1,
    accounts: {},
  };
}
