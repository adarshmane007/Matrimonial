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
    const any = (label) => [{ value: 'any', label }];
    return {
      states: [
        { value: 'mh', label: 'Maharashtra' },
        { value: 'ka', label: 'Karnataka' },
        { value: 'dl', label: 'Delhi' },
      ],
      cityOtherValue: '__other__',
      districts: [{ value: 'all', label: 'All Maharashtra' }, ...FALLBACK_DISTRICTS],
      educationLevels: [{ value: 'any', label: 'Any Education' }, ...FALLBACK_EDUCATION],
      genders: [
        { value: 'bride', label: 'Bride' },
        { value: 'groom', label: 'Groom' },
      ],
      maritalStatuses: [...any('Any'), { value: 'never_married', label: 'Never Married' }],
      diets: [...any('Any'), { value: 'veg', label: 'Vegetarian' }],
      manglikOptions: [...any('Any'), { value: 'no', label: 'Non-Manglik' }],
      employmentTypes: [...any('Any'), { value: 'private', label: 'Private Sector' }],
      motherTongues: [...any('Any'), { value: 'marathi', label: 'Marathi' }],
      familyTypes: [...any('Any'), { value: 'joint', label: 'Joint Family' }],
      incomeBrackets: [...any('Any Income'), { value: '5_10', label: '₹5 – 10 Lakh' }],
      heights: [{ value: '', label: 'Any' }],
      sortOptions: [{ value: 'recent', label: 'Recently joined' }],
    };
  }
}

export function clearMetaCache() {
  cached = null;
}
