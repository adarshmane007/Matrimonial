import { api } from './api.js';

export async function loadStats() {
  try {
    const res = await api.getStats();
    const d = res?.data;
    if (!d) return;

    const statNums = document.querySelectorAll('.hero-stats .stat-num, .login-trust .trust-num');
    const values = [
      d.verifiedProfiles?.display || '50K+',
      d.successfulMatches?.display || '12K+',
      d.community || '100%',
    ];

    statNums.forEach((el, i) => {
      if (values[i]) el.textContent = values[i];
    });
  } catch (err) {
    console.warn('Stats:', err);
  }
}
