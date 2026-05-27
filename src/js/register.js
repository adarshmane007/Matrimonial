import { api, ApiError } from './api.js';
import { saveAuth } from './storage.js';
import { getSiteMeta } from './meta.js';
import { t, getLang } from './i18n/index.js';
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

function profileCreatorsForForm(meta) {
  return (meta.profileCreators || []).filter((o) => o.value);
}

async function registerFormHtml(meta) {
  const creators = profileCreatorsForForm(meta);
  return `
    <form id="registerForm" class="modal-form">
      <p class="modal-hint" data-i18n="reg.manualHint">Create your account with basic details. You can upload biodata PDF later from your profile.</p>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${escapeHtml(t('profile.fullName'))}</label>
          <input class="form-input" name="fullName" required maxlength="120">
          ${getLang() === 'mr' ? `<p class="modal-hint" data-i18n="reg.nameMrHint">${escapeHtml(t('reg.nameMrHint'))}</p>` : ''}
        </div>
        <div class="form-group">
          <label class="form-label">${escapeHtml(t('profile.gender'))}</label>
          <select class="form-select" name="gender" required>${optionsHtml(meta.genders, 'bride')}</select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" data-i18n="profile.profileCreator">${escapeHtml(t('profile.profileCreator'))}</label>
        <select class="form-select" name="profileCreator" required>
          <option value="">${escapeHtml(t('profile.select'))}</option>
          ${optionsHtml(creators, '')}
        </select>
        <p class="modal-hint" data-i18n="profile.profileCreatorHint">${escapeHtml(t('profile.profileCreatorHint'))}</p>
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
          <input class="form-input" type="number" name="age" min="18" max="80" required value="26">
        </div>
      </div>
      ${locationFieldsHtml(meta, {})}
      <p class="modal-hint" data-i18n="reg.profileLaterHint">Add education, kul, height, occupation and photo from your profile after sign-up.</p>
      <button type="submit" class="btn-login" style="margin-top:8px">${escapeHtml(t('reg.createAccount'))}</button>
    </form>
  `;
}

function bindRegisterSubmit(form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setModalMessage('');
    const fd = new FormData(form);
    const fullName = fd.get('fullName')?.trim();
    const payload = {
      fullName,
      displayNameMr: getLang() === 'mr' ? fullName : undefined,
      email: fd.get('email')?.trim() || undefined,
      mobile: fd.get('mobile')?.trim() || undefined,
      password: fd.get('password'),
      gender: fd.get('gender'),
      profileCreator: fd.get('profileCreator') || undefined,
      age: Number(fd.get('age')),
      ...locationPayloadFromForm(form),
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

export async function openRegisterModal() {
  const meta = await getSiteMeta();
  const body = await registerFormHtml(meta);
  openModal(t('reg.title'), body);
  setModalMessage('');

  const form = document.getElementById('registerForm');
  if (form) {
    bindRegisterSubmit(form);
    await bindLocationFields(form, locationFromStoredProfile({}));
  }
}

export function initRegister() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-open-register]');
    if (!el || el.hidden || document.body.classList.contains('logged-in')) return;
    e.preventDefault();
    openRegisterModal();
  });
}
