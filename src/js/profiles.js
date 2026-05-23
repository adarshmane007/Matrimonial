import { api } from './api.js';
import { getLang } from './i18n/index.js';
import { getProfile } from './storage.js';

const BG_CLASSES = ['profile-img-bg-1', 'profile-img-bg-2', 'profile-img-bg-3'];

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderProfileCard(profile, index = 0) {
  const bg = BG_CLASSES[index % BG_CLASSES.length];
  const tags = (profile.tags || [])
    .filter(Boolean)
    .slice(0, 4)
    .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
    .join('');

  const onlineLabel =
    document.querySelector('[data-i18n="profiles.online"]')?.textContent || 'Online';

  const photoInner = profile.photoUrl
    ? `<img src="${escapeHtml(profile.photoUrl)}" alt="" class="profile-card-photo" loading="lazy">`
    : `<div class="profile-img-bg ${bg}">👤</div>`;

  return `
    <article class="profile-card" data-profile-id="${profile.id}">
      <div class="profile-img-wrap">
        ${photoInner}
        ${profile.isOnline ? `<div class="profile-badge">${escapeHtml(onlineLabel)}</div>` : ''}
        ${profile.isVerified ? '<div class="profile-badge profile-badge-verified">✓ Verified</div>' : ''}
      </div>
      <div class="profile-info">
        <div class="profile-name">${escapeHtml(profile.displayName)}</div>
        <div class="profile-sub">${escapeHtml(profile.subtitle || '')}</div>
        <div class="profile-tags">${tags}</div>
        <button type="button" class="profile-action" data-profile-id="${profile.id}" data-i18n="profiles.view">View Profile</button>
      </div>
    </article>
  `;
}

export function renderProfilesGrid(container, profiles) {
  if (!container) return;
  if (!profiles?.length) {
    container.innerHTML =
      '<p class="profiles-empty" style="grid-column:1/-1;text-align:center;color:var(--warm-muted);padding:24px;">No profiles found. Try adjusting your filters.</p>';
    return;
  }
  container.innerHTML = profiles.map((p, i) => renderProfileCard(p, i)).join('');
  if (window.__applySiteLanguage) window.__applySiteLanguage(getLang());
}

export async function loadFeaturedProfiles() {
  const grids = document.querySelectorAll('[data-profiles-grid]');
  if (!grids.length) return;

  try {
    const res = await api.getFeatured(getLang());
    let profiles = res?.data || [];
    const myId = getProfile()?.id;
    if (myId) profiles = profiles.filter((p) => p.id !== myId);
    grids.forEach((grid) => renderProfilesGrid(grid, profiles));
  } catch (err) {
    console.warn('Featured profiles:', err);
  }
}
