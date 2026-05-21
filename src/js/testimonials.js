import { api } from './api.js';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function initials(name) {
  return (name || 'SM')
    .split(/[&\s]+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_STYLES = [
  'background: var(--saffron-light); color: var(--saffron);',
  'background: var(--maroon-light); color: var(--maroon);',
  'background: var(--gold-light); color: var(--gold);',
];

export async function loadTestimonials(lang) {
  const grid = document.getElementById('testimonialsGrid');
  if (!grid) return;

  try {
    const res = await api.getTestimonials(lang);
    const items = res?.data || [];
    if (!items.length) return;

    grid.innerHTML = items
      .map(
        (t, i) => `
    <div class="testi-card">
      <div class="stars">${'★'.repeat(t.rating || 5)}</div>
      <span class="testi-quote">"</span>
      <p class="testi-text">${escapeHtml(t.text)}</p>
      <div class="testi-author">
        <div class="testi-avatar" style="${AVATAR_STYLES[i % AVATAR_STYLES.length]}">${escapeHtml(initials(t.coupleNames))}</div>
        <div>
          <div class="testi-name">${escapeHtml(t.coupleNames)}</div>
          <div class="testi-loc">${escapeHtml(t.location)}</div>
        </div>
      </div>
    </div>`
      )
      .join('');
  } catch (err) {
    console.warn('Testimonials:', err);
  }
}
