/**
 * Background Service Worker (MV3).
 *
 * Responsibilities:
 *   • Handle messages from content scripts and popup (export, import, stats, CRUD)
 *   • Update the extension action badge with the favorite count
 *
 * Because the service worker may be terminated and restarted at any time,
 * no persistent in-memory state should be stored here beyond the request cycle.
 */

import { storageManager } from '../storage/storageManager.js';
import { ExtensionMessage } from '../storage/schema.js';
import { logger } from '../utils/logger.js';

// ─── Message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    logger.log('SW received:', message.type);

    // Handle async inside the listener — return true to keep channel open
    handleMessage(message)
      .then(sendResponse)
      .catch((err) => {
        logger.error('SW message handler error:', err);
        sendResponse({ error: String(err) });
      });

    return true; // Keep the message channel open for async response
  },
);

async function handleMessage(msg: ExtensionMessage): Promise<unknown> {
  switch (msg.type) {
    case 'EXPORT_DATA': {
      const json = await storageManager.exportData();
      return { json };
    }

    case 'IMPORT_DATA': {
      await storageManager.importData(msg.payload);
      await updateBadge();
      return { success: true };
    }

    case 'GET_STATS': {
      return storageManager.getStats(msg.accountScope);
    }

    case 'GET_NOTEBOOKS': {
      const notebooks = await storageManager.getAllNotebooks(msg.accountScope);
      return { notebooks };
    }

    case 'SET_NOTEBOOK': {
      await storageManager.setNotebook(msg.accountScope, msg.notebookId, msg.meta);
      await updateBadge();
      return { success: true };
    }

    default:
      return { error: `Unknown message type` };
  }
}

// ─── Badge ────────────────────────────────────────────────────────────────────

/** Updates the extension icon badge with the total favorite count. */
async function updateBadge(): Promise<void> {
  try {
    storageManager.invalidateCache();
    const stats = await storageManager.getStats();
    if (stats.totalFavorites > 0) {
      await chrome.action.setBadgeText({ text: String(stats.totalFavorites) });
      await chrome.action.setBadgeBackgroundColor({ color: '#1a73e8' });
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch (err) {
    logger.error('updateBadge failed:', err);
  }
}

// ─── Storage change listener ──────────────────────────────────────────────────

// Also update badge when storage changes externally
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === 'local') {
    storageManager.invalidateCache();
    updateBadge().catch((err) => logger.error('storage.onChanged badge update failed:', err));
  }
});

// ─── Lifecycle ────────────────────────────────────────────────────────────────

// Update badge on service worker startup (e.g. after browser restart)
chrome.runtime.onStartup.addListener(() => {
  updateBadge().catch((err) => logger.error('onStartup badge update failed:', err));
});

chrome.runtime.onInstalled.addListener(({ reason }) => {
  logger.log('Extension installed/updated:', reason);
  updateBadge().catch(() => {/* ignore */});
});
