import { api, ApiError } from './api.js';
import { getSiteMeta } from './meta.js';
import { getLang } from './i18n/index.js';
import { renderProfilesGrid } from './profiles.js';
import { enterMainSite } from './ui/session.js';
let metaCache = null;
let currentPage = 1;

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function optionsHtml(items, selected = '') {
  return (items || [])
    .map(
      (i) =>
        `<option value="${escapeHtml(i.value)}" ${String(i.value) === String(selected) ? 'selected' : ''}>${escapeHtml(i.label)}</option>`
    )
    .join('');
}

function ageOptions(min, max, selected) {
  const opts = [];
  for (let a = min; a <= max; a++) {
    opts.push(`<option value="${a}" ${a === selected ? 'selected' : ''}>${a}</option>`);
  }
  return opts.join('');
}

function filtersHtml(meta) {
  return `
    <form id="browseFiltersForm" class="browse-filters-form">
      <div class="browse-filter-section">
        <h3 class="browse-filter-heading" data-i18n="browse.basic">Basic</h3>
        <div class="gender-toggle browse-gender-toggle">
          <button type="button" class="gender-btn active" data-gender="bride" data-i18n="search.bride">Bride</button>
          <button type="button" class="gender-btn" data-gender="groom" data-i18n="search.groom">Groom</button>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" data-i18n="search.ageFrom">Age From</label>
            <select class="form-select" name="ageFrom" id="browseAgeFrom">${ageOptions(21, 45, 21)}</select>
          </div>
          <div class="form-group">
            <label class="form-label" data-i18n="search.ageTo">Age To</label>
            <select class="form-select" name="ageTo" id="browseAgeTo">${ageOptions(22, 50, 35)}</select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" data-i18n="browse.marital">Marital Status</label>
          <select class="form-select" name="maritalStatus">${optionsHtml(meta.maritalStatuses, 'any')}</select>
        </div>
      </div>

      <div class="browse-filter-section">
        <h3 class="browse-filter-heading" data-i18n="browse.location">Location &amp; Community</h3>
        <div class="form-group">
          <label class="form-label" data-i18n="search.district">District</label>
          <select class="form-select" name="district">${optionsHtml(meta.districts, 'all')}</select>
        </div>
        <div class="form-group">
          <label class="form-label" data-i18n="browse.kul">Kul / Subcaste</label>
          <input class="form-input" name="kul" placeholder="e.g. Patil Kul" maxlength="60">
        </div>
        <div class="form-group">
          <label class="form-label" data-i18n="browse.motherTongue">Mother Tongue</label>
          <select class="form-select" name="motherTongue">${optionsHtml(meta.motherTongues, 'any')}</select>
        </div>
      </div>

      <div class="browse-filter-section">
        <h3 class="browse-filter-heading" data-i18n="browse.education">Education &amp; Career</h3>
        <div class="form-group">
          <label class="form-label" data-i18n="search.education">Education</label>
          <select class="form-select" name="education">${optionsHtml(meta.educationLevels, 'any')}</select>
        </div>
        <div class="form-group">
          <label class="form-label" data-i18n="browse.occupation">Occupation</label>
          <input class="form-input" name="occupation" placeholder="Engineer, Doctor…" maxlength="80">
        </div>
        <div class="form-group">
          <label class="form-label" data-i18n="browse.employment">Employed In</label>
          <select class="form-select" name="employmentType">${optionsHtml(meta.employmentTypes, 'any')}</select>
        </div>
        <div class="form-group">
          <label class="form-label" data-i18n="browse.income">Annual Income</label>
          <select class="form-select" name="incomeBracket">${optionsHtml(meta.incomeBrackets, 'any')}</select>
        </div>
      </div>

      <div class="browse-filter-section">
        <h3 class="browse-filter-heading" data-i18n="browse.lifestyle">Lifestyle</h3>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" data-i18n="browse.heightFrom">Height From</label>
            <select class="form-select" name="heightFrom">${optionsHtml(meta.heights, '')}</select>
          </div>
          <div class="form-group">
            <label class="form-label" data-i18n="browse.heightTo">Height To</label>
            <select class="form-select" name="heightTo">${optionsHtml(meta.heights, '')}</select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" data-i18n="browse.diet">Diet</label>
          <select class="form-select" name="diet">${optionsHtml(meta.diets, 'any')}</select>
        </div>
        <div class="form-group">
          <label class="form-label" data-i18n="browse.manglik">Manglik</label>
          <select class="form-select" name="manglik">${optionsHtml(meta.manglikOptions, 'any')}</select>
        </div>
        <div class="form-group">
          <label class="form-label" data-i18n="browse.family">Family Type</label>
          <select class="form-select" name="familyType">${optionsHtml(meta.familyTypes, 'any')}</select>
        </div>
      </div>

      <div class="browse-filter-section browse-filter-checks">
        <label class="browse-check">
          <input type="checkbox" name="verifiedOnly" value="true">
          <span data-i18n="browse.verifiedOnly">Verified profiles only</span>
        </label>
        <label class="browse-check">
          <input type="checkbox" name="withPhotoOnly" value="true">
          <span data-i18n="browse.withPhoto">With photo only</span>
        </label>
      </div>

      <div class="form-group">
        <label class="form-label" data-i18n="browse.sort">Sort by</label>
        <select class="form-select" name="sort">${optionsHtml(meta.sortOptions, 'recent')}</select>
      </div>

      <div class="browse-filter-actions">
        <button type="submit" class="btn-login browse-apply-btn" data-i18n="browse.apply">Apply Filters</button>
        <button type="button" class="btn-secondary browse-reset-btn" id="browseResetBtn" data-i18n="browse.reset">Reset</button>
      </div>
    </form>
  `;
}

function pageShell(meta) {
  return `
    <div class="browse-page-inner">
      <div class="browse-page-header">
        <div>
          <p class="profile-page-label" data-i18n="browse.label">Search Profiles</p>
          <h1 class="profile-page-title" data-i18n="browse.title">Browse Maratha Profiles</h1>
          <p class="profile-page-sub" data-i18n="browse.sub">Filter by age, location, education, kul, income &amp; more — like leading Indian matrimonial platforms.</p>
        </div>
        <button type="button" class="profile-page-back" id="browsePageBack" data-i18n="browse.back">← Back</button>
      </div>
      <button type="button" class="browse-filters-toggle" id="browseFiltersToggle" aria-expanded="false">
        <span data-i18n="browse.showFilters">Show Filters</span>
        <span class="browse-filter-count" id="browseActiveCount" hidden></span>
      </button>
      <div class="browse-layout">
        <aside class="browse-sidebar" id="browseSidebar">
          <div class="browse-sidebar-inner card-panel">
            ${filtersHtml(meta)}
          </div>
        </aside>
        <main class="browse-results">
          <div class="browse-results-header">
            <p class="browse-results-count" id="browseResultsCount"></p>
          </div>
          <div class="profiles-grid" id="browseProfilesGrid"></div>
          <div class="browse-pagination" id="browsePagination" hidden></div>
        </main>
      </div>
    </div>
  `;
}

function getSelectedGender(form) {
  const active = form?.querySelector('.browse-gender-toggle .gender-btn.active');
  return active?.dataset.gender || 'bride';
}

function collectFilters(form) {
  const fd = new FormData(form);
  const params = {
    gender: getSelectedGender(form),
    ageFrom: fd.get('ageFrom'),
    ageTo: fd.get('ageTo'),
    district: fd.get('district') || 'all',
    education: fd.get('education') || 'any',
    maritalStatus: fd.get('maritalStatus') || 'any',
    motherTongue: fd.get('motherTongue') || 'any',
    employmentType: fd.get('employmentType') || 'any',
    incomeBracket: fd.get('incomeBracket') || 'any',
    diet: fd.get('diet') || 'any',
    manglik: fd.get('manglik') || 'any',
    familyType: fd.get('familyType') || 'any',
    sort: fd.get('sort') || 'recent',
    lang: getLang(),
    page: currentPage,
    limit: 12,
  };
  const kul = fd.get('kul')?.trim();
  const occupation = fd.get('occupation')?.trim();
  const heightFrom = fd.get('heightFrom');
  const heightTo = fd.get('heightTo');
  if (kul) params.kul = kul;
  if (occupation) params.occupation = occupation;
  if (heightFrom) params.heightFrom = heightFrom;
  if (heightTo) params.heightTo = heightTo;
  if (fd.get('verifiedOnly') === 'true') params.verifiedOnly = 'true';
  if (fd.get('withPhotoOnly') === 'true') params.withPhotoOnly = 'true';
  return params;
}

function countActiveFilters(params) {
  let n = 0;
  if (params.district !== 'all') n++;
  if (params.education !== 'any') n++;
  if (params.maritalStatus !== 'any') n++;
  if (params.kul) n++;
  if (params.verifiedOnly) n++;
  if (params.withPhotoOnly) n++;
  return n;
}

async function runSearch(form) {
  const grid = document.getElementById('browseProfilesGrid');
  const countEl = document.getElementById('browseResultsCount');
  const paginationEl = document.getElementById('browsePagination');
  if (!grid) return;

  grid.innerHTML =
    '<p class="profiles-empty" style="grid-column:1/-1;text-align:center;padding:32px;color:var(--warm-muted)">Searching…</p>';

  try {
    const params = collectFilters(form);
    const res = await api.search(params);
    const profiles = res?.data?.profiles || [];
    const pag = res?.data?.pagination;

    renderProfilesGrid(grid, profiles);

    if (countEl) {
      const total = pag?.total ?? profiles.length;
      countEl.textContent =
        total === 0
          ? 'No profiles match your filters.'
          : `Showing ${profiles.length} of ${total} profile${total === 1 ? '' : 's'}`;
    }

    const activeCount = document.getElementById('browseActiveCount');
    const n = countActiveFilters(params);
    if (activeCount) {
      activeCount.textContent = n > 0 ? String(n) : '';
      activeCount.hidden = n === 0;
    }

    if (paginationEl && pag && pag.totalPages > 1) {
      paginationEl.hidden = false;
      paginationEl.innerHTML = `
        <button type="button" class="btn-secondary" id="browsePrev" ${pag.page <= 1 ? 'disabled' : ''}>← Previous</button>
        <span>Page ${pag.page} of ${pag.totalPages}</span>
        <button type="button" class="btn-secondary" id="browseNext" ${pag.page >= pag.totalPages ? 'disabled' : ''}>Next →</button>
      `;
      document.getElementById('browsePrev')?.addEventListener('click', () => {
        currentPage = Math.max(1, pag.page - 1);
        runSearch(form);
      });
      document.getElementById('browseNext')?.addEventListener('click', () => {
        currentPage = pag.page + 1;
        runSearch(form);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    } else if (paginationEl) {
      paginationEl.hidden = true;
    }
  } catch (err) {
    grid.innerHTML = `<p class="profiles-empty is-error">${escapeHtml(err instanceof ApiError ? err.message : 'Search failed')}</p>`;
  }

  if (window.__applySiteLanguage) window.__applySiteLanguage(getLang());
}

function bindBrowseEvents(meta) {
  const form = document.getElementById('browseFiltersForm');
  const sidebar = document.getElementById('browseSidebar');
  const toggle = document.getElementById('browseFiltersToggle');

  form?.querySelectorAll('.browse-gender-toggle .gender-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      form.querySelectorAll('.browse-gender-toggle .gender-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    currentPage = 1;
    runSearch(form);
    sidebar?.classList.remove('is-open');
    document.body.classList.remove('browse-filters-open');
    toggle?.setAttribute('aria-expanded', 'false');
  });

  document.getElementById('browseResetBtn')?.addEventListener('click', () => {
    form?.reset();
    form?.querySelectorAll('.browse-gender-toggle .gender-btn').forEach((b, i) => {
      b.classList.toggle('active', i === 0);
    });
    currentPage = 1;
    runSearch(form);
  });

  toggle?.addEventListener('click', () => {
    const open = sidebar?.classList.toggle('is-open');
    document.body.classList.toggle('browse-filters-open', !!open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    const label = toggle.querySelector('span');
    if (label) {
      label.textContent = open ? 'Hide Filters' : 'Show Filters';
      label.setAttribute('data-i18n', open ? 'browse.hideFilters' : 'browse.showFilters');
      if (window.__applySiteLanguage) window.__applySiteLanguage(getLang());
    }
  });

  document.getElementById('browsePageBack')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeBrowsePage();
  });
}

export function closeBrowsePage() {
  document.body.classList.remove('on-browse-page', 'browse-filters-open');
  const page = document.getElementById('browse-page');
  if (page) page.hidden = true;
}

export async function openBrowsePage(initial = {}) {
  const page = document.getElementById('browse-page');
  if (!page) return;

  if (!document.body.classList.contains('on-main-site')) {
    enterMainSite();
  }

  document.body.classList.add('on-browse-page');
  page.hidden = false;
  page.innerHTML = '<p class="profile-loading">Loading…</p>';
  window.scrollTo(0, 0);
  currentPage = 1;

  try {
    metaCache = metaCache || (await getSiteMeta());
    page.innerHTML = pageShell(metaCache);
    bindBrowseEvents(metaCache);

    const form = document.getElementById('browseFiltersForm');
    if (initial.gender && form) {
      form.querySelectorAll('.browse-gender-toggle .gender-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.gender === initial.gender);
      });
    }
    if (initial.ageFrom && form?.elements.ageFrom) form.elements.ageFrom.value = initial.ageFrom;
    if (initial.ageTo && form?.elements.ageTo) form.elements.ageTo.value = initial.ageTo;
    if (initial.district && form?.elements.district) form.elements.district.value = initial.district;
    if (initial.education && form?.elements.education) form.elements.education.value = initial.education;

    await runSearch(form);
    if (window.__applySiteLanguage) window.__applySiteLanguage(getLang());
  } catch (err) {
    page.innerHTML = `<p class="profile-status is-error">${escapeHtml(err.message)}</p>`;
  }
}

export function initBrowseProfiles() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-open-browse]');
    if (!link) return;
    e.preventDefault();

    const initial = {};
    if (link.dataset.browseGender) initial.gender = link.dataset.browseGender;
    openBrowsePage(initial);
  });

}
