import { api } from './api.js';
import { t } from './i18n/index.js';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const FALLBACK_KEYS = ['testi.t1', 'testi.t2', 'testi.t3'];

function fallbackQuotes() {
  return FALLBACK_KEYS.map((key) => t(key)).filter(Boolean);
}

export async function loadTestimonials(lang) {
  const grid = document.getElementById('testimonialsGrid');
  if (!grid) return;

  let quotes = [];

  try {
    const res = await api.getTestimonials(lang);
    const items = res?.data || [];
    quotes = items.map((item) => item.text).filter(Boolean);
  } catch (err) {
    console.warn('Testimonials:', err);
  }

  if (!quotes.length) {
    quotes = fallbackQuotes();
  }

  if (!quotes.length) return;

  grid.innerHTML = quotes
    .map(
      (text) => `
    <div class="testi-card testi-card--quote">
      <div class="stars" aria-hidden="true">${'★'.repeat(5)}</div>
      <span class="testi-quote" aria-hidden="true">"</span>
      <p class="testi-text">${escapeHtml(text)}</p>
    </div>`
    )
    .join('');
}
