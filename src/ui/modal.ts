/**
 * Reusable edit modal — opened when the user clicks the "✎" badge button
 * on a notebook card.
 *
 * Returns a Promise that resolves to the updated NotebookMetadata on save,
 * or null if the user cancels.
 */

import { NotebookMetadata } from '../storage/schema.js';
import { escHtml } from '../utils/dom.js';
import { logger } from '../utils/logger.js';

export function openEditModal(
  notebookId: string,
  title: string,
  _accountScope: string,
  meta: NotebookMetadata,
): Promise<NotebookMetadata | null> {
  return new Promise((resolve) => {
    // Remove any stale modal
    document.getElementById('nlm-modal-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'nlm-modal-overlay';
    overlay.className = 'nlm-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', `Edit metadata for ${title}`);
    overlay.innerHTML = buildModalHTML(title, meta);

    document.body.appendChild(overlay);
    // Force reflow before adding --visible to enable CSS transitions
    void overlay.offsetWidth;
    overlay.classList.add('nlm-modal-overlay--visible');

    const modal = overlay.querySelector<HTMLElement>('.nlm-modal')!;

    function close(result: NotebookMetadata | null): void {
      overlay.classList.remove('nlm-modal-overlay--visible');
      setTimeout(() => overlay.remove(), 200);
      resolve(result);
    }

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(null);
    });

    modal.querySelector('.nlm-modal__close')?.addEventListener('click', () => close(null));
    modal.querySelector('.nlm-modal__cancel')?.addEventListener('click', () => close(null));

    modal.querySelector('.nlm-modal__save')?.addEventListener('click', () => {
      const updated = readValues(modal, meta);
      close(updated);
    });

    // Escape key
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close(null);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Enter in text inputs submits
    modal.querySelectorAll<HTMLInputElement>('input[type="text"]').forEach((inp) => {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const updated = readValues(modal, meta);
          close(updated);
        }
      });
    });

    // Focus first input
    setTimeout(() => modal.querySelector<HTMLInputElement>('input')?.focus(), 50);

    logger.log(`Modal opened for ${notebookId}`);
  });
}

// ─── HTML ─────────────────────────────────────────────────────────────────────

function buildModalHTML(title: string, meta: NotebookMetadata): string {
  const tags = meta.tags.join(', ');
  const colorVal = meta.color ?? '#1a73e8';

  return `
    <div class="nlm-modal">
      <div class="nlm-modal__header">
        <h2 class="nlm-modal__title" title="${escHtml(title)}">
          ✎ ${escHtml(truncate(title, 40))}
        </h2>
        <button class="nlm-modal__close" aria-label="Close">✕</button>
      </div>

      <div class="nlm-modal__body">
        <label class="nlm-label">
          <span class="nlm-label__text">Folder</span>
          <input
            type="text"
            name="folder"
            class="nlm-input"
            value="${escHtml(meta.folder ?? '')}"
            placeholder="e.g. Work, Research, Personal…"
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
            placeholder="ai, research, draft…"
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

        <div class="nlm-modal__row">
          <label class="nlm-label nlm-label--inline">
            <span class="nlm-label__text">Color</span>
            <input type="color" name="color" class="nlm-color-input" value="${escHtml(colorVal)}" />
          </label>
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
          <textarea name="note" class="nlm-textarea" rows="3" placeholder="Add a private note…">${escHtml(meta.note ?? '')}</textarea>
        </label>
      </div>

      <div class="nlm-modal__footer">
        <button class="nlm-btn nlm-modal__cancel">Cancel</button>
        <button class="nlm-btn nlm-btn--primary nlm-modal__save">Save</button>
      </div>
    </div>
  `;
}

// ─── Read form values ─────────────────────────────────────────────────────────

function readValues(modal: HTMLElement, existing: NotebookMetadata): NotebookMetadata {
  const folder = v(modal, '[name="folder"]').trim();
  const tagsRaw = v(modal, '[name="tags"]').trim();
  const status = v(modal, '[name="status"]') as NotebookMetadata['status'];
  const color = v(modal, '[name="color"]');
  const favorite = (modal.querySelector<HTMLInputElement>('[name="favorite"]')?.checked) ?? false;
  const archived = (modal.querySelector<HTMLInputElement>('[name="archived"]')?.checked) ?? false;
  const note = v(modal, '[name="note"]').trim();

  const tags = tagsRaw
    ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  return {
    ...existing,
    folder: folder || undefined,
    tags,
    status,
    color,
    favorite,
    archived,
    note: note || undefined,
    updatedAt: Date.now(),
  };
}

function v(root: HTMLElement, selector: string): string {
  return (root.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(selector)?.value) ?? '';
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}
