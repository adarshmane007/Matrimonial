import { api, ApiError } from './api.js';
import { getProfile, setProfile } from './storage.js';
import { getSiteMeta } from './meta.js';
import { applyLanguageToRoot, getLang } from './i18n/index.js';
import { closeFullPageOverlays } from './ui/fullPage.js';
import { isNavLocked, withNavLock } from './ui/navigation.js';
import {
  locationFieldsHtml,
  bindLocationFields,
  locationPayloadFromForm,
  locationFromStoredProfile,
} from './locationSelect.js';

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function optionsHtml(items, selected = '') {
  return items
    .map((i) => `<option value="${i.value}" ${i.value === selected ? 'selected' : ''}>${escapeHtml(i.label)}</option>`)
    .join('');
}

function mapParsedToProfile(parsed) {
  return {
    displayName: parsed.fullName || parsed.displayName || '',
    gender: parsed.gender || 'bride',
    age: parsed.age ?? 25,
    state: parsed.state || 'mh',
    district: parsed.district || 'pune',
    city: parsed.city || '',
    education: parsed.education || '',
    educationLevel: parsed.educationLevel || '',
    occupation: parsed.occupation || '',
    height: parsed.height || '',
    kul: parsed.kul || '',
    salary: parsed.salary || '',
    maritalStatus: parsed.maritalStatus || '',
    diet: parsed.diet || '',
    manglik: parsed.manglik || '',
    employmentType: parsed.employmentType || '',
    nativePlace: parsed.nativePlace || '',
    fatherOccupation: parsed.fatherOccupation || '',
    motherTongue: parsed.motherTongue || '',
    familyType: parsed.familyType || '',
    heightCm: parsed.heightCm || '',
    bio: parsed.bio || '',
  };
}

function profileToFormValues(p = {}) {
  return {
    id: p.id || null,
    displayName: p.displayName || p.fullName || '',
    gender: p.gender || 'bride',
    age: p.age ?? 26,
    state: p.state || 'mh',
    district: p.district || 'pune',
    city: p.city || '',
    nativePlace: p.nativePlace || '',
    education: p.education || '',
    educationLevel: p.educationLevel || '',
    occupation: p.occupation || '',
    height: p.height || '',
    heightCm: p.heightCm ? String(p.heightCm) : '',
    kul: p.kul || '',
    salary: p.salary || '',
    incomeBracket: p.incomeBracket || '',
    maritalStatus: p.maritalStatus || 'never_married',
    diet: p.diet || '',
    manglik: p.manglik || '',
    employmentType: p.employmentType || '',
    motherTongue: p.motherTongue || 'marathi',
    familyType: p.familyType || '',
    fatherOccupation: p.fatherOccupation || '',
    bio: p.bio || '',
    photoUrl: p.photoUrl || '',
    email: p.email || '',
    mobile: p.mobile || '',
  };
}

function filterAny(list) {
  return (list || []).filter((i) => i.value && i.value !== 'any');
}

function formHtml(meta, values) {
  const v = values;
  const locValues = locationFromStoredProfile(v);
  const eduLevels = (meta.educationLevels || []).filter((e) => e.value !== 'any');
  const marital = filterAny(meta.maritalStatuses);
  const diets = filterAny(meta.diets);
  const manglik = filterAny(meta.manglikOptions);
  const employment = filterAny(meta.employmentTypes);
  const tongues = filterAny(meta.motherTongues);
  const families = filterAny(meta.familyTypes);
  const incomes = filterAny(meta.incomeBrackets);
  const heights = filterAny(meta.heights);
  const photoPreview = v.photoUrl
    ? `<img src="${escapeHtml(v.photoUrl)}" alt="Profile photo" class="profile-photo-preview" id="profilePhotoPreview">`
    : `<div class="profile-photo-placeholder" id="profilePhotoPreview">📷</div>`;

  const hasProfile = !!(values.id || getProfile()?.id);
  const titleKey = hasProfile ? 'profile.titleEdit' : 'profile.titleCreate';

  return `
    <form id="myProfileForm" class="profile-page-form">
      <div class="profile-page-top">
        <div>
          <p class="profile-page-label" data-i18n="profile.label">My matrimonial profile</p>
          <h1 class="profile-page-title" data-i18n="${titleKey}">Create your profile</h1>
          <p class="profile-page-sub" data-i18n="profile.sub">Details from registration are pre-filled. Add photo, salary, and about you — or upload biodata PDF to auto-fill.</p>
        </div>
        <button type="button" class="profile-page-back" id="profilePageBack" data-i18n="profile.back">← Back to home</button>
      </div>

      <div class="profile-biodata-upload card-panel">
        <h3 class="card-panel-title" data-i18n="profile.biodataTitle">Upload biodata PDF</h3>
        <p class="modal-hint" data-i18n="profile.biodataHint">Upload a searchable PDF — we scan Marathi or English biodata and fill fields automatically.</p>
        <div class="profile-pdf-row">
          <input type="file" id="biodataPdfInput" accept=".pdf,application/pdf" class="profile-file-input">
          <button type="button" class="btn-secondary" id="scanPdfBtn" data-i18n="profile.scanPdf">Scan PDF &amp; fill fields</button>
        </div>
        <p id="pdfScanStatus" class="profile-status" hidden></p>
      </div>

      <div class="profile-page-grid">
        <aside class="profile-photo-card card-panel">
          <h3 class="card-panel-title" data-i18n="profile.photoTitle">Profile photo</h3>
          <div class="profile-photo-wrap">${photoPreview}</div>
          <label class="btn-secondary profile-upload-btn">
            <span data-i18n="profile.addPhoto">Add photo</span>
            <input type="file" id="profilePhotoInput" accept="image/jpeg,image/png,image/webp" hidden>
          </label>
          <p class="modal-hint" data-i18n="profile.photoHint">JPG or PNG, max 1 MB</p>
        </aside>

        <div class="profile-fields-card card-panel">
          <h3 class="card-panel-title" data-i18n="profile.personalTitle">Personal details</h3>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" data-i18n="profile.fullName">Full name *</label>
              <input class="form-input" name="displayName" required maxlength="120" value="${escapeHtml(v.displayName)}">
            </div>
            <div class="form-group">
              <label class="form-label" data-i18n="profile.gender">Gender *</label>
              <select class="form-select" name="gender" required>${optionsHtml(meta.genders, v.gender)}</select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" data-i18n="profile.email">Email</label>
              <input class="form-input" type="email" value="${escapeHtml(v.email)}" readonly disabled>
            </div>
            <div class="form-group">
              <label class="form-label" data-i18n="profile.mobile">Mobile</label>
              <input class="form-input" value="${escapeHtml(v.mobile)}" readonly disabled>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" data-i18n="profile.age">Age *</label>
              <input class="form-input" type="number" name="age" min="18" max="80" required value="${v.age}">
            </div>
            <div class="form-group">
              <label class="form-label" data-i18n="profile.height">Height</label>
              <select class="form-select" name="heightCm">
                <option value="" data-i18n="profile.select">— Select —</option>
                ${optionsHtml(heights, v.heightCm)}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" data-i18n="profile.marital">Marital status</label>
              <select class="form-select" name="maritalStatus">${optionsHtml(marital, v.maritalStatus)}</select>
            </div>
            <div class="form-group">
              <label class="form-label" data-i18n="profile.motherTongue">Mother tongue</label>
              <select class="form-select" name="motherTongue">${optionsHtml(tongues, v.motherTongue)}</select>
            </div>
          </div>
          ${locationFieldsHtml(meta, locValues)}
          <div class="form-group">
            <label class="form-label" data-i18n="profile.nativePlace">Native place</label>
            <input class="form-input" name="nativePlace" value="${escapeHtml(v.nativePlace)}" maxlength="80">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" data-i18n="profile.education">Education</label>
              <input class="form-input" name="education" value="${escapeHtml(v.education)}">
            </div>
            <div class="form-group">
              <label class="form-label" data-i18n="profile.educationLevel">Education level</label>
              <select class="form-select" name="educationLevel">
                <option value="">—</option>
                ${optionsHtml(eduLevels, v.educationLevel)}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" data-i18n="profile.occupation">Occupation</label>
              <input class="form-input" name="occupation" value="${escapeHtml(v.occupation)}">
            </div>
            <div class="form-group">
              <label class="form-label" data-i18n="profile.employedIn">Employed in</label>
              <select class="form-select" name="employmentType">
                <option value="">—</option>
                ${optionsHtml(employment, v.employmentType)}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" data-i18n="profile.income">Annual income bracket</label>
              <select class="form-select" name="incomeBracket">
                <option value="">—</option>
                ${optionsHtml(incomes, v.incomeBracket)}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" data-i18n="profile.salary">Salary (optional text)</label>
              <input class="form-input" name="salary" value="${escapeHtml(v.salary)}" data-i18n-placeholder="profile.salaryPh" placeholder="e.g. 8–10 LPA">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" data-i18n="profile.kul">Kul</label>
              <input class="form-input" name="kul" value="${escapeHtml(v.kul)}" data-i18n-placeholder="profile.kulPh" placeholder="e.g. Patil Kul">
            </div>
            <div class="form-group">
              <label class="form-label" data-i18n="profile.diet">Diet</label>
              <select class="form-select" name="diet">
                <option value="">—</option>
                ${optionsHtml(diets, v.diet)}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" data-i18n="profile.manglik">Manglik</label>
              <select class="form-select" name="manglik">
                <option value="">—</option>
                ${optionsHtml(manglik, v.manglik)}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" data-i18n="profile.familyType">Family type</label>
              <select class="form-select" name="familyType">
                <option value="">—</option>
                ${optionsHtml(families, v.familyType)}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" data-i18n="profile.fatherOcc">Father's occupation</label>
            <input class="form-input" name="fatherOccupation" value="${escapeHtml(v.fatherOccupation)}" maxlength="120">
          </div>
          <div class="form-group">
            <label class="form-label" data-i18n="profile.about">About you</label>
            <textarea class="form-input profile-about" name="bio" rows="5" maxlength="8000" data-i18n-placeholder="profile.aboutPh" placeholder="Tell families about yourself, values, and expectations…">${escapeHtml(v.bio)}</textarea>
          </div>
          <input type="hidden" name="photoUrl" id="profilePhotoUrl" value="${escapeHtml(v.photoUrl)}">
          <p id="profileSaveMessage" class="profile-status" hidden></p>
          <button type="submit" class="btn-login profile-save-btn" data-i18n="profile.save">Save profile</button>
        </div>
      </div>
    </form>
  `;
}

function setStatus(el, msg, isError = false) {
  if (!el) return;
  el.textContent = msg || '';
  el.hidden = !msg;
  el.classList.toggle('is-error', isError);
}

function fillFormFromParsed(form, parsed) {
  const mapped = mapParsedToProfile(parsed);
  const set = (name, val) => {
    const field = form.elements[name];
    if (field && val !== undefined && val !== null) field.value = val;
  };
  set('displayName', mapped.displayName);
  set('gender', mapped.gender);
  set('age', mapped.age);
  return mapped;
  set('education', mapped.education);
  set('educationLevel', mapped.educationLevel);
  set('occupation', mapped.occupation);
  set('height', mapped.height);
  set('kul', mapped.kul);
  set('salary', mapped.salary);
  set('bio', mapped.bio);
  set('maritalStatus', mapped.maritalStatus);
  set('diet', mapped.diet);
  set('manglik', mapped.manglik);
  set('employmentType', mapped.employmentType);
  set('nativePlace', mapped.nativePlace);
  set('fatherOccupation', mapped.fatherOccupation);
  set('motherTongue', mapped.motherTongue);
  set('familyType', mapped.familyType);
  if (mapped.heightCm) set('heightCm', String(mapped.heightCm));
}

export function closeProfilePage() {
  document.body.classList.remove('on-profile-page');
  const page = document.getElementById('profile-page');
  if (page) page.hidden = true;
}

let profilePageMounted = false;
let profileMetaCache = null;

function renderProfileForm(page, meta, p) {
  const formValues = profileToFormValues(p);
  page.innerHTML = formHtml(meta, formValues);
  applyLanguageToRoot(page, getLang());
  bindProfilePageEvents(meta);
  bindLocationFields(page, locationFromStoredProfile(formValues));
}

export async function openProfilePage() {
  const page = document.getElementById('profile-page');
  if (!page || isNavLocked('profile')) return;

  return withNavLock('profile', async () => {
    closeFullPageOverlays({ except: 'profile' });
    document.body.classList.add('on-profile-page');
    page.hidden = false;
    window.scrollTo(0, 0);

    const cached = getProfile();
    const metaPromise = profileMetaCache ? Promise.resolve(profileMetaCache) : getSiteMeta();

    if (cached?.displayName && profilePageMounted && profileMetaCache) {
      renderProfileForm(page, profileMetaCache, cached);
    } else {
      page.innerHTML = '<p class="profile-loading">Loading your profile…</p>';
    }

    try {
      const [metaRes, profileRes] = await Promise.all([
        metaPromise,
        api.getMyProfile().catch(() => ({ data: getProfile() })),
      ]);
      profileMetaCache = metaRes;
      profilePageMounted = true;
      const p = profileRes?.data || getProfile() || {};
      if (p) setProfile(p);
      renderProfileForm(page, metaRes, p);
    } catch (err) {
      if (!cached?.displayName) {
        page.innerHTML = `<p class="profile-status is-error">${escapeHtml(err.message || 'Could not load profile')}</p>`;
      }
    }
  });
}

function bindProfilePageEvents(meta) {
  document.getElementById('profilePageBack')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeProfilePage();
  });

  const photoInput = document.getElementById('profilePhotoInput');
  const photoUrlField = document.getElementById('profilePhotoUrl');
  const photoPreview = document.getElementById('profilePhotoPreview');

  photoInput?.addEventListener('change', () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setStatus(document.getElementById('profileSaveMessage'), 'Photo must be under 1 MB.', true);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (photoUrlField) photoUrlField.value = dataUrl;
      if (photoPreview?.tagName === 'IMG') {
        photoPreview.src = dataUrl;
      } else if (photoPreview) {
        const img = document.createElement('img');
        img.src = dataUrl;
        img.alt = 'Profile photo';
        img.className = 'profile-photo-preview';
        img.id = 'profilePhotoPreview';
        photoPreview.replaceWith(img);
      }
    };
    reader.readAsDataURL(file);
  });

  const scanBtn = document.getElementById('scanPdfBtn');
  const pdfInput = document.getElementById('biodataPdfInput');
  const pdfStatus = document.getElementById('pdfScanStatus');

  scanBtn?.addEventListener('click', async () => {
    const file = pdfInput?.files?.[0];
    if (!file) {
      setStatus(pdfStatus, 'Choose a PDF file first.', true);
      return;
    }
    setStatus(pdfStatus, 'Scanning PDF…');
    scanBtn.disabled = true;
    try {
      const res = await api.parseBiodataPdf(file);
      const form = document.getElementById('myProfileForm');
      if (form && res?.data?.parsed) {
        const mapped = fillFormFromParsed(form, res.data.parsed);
        await bindLocationFields(document.getElementById('profile-page'), locationFromStoredProfile(mapped));
        const warn = res.data.warnings?.length
          ? ` Filled with notes: ${res.data.warnings.join('; ')}`
          : '';
        setStatus(pdfStatus, `Fields updated from PDF.${warn}`);
      }
    } catch (err) {
      setStatus(pdfStatus, err instanceof ApiError ? err.message : 'PDF scan failed.', true);
    } finally {
      scanBtn.disabled = false;
    }
  });

  const form = document.getElementById('myProfileForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById('profileSaveMessage');
    setStatus(msgEl, '');
    const fd = new FormData(form);
    const payload = {
      displayName: fd.get('displayName')?.trim(),
      gender: fd.get('gender'),
      age: Number(fd.get('age')),
      ...locationPayloadFromForm(form),
      education: fd.get('education')?.trim() || undefined,
      educationLevel: fd.get('educationLevel') || undefined,
      occupation: fd.get('occupation')?.trim() || undefined,
      height: fd.get('height')?.trim() || undefined,
      kul: fd.get('kul')?.trim() || undefined,
      salary: fd.get('salary')?.trim() || undefined,
      incomeBracket: fd.get('incomeBracket') || undefined,
      maritalStatus: fd.get('maritalStatus') || undefined,
      diet: fd.get('diet') || undefined,
      manglik: fd.get('manglik') || undefined,
      employmentType: fd.get('employmentType') || undefined,
      motherTongue: fd.get('motherTongue') || undefined,
      familyType: fd.get('familyType') || undefined,
      nativePlace: fd.get('nativePlace')?.trim() || undefined,
      fatherOccupation: fd.get('fatherOccupation')?.trim() || undefined,
      heightCm: fd.get('heightCm') ? Number(fd.get('heightCm')) : undefined,
      bio: fd.get('bio')?.trim() || undefined,
      photoUrl: fd.get('photoUrl')?.trim() || undefined,
    };

    const btn = form.querySelector('.profile-save-btn');
    btn.disabled = true;
    try {
      const res = await api.updateMyProfile(payload);
      if (res?.data) {
        setProfile(res.data);
        setStatus(msgEl, 'Profile saved successfully.');
        const { updateNavAuth } = await import('./ui/nav.js');
        updateNavAuth();
      }
    } catch (err) {
      setStatus(msgEl, err instanceof ApiError ? err.message : 'Could not save profile.', true);
    } finally {
      btn.disabled = false;
    }
  });
}

export function initMyProfile() {
  document.addEventListener('smm:lang-change', () => {
    if (!document.body.classList.contains('on-profile-page')) return;
    const page = document.getElementById('profile-page');
    if (page) {
      import('./i18n/index.js').then(({ applyLanguageToRoot }) => {
        applyLanguageToRoot(page);
      });
    }
  });

  const openProfileIfAllowed = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!document.body.classList.contains('on-main-site')) return;
    if (document.body.classList.contains('on-profile-page')) return;
    openProfilePage();
  };

  document.querySelectorAll('[data-open-profile]').forEach((el) => {
    el.addEventListener('click', openProfileIfAllowed);
  });
}
