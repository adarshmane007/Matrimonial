import { api, ApiError } from './api.js';
import { saveAuth } from './storage.js';
import { getSiteMeta } from './meta.js';
import { openModal, closeModal, setModalMessage } from './ui/modal.js';
import { enterMainSite } from './ui/session.js';

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
  const districts = (meta.districts || []).filter((d) => d.value !== 'all');
  const eduLevels = (meta.educationLevels || []).filter((e) => e.value !== 'any');
  const p = parsed;

  return `
    <form id="registerForm" class="modal-form">
      ${p.bio ? `<textarea name="bio" hidden aria-hidden="true">${escapeHtml(p.bio)}</textarea>` : ''}
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Full name *</label>
          <input class="form-input" name="fullName" required maxlength="120" value="${escapeHtml(p.fullName)}">
        </div>
        <div class="form-group">
          <label class="form-label">Gender *</label>
          <select class="form-select" name="gender" required>${optionsHtml(meta.genders, p.gender)}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" type="email" name="email">
        </div>
        <div class="form-group">
          <label class="form-label">Mobile</label>
          <input class="form-input" type="tel" name="mobile" placeholder="+91...">
        </div>
      </div>
      <p class="modal-hint">Email or mobile (at least one) is required to create your account.</p>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Password *</label>
          <input class="form-input" type="password" name="password" required minlength="6">
        </div>
        <div class="form-group">
          <label class="form-label">Age *</label>
          <input class="form-input" type="number" name="age" min="18" max="80" required value="${p.age ?? 26}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">District *</label>
          <select class="form-select" name="district" required>${optionsHtml(districts, p.district || 'pune')}</select>
        </div>
        <div class="form-group">
          <label class="form-label">City</label>
          <input class="form-input" name="city" value="${escapeHtml(p.city)}" maxlength="80">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Education</label>
          <input class="form-input" name="education" value="${escapeHtml(p.education)}" placeholder="e.g. MBA Finance">
        </div>
        <div class="form-group">
          <label class="form-label">Education level</label>
          <select class="form-select" name="educationLevel">
            <option value="">—</option>
            ${optionsHtml(eduLevels, p.educationLevel || '')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Kul</label>
          <input class="form-input" name="kul" value="${escapeHtml(p.kul)}" placeholder="e.g. Patil Kul">
        </div>
        <div class="form-group">
          <label class="form-label">Occupation</label>
          <input class="form-input" name="occupation" value="${escapeHtml(p.occupation)}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Height</label>
        <input class="form-input" name="height" value="${escapeHtml(p.height)}" placeholder="e.g. 5'6&quot;">
      </div>
      ${p.bio ? '<p class="modal-hint">Your pasted biodata will be saved on your profile.</p>' : ''}
      <button type="submit" class="btn-login" style="margin-top:8px">Create account</button>
    </form>
  `;
}

function pasteStepHtml() {
  return `
    <div class="register-flow" id="registerFlow">
      <div class="register-tabs" role="tablist">
        <button type="button" class="register-tab active" data-register-tab="paste">Paste biodata</button>
        <button type="button" class="register-tab" data-register-tab="manual">Manual entry</button>
      </div>
      <div class="register-pane" data-pane="paste">
        <p class="modal-hint">Paste biodata from WhatsApp, PDF text, or Word — we will fill the form for you. Review before submitting.</p>
        <textarea id="biodataInput" class="form-input biodata-textarea" rows="10" placeholder="Paste full biodata here..."></textarea>
        <button type="button" class="btn-login" id="parseBiodataBtn" style="margin-top:12px">Parse &amp; review</button>
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
      flow.querySelectorAll('.register-tab').forEach((t) => t.classList.toggle('active', t === tab));
      flow.querySelectorAll('.register-pane').forEach((p) => {
        p.classList.toggle('hidden', p.dataset.pane !== mode);
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
      district: fd.get('district'),
      city: fd.get('city')?.trim() || undefined,
      education: fd.get('education')?.trim() || undefined,
      educationLevel: fd.get('educationLevel') || undefined,
      kul: fd.get('kul')?.trim() || undefined,
      occupation: fd.get('occupation')?.trim() || undefined,
      height: fd.get('height')?.trim() || undefined,
      bio: fd.get('bio')?.trim() || undefined,
    };

    if (!payload.email && !payload.mobile) {
      setModalMessage('Please provide email or mobile.', true);
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const res = await api.register(payload);
      saveAuth({ token: res.data.token, user: res.data.user });
      closeModal();
      enterMainSite();
    } catch (err) {
      setModalMessage(err instanceof ApiError ? err.message : 'Registration failed.', true);
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
  if (form) bindRegisterSubmit(form);
}

async function showManualForm(meta) {
  const pane = document.getElementById('registerManualPane');
  if (!pane || pane.querySelector('#registerForm')) return;
  pane.innerHTML = await reviewFormHtml(meta, {});
  const form = document.getElementById('registerForm');
  if (form) bindRegisterSubmit(form);
}

export async function openRegisterModal() {
  const meta = await getSiteMeta();
  openModal('Register free', pasteStepHtml());
  setModalMessage('');

  const flow = document.getElementById('registerFlow');
  const parseBtn = document.getElementById('parseBiodataBtn');
  const biodataInput = document.getElementById('biodataInput');

  bindRegisterTabs(flow, () => showManualForm(meta));

  parseBtn?.addEventListener('click', async () => {
    const text = biodataInput?.value?.trim();
    if (!text || text.length < 20) {
      setModalMessage('Please paste at least a few lines of biodata.', true);
      return;
    }
    setModalMessage('');
    parseBtn.disabled = true;
    parseBtn.textContent = 'Parsing…';
    try {
      const res = await api.parseBiodata(text);
      await showReviewStep(meta, res.data.parsed, res.data.warnings);
    } catch (err) {
      setModalMessage(err instanceof ApiError ? err.message : 'Could not parse biodata.', true);
    } finally {
      parseBtn.disabled = false;
      parseBtn.textContent = 'Parse & review';
    }
  });
}

export function initRegister() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-open-register]');
    if (!el) return;
    e.preventDefault();
    openRegisterModal();
  });
}
