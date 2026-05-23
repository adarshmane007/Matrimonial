import { api, ApiError } from './api.js';
import { isLoggedIn } from './storage.js';
import { getLang } from './i18n/index.js';
import { openModal, setModalMessage } from './ui/modal.js';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function factRow(label, value) {
  if (!value) return '';
  return `<li><span class="fact-label">${escapeHtml(label)}</span><span class="fact-value">${escapeHtml(value)}</span></li>`;
}

function profileHtml(p) {
  const tags = (p.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  const photoBlock = p.photoUrl
    ? `<div class="profile-detail-photo"><img src="${escapeHtml(p.photoUrl)}" alt=""></div>`
    : '';

  return `
    <div class="profile-detail profile-detail-rich">
      ${photoBlock}
      <h3 class="profile-detail-name">${escapeHtml(p.displayName)}</h3>
      <p class="profile-detail-sub">${escapeHtml(p.subtitle || '')}</p>
      ${p.isVerified ? '<p class="profile-verified-pill">✓ Verified Member</p>' : ''}
      <div class="profile-tags" style="margin:12px 0">${tags}</div>

      <div class="profile-detail-section">
        <h4 class="profile-detail-section-title">Basic Information</h4>
        <ul class="profile-detail-facts profile-detail-facts-grid">
          ${factRow('Age', p.age ? `${p.age} years` : null)}
          ${factRow('Height', p.height)}
          ${factRow('Marital Status', p.maritalStatusLabel)}
          ${factRow('Kul', p.kul)}
          ${factRow('Manglik', p.manglikLabel)}
          ${factRow('Diet', p.dietLabel)}
        </ul>
      </div>

      <div class="profile-detail-section">
        <h4 class="profile-detail-section-title">Location</h4>
        <ul class="profile-detail-facts profile-detail-facts-grid">
          ${factRow('District', p.districtLabel)}
          ${factRow('City', p.city)}
          ${factRow('Native Place', p.nativePlace)}
        </ul>
      </div>

      <div class="profile-detail-section">
        <h4 class="profile-detail-section-title">Education &amp; Career</h4>
        <ul class="profile-detail-facts profile-detail-facts-grid">
          ${factRow('Education', p.education)}
          ${factRow('Qualification', p.educationLabel)}
          ${factRow('Occupation', p.occupation)}
          ${factRow('Employed In', p.employmentLabel)}
          ${factRow('Annual Income', p.incomeLabel || p.salary)}
        </ul>
      </div>

      <div class="profile-detail-section">
        <h4 class="profile-detail-section-title">Family &amp; Background</h4>
        <ul class="profile-detail-facts profile-detail-facts-grid">
          ${factRow('Mother Tongue', p.motherTongueLabel)}
          ${factRow('Family Type', p.familyTypeLabel)}
          ${factRow("Father's Occupation", p.fatherOccupation)}
        </ul>
      </div>

      ${p.bio ? `<div class="profile-detail-section"><h4 class="profile-detail-section-title">About</h4><p class="profile-detail-bio">${escapeHtml(p.bio)}</p></div>` : ''}

      <div id="profileModalActions"></div>
    </div>
  `;
}

export async function openProfileModal(profileId) {
  openModal('Profile', '<p style="text-align:center;color:var(--warm-muted)">Loading…</p>');
  setModalMessage('');

  try {
    const res = await api.getProfile(profileId, getLang());
    const p = res?.data;
    if (!p) throw new Error('Not found');

    openModal(p.displayName, profileHtml(p));
    const actions = document.getElementById('profileModalActions');

    if (isLoggedIn()) {
      actions.innerHTML = `
        <div class="form-group" style="margin-top:16px">
          <label class="form-label">Message (optional)</label>
          <input class="form-input" id="interestMessage" maxlength="500" placeholder="Short note for the family">
        </div>
        <button type="button" class="btn-login" id="expressInterestBtn">Express interest</button>
      `;
      document.getElementById('expressInterestBtn')?.addEventListener('click', async () => {
        const msg = document.getElementById('interestMessage')?.value?.trim();
        const btn = document.getElementById('expressInterestBtn');
        btn.disabled = true;
        try {
          await api.expressInterest(profileId, msg || undefined);
          setModalMessage('Interest sent successfully.');
        } catch (err) {
          setModalMessage(err instanceof ApiError ? err.message : 'Could not send interest.', true);
        } finally {
          btn.disabled = false;
        }
      });
    } else {
      actions.innerHTML = `
        <p class="modal-hint" style="margin-top:16px">Sign in to express interest in this profile.</p>
        <button type="button" class="btn-secondary" id="profileLoginBtn" style="margin-top:8px;width:100%;text-align:center">Sign in</button>
      `;
      document.getElementById('profileLoginBtn')?.addEventListener('click', () => {
        document.getElementById('appModal').hidden = true;
        document.body.style.overflow = '';
        window.scrollTo(0, 0);
      });
    }
  } catch (err) {
    openModal('Profile', '');
    setModalMessage(err instanceof ApiError ? err.message : 'Could not load profile.', true);
  }
}

export function initProfileModal() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.profile-action');
    if (!btn) return;
    const card = btn.closest('[data-profile-id]');
    const id = card?.getAttribute('data-profile-id');
    if (id) {
      e.preventDefault();
      openProfileModal(id);
    }
  });
}
