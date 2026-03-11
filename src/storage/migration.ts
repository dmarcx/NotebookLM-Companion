/**
 * Schema migration for NotebookLM Companion storage.
 *
 * When the stored data has a lower version than SCHEMA_VERSION,
 * it is upgraded through sequential migration steps.
 *
 * To add a new migration:
 *   1. Increment SCHEMA_VERSION in constants.ts
 *   2. Add a migrateVN_to_VN+1() function below
 *   3. Add a `if (version < N+1)` block in migrate()
 */

import { StorageData, createEmptyStorageData } from './schema.js';
import { SCHEMA_VERSION } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

/**
 * Takes raw storage data (possibly undefined, null, or an old schema version)
 * and returns a fully valid StorageData at the current schema version.
 * Never throws — always returns something usable.
 */
export function migrate(raw: unknown): StorageData {
  if (raw === null || raw === undefined || typeof raw !== 'object') {
    logger.log('migration: no existing data — initialising fresh schema');
    return createEmptyStorageData();
  }

  const data = raw as Record<string, unknown>;
  const version = typeof data['version'] === 'number' ? data['version'] : 0;

  let result: StorageData = data as unknown as StorageData;

  if (version < 1) {
    logger.log('migration: v0 → v1');
    result = migrateV0toV1(data);
  }

  // Future: if (version < 2) { result = migrateV1toV2(result); }

  result.version = SCHEMA_VERSION;
  return result;
}

/**
 * v0 had no account scoping — notebooks lived at the top level.
 * Wrap them under the default account scope.
 */
function migrateV0toV1(old: Record<string, unknown>): StorageData {
  const fresh = createEmptyStorageData();

  if (old['notebooks'] && typeof old['notebooks'] === 'object' && !Array.isArray(old['notebooks'])) {
    fresh.accounts['authuser:0'] = {
      notebooks: old['notebooks'] as Record<string, never>,
    };
  }

  return fresh;
}
