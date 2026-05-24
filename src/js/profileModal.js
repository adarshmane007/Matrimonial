import { api, ApiError } from './api.js';
import { isLoggedIn } from './storage.js';
import { getLang, t } from './i18n/index.js';
import { openModal, closeModal, setModalMessage } from './ui/modal.js';
import { openChatPage } from './chat.js';
import { isShortlisted, toggleShortlist } from './shortlist.js';
import { downloadBiodataPdf } from './utils/biodataDownload.js';

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
  const tags = (p.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  const photoBlock = p.photoUrl
    ? `<div class="profile-detail-photo"><img src="${escapeHtml(p.photoUrl)}" alt=""></div>`
    : '';
  const ageText = p.age ? `${p.age} ${t('modal.years')}` : null;

  return `
    <div class="profile-detail profile-detail-rich">
      ${photoBlock}
      <h3 class="profile-detail-name">${escapeHtml(p.displayName)}</h3>
      <p class="profile-detail-sub">${escapeHtml(p.subtitle || '')}</p>
      ${p.isVerified ? `<p class="profile-verified-pill">${escapeHtml(t('modal.verified'))}</p>` : ''}
      <p class="profile-privacy-note">${escapeHtml(t('modal.privacy'))}</p>
      <div class="profile-tags" style="margin:12px 0">${tags}</div>

      <div class="profile-detail-section">
        <h4 class="profile-detail-section-title">${escapeHtml(t('modal.basicInfo'))}</h4>
        <ul class="profile-detail-facts profile-detail-facts-grid">
          ${factRow(t('modal.age'), ageText)}
          ${factRow(t('modal.height'), p.height)}
          ${factRow(t('modal.maritalStatus'), p.maritalStatusLabel)}
          ${factRow(t('profile.kul'), p.kul)}
          ${factRow(t('profile.manglik'), p.manglikLabel)}
          ${factRow(t('profile.diet'), p.dietLabel)}
        </ul>
      </div>

      <div class="profile-detail-section">
        <h4 class="profile-detail-section-title">${escapeHtml(t('modal.location'))}</h4>
        <ul class="profile-detail-facts profile-detail-facts-grid">
          ${factRow(t('profile.state'), p.stateLabel)}
          ${factRow(t('profile.city'), p.city || p.districtLabel)}
          ${factRow(t('modal.nativePlace'), p.nativePlace)}
        </ul>
      </div>

      <div class="profile-detail-section">
        <h4 class="profile-detail-section-title">${escapeHtml(t('modal.educationCareer'))}</h4>
        <ul class="profile-detail-facts profile-detail-facts-grid">
          ${factRow(t('profile.education'), p.education)}
          ${factRow(t('modal.qualification'), p.educationLabel)}
          ${factRow(t('profile.occupation'), p.occupation)}
          ${factRow(t('modal.employedIn'), p.employmentLabel)}
          ${factRow(t('modal.annualIncome'), p.incomeLabel || p.salary)}
        </ul>
      </div>

      <div class="profile-detail-section">
        <h4 class="profile-detail-section-title">${escapeHtml(t('modal.familyBackground'))}</h4>
        <ul class="profile-detail-facts profile-detail-facts-grid">
          ${factRow(t('modal.motherTongue'), p.motherTongueLabel)}
          ${factRow(t('profile.familyType'), p.familyTypeLabel)}
          ${factRow(t('modal.fatherOcc'), p.fatherOccupation)}
        </ul>
      </div>

      ${p.bio ? `<div class="profile-detail-section"><h4 class="profile-detail-section-title">${escapeHtml(t('modal.about'))}</h4><p class="profile-detail-bio">${escapeHtml(p.bio)}</p></div>` : ''}

      ${p.biodataUrl ? `
      <div class="profile-detail-section profile-biodata-section">
        <h4 class="profile-detail-section-title">${escapeHtml(t('modal.biodata'))}</h4>
        <p class="modal-hint">${escapeHtml(t('modal.biodataHint'))}</p>
        <button type="button" class="btn-secondary profile-biodata-download" id="profileBiodataDownloadBtn">${escapeHtml(t('modal.downloadBiodata'))}</button>
      </div>` : p.hasBiodata ? `<p class="modal-hint">${escapeHtml(t('modal.biodataMembersOnly'))}</p>` : ''}

      <div id="profileModalActions"></div>
    </div>
  `;
}

function bindChatActions(profileId, p) {
  const actions = document.getElementById('profileModalActions');
  if (!actions || p.isOwnProfile) {
    if (actions && p.isOwnProfile) {
      actions.innerHTML = `<p class="modal-hint">${escapeHtml(t('modal.ownProfile'))}</p>`;
    }
    return;
  }

  const status = p.chatStatus || 'none';

  if (status === 'accepted' && p.conversationId) {
    actions.innerHTML = `
      <button type="button" class="btn-login" id="openChatBtn" style="margin-top:16px">${escapeHtml(t('modal.openChat'))}</button>
    `;
    document.getElementById('openChatBtn')?.addEventListener('click', () => {
      closeModal();
      openChatPage('chats');
    });
    return;
  }

  if (status === 'pending_sent') {
    actions.innerHTML = `<p class="modal-hint" style="margin-top:16px">${escapeHtml(t('modal.requestSent'))}</p>`;
    return;
  }

  if (status === 'pending_received') {
    actions.innerHTML = `
      <p class="modal-hint" style="margin-top:12px">${escapeHtml(t('modal.requestReceived'))}</p>
      <button type="button" class="btn-login" id="goRequestsBtn" style="margin-top:12px">${escapeHtml(t('modal.viewRequests'))}</button>
    `;
    document.getElementById('goRequestsBtn')?.addEventListener('click', () => {
      closeModal();
      openChatPage('requests');
    });
    return;
  }

  const listed = isShortlisted(profileId);
  actions.innerHTML = `
    <button type="button" class="btn-secondary profile-modal-shortlist${listed ? ' is-shortlisted' : ''}" id="modalShortlistBtn" style="margin-top:12px;width:100%">${escapeHtml(listed ? t('shortlist.remove') : t('shortlist.add'))}</button>
    <div class="form-group" style="margin-top:16px">
      <label class="form-label">${escapeHtml(t('modal.introLabel'))}</label>
      <input class="form-input" id="chatRequestMessage" maxlength="500" placeholder="${escapeHtml(t('modal.introPlaceholder'))}">
    </div>
    <button type="button" class="btn-login" id="sendChatRequestBtn">${escapeHtml(t('modal.sendRequest'))}</button>
  `;

  document.getElementById('modalShortlistBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('modalShortlistBtn');
    try {
      const added = await toggleShortlist(profileId);
      btn.classList.toggle('is-shortlisted', added);
      btn.textContent = added ? t('shortlist.remove') : t('shortlist.add');
    } catch (err) {
      setModalMessage(err instanceof ApiError ? err.message : t('shortlist.failed'), true);
    }
  });

  document.getElementById('sendChatRequestBtn')?.addEventListener('click', async () => {
    const msg = document.getElementById('chatRequestMessage')?.value?.trim();
    const btn = document.getElementById('sendChatRequestBtn');
    btn.disabled = true;
    try {
      await api.sendChatRequest(profileId, msg || undefined);
      setModalMessage(t('modal.requestSuccess'));
      btn.replaceWith(
        Object.assign(document.createElement('p'), {
          className: 'modal-hint',
          textContent: t('modal.requestPending'),
        })
      );
    } catch (err) {
      setModalMessage(err instanceof ApiError ? err.message : t('modal.sendFailed'), true);
      btn.disabled = false;
    }
  });
}

export async function openProfileModal(profileId) {
  if (!profileId) return;

  openModal(t('modal.profileTitle'), `<p style="text-align:center;color:var(--warm-muted);padding:24px">${escapeHtml(t('modal.loading'))}</p>`);
  setModalMessage('');

  try {
    const res = await api.getProfile(profileId, getLang());
    const p = res?.data;
    if (!p) throw new Error('Not found');

    openModal(p.displayName, profileHtml(p));

    const biodataBtn = document.getElementById('profileBiodataDownloadBtn');
    if (biodataBtn && p.biodataUrl) {
      biodataBtn.addEventListener('click', async () => {
        biodataBtn.disabled = true;
        const ok = await downloadBiodataPdf(p.biodataUrl, p.displayName);
        biodataBtn.disabled = false;
        if (!ok) {
          setModalMessage(t('modal.biodataDownloadFailed'), true);
        }
      });
    }

    if (!isLoggedIn()) {
      const actions = document.getElementById('profileModalActions');
      actions.innerHTML = `
        <p class="modal-hint" style="margin-top:16px">${escapeHtml(t('modal.signInHint'))}</p>
        <button type="button" class="btn-secondary" id="profileLoginBtn" style="margin-top:8px;width:100%">${escapeHtml(t('modal.signIn'))}</button>
      `;
      document.getElementById('profileLoginBtn')?.addEventListener('click', () => {
        closeModal();
        window.scrollTo(0, 0);
      });
    } else {
      bindChatActions(profileId, p);
    }
  } catch (err) {
    openModal(t('modal.profileTitle'), '');
    setModalMessage(err instanceof ApiError ? err.message : t('modal.loadFailed'), true);
  }
}

export function initProfileModal() {
  document.addEventListener(
    'click',
    (e) => {
      const btn = e.target.closest('.profile-action');
      if (!btn || btn.disabled || btn.classList.contains('enter-main')) return;
      if (!document.body.classList.contains('on-main-site')) return;

      const profileId =
        btn.dataset.profileId || btn.closest('[data-profile-id]')?.getAttribute('data-profile-id');
      if (!profileId) return;

      e.preventDefault();
      e.stopPropagation();

      if (btn.dataset.loading === '1') return;
      btn.dataset.loading = '1';

      openProfileModal(profileId).finally(() => {
        delete btn.dataset.loading;
      });
    },
    true
  );
}
