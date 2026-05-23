import { openBrowsePage } from './browseProfiles.js';

function getActiveGender() {
  const active = document.querySelector('.hero .gender-toggle .gender-btn.active');
  const text = active?.textContent?.trim().toLowerCase();
  return text === 'groom' || text === 'वर' ? 'groom' : 'bride';
}

export function initSearch() {
  const btn = document.getElementById('searchSubmitBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const ageFrom = document.getElementById('ageFromSelect')?.value;
    const ageTo = document.getElementById('ageToSelect')?.value;
    const district = document.getElementById('districtSelect')?.value || 'all';
    const education = document.getElementById('educationSelect')?.value || 'any';

    openBrowsePage({
      gender: getActiveGender(),
      ageFrom,
      ageTo,
      district,
      education,
    });
  });
}
