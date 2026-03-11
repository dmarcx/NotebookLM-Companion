/**
 * Notebook Panel — metadata editing sidebar for an open notebook page.
 *
 * Rendered as a fixed right-side panel that slides in/out.
 * All fields autosave after a short debounce; a "Saved ✓" indicator confirms.
 *
 * The panel is non-intrusive: it does not overlay notebook content —
 * it sits in a fixed z-index layer and collapses to a thin tab.
 */

import { NotebookMetadata } from '../storage/schema.js';
import { storageManager } from '../storage/storageManager.js';
import { debounce, escHtml } from '../utils/dom.js';
import { DEBOUNCE_AUTOSAVE_MS, PANEL_ID } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

// ─── Public API ───────────────────────────────────────────────────────────────

export function initNotebookPanel(
  notebookId: string,
  accountScope: string,
  meta: NotebookMetadata,
): void {
  document.getElementById(PANEL_ID)?.remove();

  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.className = 'nlm-panel nlm-panel--collapsed';
  panel.innerHTML = buildHTML(meta);

  document.body.appendChild(panel);
  bindEvents(panel, notebookId, accountScope);

  logger.log(`Notebook panel mounted for ${notebookId}`);
}

// ─── HTML ─────────────────────────────────────────────────────────────────────

function buildHTML(meta: NotebookMetadata): string {
  const tags = meta.tags.join(', ');

  return `
    <button class="nlm-panel__tab" aria-label="Toggle Companion panel" title="Toggle Companion">
      <span class="nlm-panel__tab-icon">◀</span>
      <span class="nlm-panel__tab-label">Companion</span>
    </button>

    <div class="nlm-panel__body" aria-label="Notebook companion panel">
      <div class="nlm-panel__header">
        <span class="nlm-panel__title">📚 Companion</span>
      </div>

      <div class="nlm-panel__form">

        <label class="nlm-label">
          <span class="nlm-label__text">Folder</span>
          <input
            type="text"
            name="folder"
            class="nlm-input"
            value="${escHtml(meta.folder ?? '')}"
            placeholder="e.g. Work, Research…"
            autocomplete="off"
          />
        </label>

        <label class="nlm-label">
          <span class="nlm-label__text">Tags <small>(comma-separated)</small></span>
          <input
            type="text"
            name="tags"
            class="nlm-input"
            value="${escHtml(tags)}"
            placeholder="ai, notes, draft…"
            autocomplete="off"
          />
        </label>

        <label class="nlm-label">
          <span class="nlm-label__text">Status</span>
          <select name="status" class="nlm-select">
            <option value="active"  ${meta.status === 'active'   ? 'selected' : ''}>Active</option>
            <option value="inactive"${meta.status === 'inactive' ? 'selected' : ''}>Inactive</option>
            <option value="archived"${meta.status === 'archived' ? 'selected' : ''}>Archived</option>
          </select>
        </label>

        <label class="nlm-label nlm-label--color-row">
          <span class="nlm-label__text">Color</span>
          <input
            type="color"
            name="color"
            class="nlm-color-input"
            value="${escHtml(meta.color ?? '#1a73e8')}"
            title="Pick a color for this notebook"
          />
        </label>

        <div class="nlm-panel__checkboxes">
          <label class="nlm-label nlm-label--checkbox">
            <input type="checkbox" name="favorite" ${meta.favorite ? 'checked' : ''} />
            <span>★ Favorite</span>
          </label>
          <label class="nlm-label nlm-label--checkbox">
            <input type="checkbox" name="archived" ${meta.archived ? 'checked' : ''} />
            <span>🗄 Archived</span>
          </label>
        </div>

        <label class="nlm-label">
          <span class="nlm-label__text">Note</span>
          <textarea
            name="note"
            class="nlm-textarea"
            rows="4"
            placeholder="Add a private note about this notebook…"
          >${escHtml(meta.note ?? '')}</textarea>
        </label>

        <div class="nlm-panel__saved-indicator" aria-live="polite"></div>
      </div>
    </div>
  `;
}

// ─── Events ───────────────────────────────────────────────────────────────────

function bindEvents(panel: HTMLElement, notebookId: string, accountScope: string): void {
  const tab = panel.querySelector<HTMLButtonElement>('.nlm-panel__tab')!;
  const tabIcon = tab.querySelector<HTMLSpanElement>('.nlm-panel__tab-icon')!;
  const savedIndicator = panel.querySelector<HTMLElement>('.nlm-panel__saved-indicator')!;

  // Toggle collapse
  tab.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('nlm-panel--collapsed');
    tabIcon.textContent = collapsed ? '◀' : '▶';
    tab.setAttribute('aria-expanded', String(!collapsed));
  });

  // Autosave with debounce
  const save = debounce(async () => {
    const values = readFormValues(panel);
    try {
      await storageManager.setNotebook(accountScope, notebookId, values);
      showSaved(savedIndicator);
    } catch (err) {
      logger.error('Panel autosave failed:', err);
      savedIndicator.textContent = 'Save failed ✗';
      savedIndicator.className = 'nlm-panel__saved-indicator nlm-panel__saved-indicator--error';
    }
  }, DEBOUNCE_AUTOSAVE_MS);

  panel.querySelector('.nlm-panel__form')?.addEventListener('input', save);
  panel.querySelector('.nlm-panel__form')?.addEventListener('change', save);
}

function readFormValues(panel: HTMLElement): Partial<NotebookMetadata> {
  const folder = qv(panel, '[name="folder"]').trim();
  const tagsRaw = qv(panel, '[name="tags"]').trim();
  const status = qv(panel, '[name="status"]') as NotebookMetadata['status'];
  const color = qv(panel, '[name="color"]');
  const favorite = panel.querySelector<HTMLInputElement>('[name="favorite"]')?.checked ?? false;
  const archived = panel.querySelector<HTMLInputElement>('[name="archived"]')?.checked ?? false;
  const note = qv(panel, '[name="note"]').trim();

  const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [];

  return {
    folder: folder || undefined,
    tags,
    status,
    color: color || undefined,
    favorite,
    archived,
    note: note || undefined,
  };
}

function qv(root: HTMLElement, selector: string): string {
  return (
    (root.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(selector)?.value) ?? ''
  );
}

function showSaved(el: HTMLElement): void {
  el.textContent = 'Saved ✓';
  el.className = 'nlm-panel__saved-indicator nlm-panel__saved-indicator--visible';
  setTimeout(() => {
    el.className = 'nlm-panel__saved-indicator';
    el.textContent = '';
  }, 2500);
}
