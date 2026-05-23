import { api, ApiError } from './api.js';
import { saveAuth } from './storage.js';
import { getSiteMeta } from './meta.js';
import { t } from './i18n/index.js';
import { openModal, closeModal, setModalMessage } from './ui/modal.js';
import { enterMainSite } from './ui/session.js';
import { openProfilePage } from './myProfile.js';
import {
  locationFieldsHtml,
  bindLocationFields,
  locationPayloadFromForm,
  locationFromStoredProfile,
} from './locationSelect.js';

function optionsHtml(items, selected = '') {
  return items
    .map((i) => `<option value="${i.value}" ${i.value === selected ? 'selected' : ''}>${i.label}</option>`)
    .join('');
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function reviewFormHtml(meta, parsed = {}) {
  const eduLevels = (meta.educationLevels || []).filter((e) => e.value !== 'any');
  const p = parsed;
  const locValues = locationFromStoredProfile(p);

  return `
    <form id="registerForm" class="modal-form">
      ${p.bio ? `<textarea name="bio" hidden aria-hidden="true">${escapeHtml(p.bio)}</textarea>` : ''}
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${escapeHtml(t('profile.fullName'))}</label>
          <input class="form-input" name="fullName" required maxlength="120" value="${escapeHtml(p.fullName)}">
        </div>
        <div class="form-group">
          <label class="form-label">${escapeHtml(t('profile.gender'))}</label>
          <select class="form-select" name="gender" required>${optionsHtml(meta.genders, p.gender)}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${escapeHtml(t('profile.email'))}</label>
          <input class="form-input" type="email" name="email">
        </div>
        <div class="form-group">
          <label class="form-label">${escapeHtml(t('profile.mobile'))}</label>
          <input class="form-input" type="tel" name="mobile" placeholder="+91...">
        </div>
      </div>
      <p class="modal-hint">${escapeHtml(t('reg.contactHint'))}</p>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${escapeHtml(t('login.passwordLabel'))} *</label>
          <input class="form-input" type="password" name="password" required minlength="6">
        </div>
        <div class="form-group">
          <label class="form-label">${escapeHtml(t('profile.age'))}</label>
          <input class="form-input" type="number" name="age" min="18" max="80" required value="${p.age ?? 26}">
        </div>
      </div>
      ${locationFieldsHtml(meta, locValues)}
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${escapeHtml(t('profile.education'))}</label>
          <input class="form-input" name="education" value="${escapeHtml(p.education)}" placeholder="e.g. MBA Finance">
        </div>
        <div class="form-group">
          <label class="form-label">${escapeHtml(t('profile.educationLevel'))}</label>
          <select class="form-select" name="educationLevel">
            <option value="">${escapeHtml(t('profile.select'))}</option>
            ${optionsHtml(eduLevels, p.educationLevel || '')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${escapeHtml(t('profile.kul'))}</label>
          <input class="form-input" name="kul" value="${escapeHtml(p.kul)}" placeholder="${escapeHtml(t('profile.kulPh'))}">
        </div>
        <div class="form-group">
          <label class="form-label">${escapeHtml(t('profile.occupation'))}</label>
          <input class="form-input" name="occupation" value="${escapeHtml(p.occupation)}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">${escapeHtml(t('profile.height'))}</label>
        <input class="form-input" name="height" value="${escapeHtml(p.height)}" placeholder="e.g. 5'6&quot;">
      </div>
      ${p.bio ? `<p class="modal-hint">${escapeHtml(t('reg.bioSaved'))}</p>` : ''}
      <button type="submit" class="btn-login" style="margin-top:8px">${escapeHtml(t('reg.createAccount'))}</button>
    </form>
  `;
}

function pasteStepHtml() {
  return `
    <div class="register-flow" id="registerFlow">
      <div class="register-tabs" role="tablist">
        <button type="button" class="register-tab active" data-register-tab="paste">${escapeHtml(t('reg.tabPaste'))}</button>
        <button type="button" class="register-tab" data-register-tab="manual">${escapeHtml(t('reg.tabManual'))}</button>
      </div>
      <div class="register-pane" data-pane="paste">
        <p class="modal-hint">${escapeHtml(t('reg.pasteHint'))}</p>
        <textarea id="biodataInput" class="form-input biodata-textarea" rows="10" placeholder="${escapeHtml(t('reg.pastePlaceholder'))}"></textarea>
        <button type="button" class="btn-login" id="parseBiodataBtn" style="margin-top:12px">${escapeHtml(t('reg.parseReview'))}</button>
      </div>
      <div class="register-pane hidden" data-pane="manual" id="registerManualPane"></div>
    </div>
  `;
}

function warningsHtml(warnings) {
  if (!warnings?.length) return '';
  return `<ul class="parse-warnings">${warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>`;
}

function bindRegisterTabs(flow, onManual) {
  flow.querySelectorAll('[data-register-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.registerTab;
      flow.querySelectorAll('.register-tab').forEach((btn) => btn.classList.toggle('active', btn === tab));
      flow.querySelectorAll('.register-pane').forEach((pane) => {
        pane.classList.toggle('hidden', pane.dataset.pane !== mode);
      });
      if (mode === 'manual') onManual();
    });
  });
}

function bindRegisterSubmit(form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setModalMessage('');
    const fd = new FormData(form);
    const payload = {
      fullName: fd.get('fullName')?.trim(),
      email: fd.get('email')?.trim() || undefined,
      mobile: fd.get('mobile')?.trim() || undefined,
      password: fd.get('password'),
      gender: fd.get('gender'),
      age: Number(fd.get('age')),
      ...locationPayloadFromForm(form),
      education: fd.get('education')?.trim() || undefined,
      educationLevel: fd.get('educationLevel') || undefined,
      kul: fd.get('kul')?.trim() || undefined,
      occupation: fd.get('occupation')?.trim() || undefined,
      height: fd.get('height')?.trim() || undefined,
      bio: fd.get('bio')?.trim() || undefined,
    };

    if (!payload.email && !payload.mobile) {
      setModalMessage(t('reg.needContact'), true);
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const res = await api.register(payload);
      saveAuth({
        token: res.data.token,
        user: res.data.user,
        profile: res.data.profile || null,
      });
      closeModal();
      enterMainSite();
      openProfilePage();
    } catch (err) {
      setModalMessage(err instanceof ApiError ? err.message : t('reg.regFailed'), true);
    } finally {
      btn.disabled = false;
    }
  });
}

async function showReviewStep(meta, parsed, warnings) {
  const body = warningsHtml(warnings) + (await reviewFormHtml(meta, parsed));
  const modalBody = document.getElementById('appModalBody');
  if (modalBody) modalBody.innerHTML = body;
  const form = document.getElementById('registerForm');
  if (form) {
    bindRegisterSubmit(form);
    await bindLocationFields(form, locationFromStoredProfile(parsed));
  }
}

async function showManualForm(meta) {
  const pane = document.getElementById('registerManualPane');
  if (!pane || pane.querySelector('#registerForm')) return;
  pane.innerHTML = await reviewFormHtml(meta, {});
  const form = document.getElementById('registerForm');
  if (form) {
    bindRegisterSubmit(form);
    await bindLocationFields(form, locationFromStoredProfile({}));
  }
}

export async function openRegisterModal() {
  const meta = await getSiteMeta();
  openModal(t('reg.title'), pasteStepHtml());
  setModalMessage('');

  const flow = document.getElementById('registerFlow');
  const parseBtn = document.getElementById('parseBiodataBtn');
  const biodataInput = document.getElementById('biodataInput');

  bindRegisterTabs(flow, () => showManualForm(meta));

  parseBtn?.addEventListener('click', async () => {
    const text = biodataInput?.value?.trim();
    if (!text || text.length < 20) {
      setModalMessage(t('reg.needBiodata'), true);
      return;
    }
    setModalMessage('');
    parseBtn.disabled = true;
    parseBtn.textContent = t('reg.parsing');
    try {
      const res = await api.parseBiodata(text);
      await showReviewStep(meta, res.data.parsed, res.data.warnings);
    } catch (err) {
      setModalMessage(err instanceof ApiError ? err.message : t('reg.parseFailed'), true);
    } finally {
      parseBtn.disabled = false;
      parseBtn.textContent = t('reg.parseReview');
    }
  });
}

export function initRegister() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-open-register]');
    if (!el || el.hidden || document.body.classList.contains('logged-in')) return;
    e.preventDefault();
    openRegisterModal();
  });
}
