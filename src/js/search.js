import { api } from './api.js';
import { getLang } from './i18n/index.js';
import { renderProfilesGrid } from './profiles.js';

function getActiveGender() {
  const active = document.querySelector('.gender-toggle .gender-btn.active');
  const text = active?.textContent?.trim().toLowerCase();
  return text === 'groom' || text === 'वर' ? 'groom' : 'bride';
}

export function initSearch() {
  const btn = document.getElementById('searchSubmitBtn');
  const mainGrid = document.getElementById('mainProfilesGrid');
  if (!btn || !mainGrid) return;

  btn.addEventListener('click', async () => {
    const ageFrom = document.getElementById('ageFromSelect')?.value;
    const ageTo = document.getElementById('ageToSelect')?.value;
    const district = document.getElementById('districtSelect')?.value || 'all';
    const education = document.getElementById('educationSelect')?.value || 'any';

    btn.disabled = true;
    const prev = btn.textContent;
    btn.textContent = 'Searching…';

    try {
      const res = await api.search({
        gender: getActiveGender(),
        ageFrom,
        ageTo,
        district,
        education,
        lang: getLang(),
        limit: 12,
      });
      renderProfilesGrid(mainGrid, res?.data?.profiles || []);

      const section = mainGrid.closest('.profiles-section');
      section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      console.error('Search failed:', err);
      renderProfilesGrid(mainGrid, []);
    } finally {
      btn.disabled = false;
      btn.textContent = prev;
      if (window.__applySiteLanguage) window.__applySiteLanguage(getLang());
    }
  });
}
