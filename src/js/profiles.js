import { api } from './api.js';
import { applyLanguageToRoot, getLang } from './i18n/index.js';
import { getProfile } from './storage.js';

const BG_CLASSES = ['profile-img-bg-1', 'profile-img-bg-2', 'profile-img-bg-3'];

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderProfileCard(profile, index = 0, { guestMode = false, shortlistedIds = null } = {}) {
  const bg = BG_CLASSES[index % BG_CLASSES.length];
  const tags = (profile.tags || [])
    .filter(Boolean)
    .slice(0, 4)
    .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
    .join('');

  const onlineLabel =
    document.querySelector('[data-i18n="profiles.online"]')?.textContent || 'Online';

  const photoInner = profile.photoUrl
    ? `<img src="${escapeHtml(profile.photoUrl)}" alt="" class="profile-card-photo" loading="lazy" decoding="async">`
    : `<div class="profile-img-bg ${bg}">👤</div>`;

  const cardClass = guestMode ? 'profile-card profile-card--guest' : 'profile-card';
  const actionBtn = guestMode
    ? `<button type="button" class="profile-action enter-main" data-i18n="profiles.signInToView">Sign in to view</button>`
    : `<button type="button" class="profile-action" data-profile-id="${profile.id}" data-i18n="profiles.view">View Profile</button>`;

  const pid = profile.id;
  const isListed =
    shortlistedIds?.has?.(pid) || shortlistedIds?.has?.(Number(pid));
  const shortlistBtn = guestMode
    ? ''
    : `<button type="button" class="profile-shortlist-btn${isListed ? ' is-shortlisted' : ''}" data-shortlist-toggle="${profile.id}" aria-label="Shortlist" title="Shortlist">♥</button>`;

  return `
    <article class="${cardClass}" ${guestMode ? '' : `data-profile-id="${profile.id}"`}>
      ${shortlistBtn}
      <div class="profile-img-wrap">
        ${photoInner}
        ${profile.isOnline ? `<div class="profile-badge">${escapeHtml(onlineLabel)}</div>` : ''}
        ${profile.isVerified ? '<div class="profile-badge profile-badge-verified">✓ Verified</div>' : ''}
      </div>
      <div class="profile-info">
        <div class="profile-name">${escapeHtml(profile.displayName)}</div>
        <div class="profile-sub">${escapeHtml(profile.subtitle || '')}</div>
        <div class="profile-tags">${tags}</div>
        ${actionBtn}
      </div>
    </article>
  `;
}

export function renderProfilesGrid(container, profiles, options = {}) {
  if (!container) return;
  if (!profiles?.length) {
    container.innerHTML =
      '<p class="profiles-empty" style="grid-column:1/-1;text-align:center;color:var(--warm-muted);padding:24px;">No profiles found. Try adjusting your filters.</p>';
    return;
  }
  container.innerHTML = profiles.map((p, i) => renderProfileCard(p, i, options)).join('');
  applyLanguageToRoot(container);
}

function oppositeGender(g) {
  if (g === 'groom') return 'bride';
  if (g === 'bride') return 'groom';
  return undefined;
}

export async function loadFeaturedProfiles(shortlistedIds = null) {
  const grids = document.querySelectorAll('[data-profiles-grid]');
  if (!grids.length) return;

  try {
    const me = getProfile();
    const gender = oppositeGender(me?.gender);
    const res = await api.getFeatured(getLang(), { gender, limit: 6 });
    let profiles = res?.data || [];
    const myId = getProfile()?.id;
    if (myId) profiles = profiles.filter((p) => p.id !== myId);
    let ids = shortlistedIds;
    if (!ids) {
      try {
        const { getShortlistIds } = await import('./shortlist.js');
        ids = getShortlistIds();
      } catch {
        ids = null;
      }
    }
    grids.forEach((grid) => {
      const guestMode = !!grid.closest('#login-screen');
      renderProfilesGrid(grid, profiles, { guestMode, shortlistedIds: ids });
    });
  } catch (err) {
    console.warn('Featured profiles:', err);
  }
}

export function initProfiles() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-shortlist-toggle]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const id = btn.getAttribute('data-shortlist-toggle');
    try {
      const { toggleShortlist } = await import('./shortlist.js');
      const added = await toggleShortlist(id);
      btn.classList.toggle('is-shortlisted', added);
    } catch (err) {
      console.warn('Shortlist:', err);
      const { ApiError } = await import('./api.js');
      const msg = err instanceof ApiError ? err.message : 'Could not update shortlist';
      btn.setAttribute('title', msg);
      setTimeout(() => btn.removeAttribute('title'), 2500);
    }
  });
}
