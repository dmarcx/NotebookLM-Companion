/**
 * Companion Sidebar — Smart Views & Navigation Panel.
 *
 * Fixed overlay panel on the left side of the home page.
 * Toggled by the toolbar's "≡ Views" button.
 *
 * Sections:
 *   • Smart Views (All, Favorites, Active, Archived, Recent)
 *   • Folders (dynamically built from metadata)
 *   • Tags (tag pills from metadata)
 */

import { store } from '../state/store.js';
import { NotebookMetadata } from '../storage/schema.js';
import { escHtml } from '../utils/dom.js';
import { SIDEBAR_ID } from '../utils/constants.js';
import { logger } from '../utils/logger.js';
import { applyFilters } from './toolbar.js';

let sidebarEl: HTMLElement | null = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/** Inject the sidebar into the given container (typically document.body). */
export function initSidebar(container: HTMLElement): void {
  document.getElementById(SIDEBAR_ID)?.remove();

  sidebarEl = document.createElement('div');
  sidebarEl.id = SIDEBAR_ID;
  sidebarEl.className = 'nlm-sidebar';
  sidebarEl.setAttribute('aria-label', 'Notebook Companion sidebar');
  sidebarEl.innerHTML = buildHTML();

  container.appendChild(sidebarEl);

  bindEvents();

  // React to sidebarOpen state (toggled by toolbar button)
  store.subscribe('sidebarOpen', (open) => {
    sidebarEl?.classList.toggle('nlm-sidebar--open', open);
  });

  logger.log('Sidebar injected');
}

/** Rebuild the Folders and Tags sections from current metadata. */
export function updateSidebar(notebooks: Record<string, NotebookMetadata>): void {
  if (!sidebarEl) return;

  const folders = new Map<string, number>();
  const tags = new Map<string, number>();

  for (const meta of Object.values(notebooks)) {
    if (meta.folder) {
      folders.set(meta.folder, (folders.get(meta.folder) ?? 0) + 1);
    }
    for (const tag of meta.tags) {
      tags.set(tag, (tags.get(tag) ?? 0) + 1);
    }
  }

  renderFolders(folders);
  renderTags(tags);
}

// ─── HTML ─────────────────────────────────────────────────────────────────────

function buildHTML(): string {
  return `
    <div class="nlm-sidebar__inner">
      <div class="nlm-sidebar__header">
        <span class="nlm-sidebar__title">📚 Companion</span>
        <button class="nlm-sidebar__close" aria-label="Close sidebar" title="Close">✕</button>
      </div>

      <nav class="nlm-sidebar__section" aria-label="Smart views">
        <h3 class="nlm-sidebar__section-title">Smart Views</h3>
        <div class="nlm-view-list">
          <button class="nlm-view-btn nlm-view-btn--active" data-view="all">
            <span class="nlm-view-icon">📚</span> All Notebooks
          </button>
          <button class="nlm-view-btn" data-view="favorites">
            <span class="nlm-view-icon">★</span> Favorites
          </button>
          <button class="nlm-view-btn" data-view="active">
            <span class="nlm-view-icon">✓</span> Active
          </button>
          <button class="nlm-view-btn" data-view="archived">
            <span class="nlm-view-icon">🗄</span> Archived
          </button>
          <button class="nlm-view-btn" data-view="recent">
            <span class="nlm-view-icon">🕐</span> Recently Opened
          </button>
        </div>
      </nav>

      <div class="nlm-sidebar__section">
        <h3 class="nlm-sidebar__section-title">Folders</h3>
        <div class="nlm-folder-list">
          <span class="nlm-sidebar__empty">No folders yet</span>
        </div>
      </div>

      <div class="nlm-sidebar__section">
        <h3 class="nlm-sidebar__section-title">Tags</h3>
        <div class="nlm-tag-list">
          <span class="nlm-sidebar__empty">No tags yet</span>
        </div>
      </div>
    </div>
  `;
}

// ─── Events ───────────────────────────────────────────────────────────────────

function bindEvents(): void {
  if (!sidebarEl) return;

  sidebarEl.querySelector('.nlm-sidebar__close')?.addEventListener('click', () => {
    store.set('sidebarOpen', false);
  });

  // Smart view buttons
  sidebarEl.querySelectorAll<HTMLButtonElement>('.nlm-view-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activateSmartView(btn.dataset['view'] ?? 'all');
      setActiveViewBtn(btn);
    });
  });
}

function activateSmartView(view: string): void {
  // Reset all filters
  store.resetFilters();

  switch (view) {
    case 'favorites':
      store.set('filterFavorite', true);
      break;
    case 'active':
      store.set('filterStatus', 'active');
      break;
    case 'archived':
      store.set('filterStatus', 'archived');
      break;
    case 'recent':
      store.set('sortBy', 'lastOpened');
      store.set('sortDir', 'desc');
      break;
    case 'all':
    default:
      break;
  }

  applyFilters();
}

function setActiveViewBtn(active: HTMLButtonElement): void {
  sidebarEl?.querySelectorAll('.nlm-view-btn').forEach((btn) => {
    btn.classList.remove('nlm-view-btn--active');
  });
  active.classList.add('nlm-view-btn--active');
}

// ─── Dynamic sections ─────────────────────────────────────────────────────────

function renderFolders(folders: Map<string, number>): void {
  const container = sidebarEl?.querySelector('.nlm-folder-list');
  if (!container) return;

  if (folders.size === 0) {
    container.innerHTML = '<span class="nlm-sidebar__empty">No folders yet</span>';
    return;
  }

  container.innerHTML = [...folders.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(
      ([name, count]) =>
        `<button class="nlm-folder-btn" data-folder="${escHtml(name)}" title="Filter by folder: ${escHtml(name)}">
          <span class="nlm-folder-icon">📁</span>
          <span class="nlm-folder-name">${escHtml(name)}</span>
          <span class="nlm-count">${count}</span>
        </button>`,
    )
    .join('');

  container.querySelectorAll<HTMLButtonElement>('.nlm-folder-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const folder = btn.dataset['folder'] ?? null;
      store.resetFilters();
      store.set('filterFolder', folder);
      applyFilters();

      container.querySelectorAll('.nlm-folder-btn').forEach((b) =>
        b.classList.remove('nlm-folder-btn--active'),
      );
      btn.classList.add('nlm-folder-btn--active');

      // Deactivate smart view buttons
      sidebarEl?.querySelectorAll('.nlm-view-btn').forEach((b) =>
        b.classList.remove('nlm-view-btn--active'),
      );
    });
  });
}

function renderTags(tags: Map<string, number>): void {
  const container = sidebarEl?.querySelector('.nlm-tag-list');
  if (!container) return;

  if (tags.size === 0) {
    container.innerHTML = '<span class="nlm-sidebar__empty">No tags yet</span>';
    return;
  }

  container.innerHTML = [...tags.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(
      ([name, count]) =>
        `<button class="nlm-tag-pill" data-tag="${escHtml(name)}" title="Filter by tag: ${escHtml(name)}">
          ${escHtml(name)}<span class="nlm-count">${count}</span>
        </button>`,
    )
    .join('');

  container.querySelectorAll<HTMLButtonElement>('.nlm-tag-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset['tag'] ?? null;
      store.resetFilters();
      store.set('filterTag', tag);
      applyFilters();

      container.querySelectorAll('.nlm-tag-pill').forEach((b) =>
        b.classList.remove('nlm-tag-pill--active'),
      );
      btn.classList.add('nlm-tag-pill--active');

      sidebarEl?.querySelectorAll('.nlm-view-btn').forEach((b) =>
        b.classList.remove('nlm-view-btn--active'),
      );
    });
  });
}
