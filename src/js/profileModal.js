import { api, ApiError } from './api.js';
import { isLoggedIn } from './storage.js';
import { getLang } from './i18n/index.js';
import { openModal, closeModal, setModalMessage } from './ui/modal.js';
import { openChatPage } from './chat.js';

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
      <p class="profile-privacy-note">Contact details are private. Use chat request to connect safely.</p>
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

function bindChatActions(profileId, p) {
  const actions = document.getElementById('profileModalActions');
  if (!actions || p.isOwnProfile) {
    if (actions && p.isOwnProfile) {
      actions.innerHTML = '<p class="modal-hint">This is your profile.</p>';
    }
    return;
  }

  const status = p.chatStatus || 'none';

  if (status === 'accepted' && p.conversationId) {
    actions.innerHTML = `
      <button type="button" class="btn-login" id="openChatBtn" style="margin-top:16px">Open chat</button>
    `;
    document.getElementById('openChatBtn')?.addEventListener('click', () => {
      closeModal();
      openChatPage('chats');
    });
    return;
  }

  if (status === 'pending_sent') {
    actions.innerHTML = `<p class="modal-hint" style="margin-top:16px">Chat request sent — waiting for response.</p>`;
    return;
  }

  if (status === 'pending_received') {
    actions.innerHTML = `
      <p class="modal-hint" style="margin-top:12px">This member sent you a chat request.</p>
      <button type="button" class="btn-login" id="goRequestsBtn" style="margin-top:12px">View requests</button>
    `;
    document.getElementById('goRequestsBtn')?.addEventListener('click', () => {
      closeModal();
      openChatPage('requests');
    });
    return;
  }

  actions.innerHTML = `
    <div class="form-group" style="margin-top:16px">
      <label class="form-label">Intro message (optional)</label>
      <input class="form-input" id="chatRequestMessage" maxlength="500" placeholder="Brief note for the family">
    </div>
    <button type="button" class="btn-login" id="sendChatRequestBtn">Send chat request</button>
  `;

  document.getElementById('sendChatRequestBtn')?.addEventListener('click', async () => {
    const msg = document.getElementById('chatRequestMessage')?.value?.trim();
    const btn = document.getElementById('sendChatRequestBtn');
    btn.disabled = true;
    try {
      await api.sendChatRequest(profileId, msg || undefined);
      setModalMessage('Chat request sent successfully.');
      btn.replaceWith(Object.assign(document.createElement('p'), {
        className: 'modal-hint',
        textContent: 'Request pending — you will be notified when accepted.',
      }));
    } catch (err) {
      setModalMessage(err instanceof ApiError ? err.message : 'Could not send request.', true);
      btn.disabled = false;
    }
  });
}

export async function openProfileModal(profileId) {
  if (!profileId) return;

  openModal('Profile', '<p style="text-align:center;color:var(--warm-muted);padding:24px">Loading…</p>');
  setModalMessage('');

  try {
    const res = await api.getProfile(profileId, getLang());
    const p = res?.data;
    if (!p) throw new Error('Not found');

    openModal(p.displayName, profileHtml(p));

    if (!isLoggedIn()) {
      const actions = document.getElementById('profileModalActions');
      actions.innerHTML = `
        <p class="modal-hint" style="margin-top:16px">Sign in to send a chat request.</p>
        <button type="button" class="btn-secondary" id="profileLoginBtn" style="margin-top:8px;width:100%">Sign in</button>
      `;
      document.getElementById('profileLoginBtn')?.addEventListener('click', () => {
        closeModal();
        window.scrollTo(0, 0);
      });
    } else {
      bindChatActions(profileId, p);
    }
  } catch (err) {
    openModal('Profile', '');
    setModalMessage(err instanceof ApiError ? err.message : 'Could not load profile.', true);
  }
}

export function initProfileModal() {
  document.addEventListener(
    'click',
    (e) => {
      const btn = e.target.closest('.profile-action');
      if (!btn || btn.disabled) return;

      const profileId =
        btn.dataset.profileId || btn.closest('[data-profile-id]')?.getAttribute('data-profile-id');
      if (!profileId) return;

      e.preventDefault();
      e.stopPropagation();

      btn.disabled = true;
      openProfileModal(profileId).finally(() => {
        btn.disabled = false;
      });
    },
    true
  );
}
