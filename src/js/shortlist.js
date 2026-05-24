import { api, ApiError } from './api.js';
import { getLang, t, applyLanguageToRoot } from './i18n/index.js';
import { renderProfilesGrid } from './profiles.js';
import { closeFullPageOverlays } from './ui/fullPage.js';
import { isNavLocked, isNavSwitchLocked, withNavLock } from './ui/navigation.js';

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

let shortlistMounted = false;
let shortlistIds = new Set();

export function getShortlistIds() {
  return shortlistIds;
}

export async function refreshShortlistIds() {
  try {
    const res = await api.getShortlistIds();
    shortlistIds = new Set(res?.data || []);
  } catch {
    shortlistIds = new Set();
  }
  return shortlistIds;
}

export function isShortlisted(profileId) {
  return shortlistIds.has(Number(profileId));
}

export async function toggleShortlist(profileId) {
  const id = Number(profileId);
  if (!id) return false;
  if (shortlistIds.has(id)) {
    await api.removeShortlist(id);
    shortlistIds.delete(id);
    return false;
  }
  await api.addShortlist(id);
  shortlistIds.add(id);
  return true;
}

export function closeShortlistPage() {
  document.body.classList.remove('on-shortlist-page');
  const page = document.getElementById('shortlist-page');
  if (page) page.hidden = true;
}

export async function openShortlistPage() {
  const page = document.getElementById('shortlist-page');
  if (!page || isNavLocked('shortlist')) return;

  if (!document.body.classList.contains('on-main-site')) return;

  return withNavLock('shortlist', async () => {
    closeFullPageOverlays({ except: 'shortlist' });
    document.body.classList.add('on-shortlist-page');
    page.hidden = false;
    window.scrollTo(0, 0);

    page.innerHTML = `<p class="profile-loading">${escapeHtml(t('shortlist.loading'))}</p>`;

    try {
      await refreshShortlistIds();
      const res = await api.getShortlist(getLang());
      const profiles = res?.data || [];

      page.innerHTML = `
        <div class="browse-page-inner shortlist-page-inner">
          <div class="browse-page-header">
            <div>
              <p class="profile-page-label" data-i18n="shortlist.label">Shortlist</p>
              <h1 class="profile-page-title" data-i18n="shortlist.title">My shortlisted profiles</h1>
              <p class="profile-page-sub" data-i18n="shortlist.sub">Profiles you saved to review later.</p>
            </div>
            <button type="button" class="profile-page-back" id="shortlistPageBack" data-i18n="shortlist.back">← Back</button>
          </div>
          <div class="profiles-grid" id="shortlistProfilesGrid"></div>
        </div>
      `;

      applyLanguageToRoot(page);
      const grid = document.getElementById('shortlistProfilesGrid');
      if (!profiles.length) {
        grid.innerHTML = `<p class="profiles-empty" style="grid-column:1/-1;text-align:center;padding:32px;color:var(--warm-muted);">${escapeHtml(t('shortlist.empty'))}</p>`;
      } else {
        renderProfilesGrid(grid, profiles, { shortlistedIds: shortlistIds });
      }

      document.getElementById('shortlistPageBack')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeShortlistPage();
      });

      shortlistMounted = true;
    } catch (err) {
      page.innerHTML = `<p class="profile-status is-error">${escapeHtml(err.message || 'Could not load shortlist')}</p>`;
    }
  });
}

export function initShortlist() {
  document.addEventListener('click', (e) => {
    const open = e.target.closest('[data-open-shortlist]');
    if (!open || isNavSwitchLocked()) return;
    e.preventDefault();
    openShortlistPage();
  });

  if (document.body.classList.contains('logged-in')) {
    refreshShortlistIds();
  }

  document.addEventListener('smm:enter-main', () => {
    refreshShortlistIds();
  });
}
