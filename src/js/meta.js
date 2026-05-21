import { api } from './api.js';
import { FALLBACK_DISTRICTS, FALLBACK_EDUCATION } from './constants.js';
import { getLang } from './i18n/index.js';

let cached = null;

export async function getSiteMeta() {
  if (cached) return cached;
  try {
    const res = await api.getMeta(getLang());
    cached = res?.data;
    return cached;
  } catch {
    return {
      districts: FALLBACK_DISTRICTS,
      educationLevels: [{ value: 'any', label: 'Any Education' }, ...FALLBACK_EDUCATION],
      genders: [
        { value: 'bride', label: 'Bride' },
        { value: 'groom', label: 'Groom' },
      ],
    };
  }
}

export function clearMetaCache() {
  cached = null;
}
