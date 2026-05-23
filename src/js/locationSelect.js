import { api } from './api.js';
import { getLang, t } from './i18n/index.js';

export const CITY_OTHER = '__other__';

const cityCache = new Map();

function optionsHtml(items, selected = '') {
  return items
    .map((i) => `<option value="${i.value}" ${String(i.value) === String(selected) ? 'selected' : ''}>${i.label}</option>`)
    .join('');
}

export function locationFieldsHtml(meta, values = {}) {
  const states = meta.states || [];
  const state = values.state || 'mh';
  const cityKey = values.cityKey || '';
  const cityCustom = values.cityCustom || '';
  const isOther = cityKey === CITY_OTHER;

  return `
    <div class="form-row location-fields" data-location-fields>
      <div class="form-group">
        <label class="form-label" data-i18n="profile.state">State *</label>
        <select class="form-select" name="state" id="locState" required>
          <option value="">${escapeAttr(t('location.selectState'))}</option>
          ${optionsHtml(states, state)}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" data-i18n="profile.city">City *</label>
        <select class="form-select" name="cityKey" id="locCityKey" required>
          <option value="">${escapeAttr(t('location.selectCity'))}</option>
        </select>
      </div>
    </div>
    <div class="form-group loc-city-other ${isOther ? '' : 'hidden'}" id="locCityOtherWrap">
      <label class="form-label" data-i18n="profile.cityOther">Other city name *</label>
      <input class="form-input" name="cityCustom" id="locCityCustom" maxlength="80" value="${escapeAttr(cityCustom)}" placeholder="${escapeAttr(t('location.cityPlaceholder'))}">
    </div>
  `;
}

function escapeAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

async function fetchCities(state) {
  if (!state) return [];
  const key = `${state}:${getLang()}`;
  if (cityCache.has(key)) return cityCache.get(key);
  try {
    const res = await api.getCities(state, getLang());
    const list = res?.data || [];
    cityCache.set(key, list);
    return list;
  } catch {
    return [];
  }
}

export async function bindLocationFields(root, values = {}) {
  const wrap = root?.querySelector?.('[data-location-fields]')?.closest('form') || root;
  if (!wrap) return;

  const stateSel = wrap.querySelector('#locState');
  const citySel = wrap.querySelector('#locCityKey');
  const otherWrap = wrap.querySelector('#locCityOtherWrap');
  const otherInput = wrap.querySelector('#locCityCustom');

  if (!stateSel || !citySel) return;

  async function fillCities(state, selectedKey = '') {
    const cityPlaceholder = t('location.selectCity');
    citySel.innerHTML = `<option value="">${cityPlaceholder}</option>`;
    if (!state) {
      citySel.disabled = true;
      return;
    }
    citySel.disabled = true;
    const cities = await fetchCities(state);
    citySel.innerHTML = `<option value="">${cityPlaceholder}</option>${optionsHtml(cities, selectedKey)}`;
    citySel.disabled = false;
  }

  function syncOtherVisibility() {
    const isOther = citySel.value === CITY_OTHER;
    otherWrap?.classList.toggle('hidden', !isOther);
    if (otherInput) {
      otherInput.required = isOther;
      if (!isOther) otherInput.value = '';
    }
  }

  stateSel.addEventListener('change', async () => {
    await fillCities(stateSel.value, '');
    syncOtherVisibility();
  });

  citySel.addEventListener('change', syncOtherVisibility);

  const initialState = values.state || stateSel.value || 'mh';
  if (initialState && !stateSel.value) stateSel.value = initialState;

  await fillCities(stateSel.value || initialState, values.cityKey || '');
  if (values.cityKey) citySel.value = values.cityKey;
  reconcileCitySelection(citySel, values);
  syncOtherVisibility();
}

export function readLocationFromForm(form) {
  const state = form.elements.state?.value?.trim();
  const cityKey = form.elements.cityKey?.value?.trim();
  const cityCustom = form.elements.cityCustom?.value?.trim();
  return { state, cityKey, cityCustom };
}

export function locationFromStoredProfile(p = {}) {
  return {
    state: p.state || 'mh',
    cityKey: p.district || '',
    cityCustom: p.city || '',
  };
}

/** Payload for API from form location fields. */
export function locationPayloadFromForm(form) {
  const { state, cityKey, cityCustom } = readLocationFromForm(form);
  return {
    state,
    cityKey,
    cityCustom: cityKey === CITY_OTHER ? cityCustom : undefined,
  };
}

/** After cities load, fix cityKey if slug not in dropdown (legacy/custom). */
export async function bindBrowseLocationFilters(form, meta, initial = {}) {
  if (!form) return;
  const stateSel = form.querySelector('#browseFilterState');
  const citySel = form.querySelector('#browseFilterCity');
  if (!stateSel || !citySel) return;

  const anyLabel = t('browse.allCities');

  async function fillCities(state, selected = 'all') {
    citySel.innerHTML = `<option value="all">${anyLabel}</option>`;
    if (!state || state === 'all') {
      citySel.disabled = true;
      return;
    }
    citySel.disabled = true;
    const cities = await fetchCities(state);
    citySel.innerHTML = `<option value="all">${anyLabel}</option>${optionsHtml(cities, selected)}`;
    citySel.disabled = false;
  }

  stateSel.addEventListener('change', () => fillCities(stateSel.value, 'all'));

  if (initial.state) stateSel.value = initial.state;
  await fillCities(stateSel.value || 'all', initial.district || 'all');
}

export function reconcileCitySelection(citySel, values) {
  if (!citySel || !values.cityKey) return;
  const has = [...citySel.options].some((o) => o.value === values.cityKey);
  if (!has && values.cityKey !== CITY_OTHER) {
    citySel.value = CITY_OTHER;
    const otherInput = citySel.form?.querySelector('#locCityCustom');
    if (otherInput) otherInput.value = values.cityCustom || values.cityKey;
    citySel.form?.querySelector('#locCityOtherWrap')?.classList.remove('hidden');
  }
}
