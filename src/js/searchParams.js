/** Clean browse/search query params so the API validator accepts them. */
const ANY_KEYS = [
  'education',
  'maritalStatus',
  'motherTongue',
  'employmentType',
  'incomeBracket',
  'diet',
  'manglik',
  'familyType',
];

const INT_KEYS = ['ageFrom', 'ageTo', 'heightFrom', 'heightTo', 'page', 'limit'];

export function sanitizeSearchParams(raw) {
  const p = { ...raw };

  for (const key of INT_KEYS) {
    if (p[key] === undefined || p[key] === null || p[key] === '') continue;
    const n = parseInt(String(p[key]), 10);
    if (Number.isFinite(n)) p[key] = n;
    else delete p[key];
  }

  if (p.state === 'all' || !p.state) delete p.state;
  if (p.district === 'all' || !p.district) delete p.district;

  for (const key of ANY_KEYS) {
    if (p[key] === 'any' || p[key] === '') delete p[key];
  }

  if (!p.gender) delete p.gender;
  if (p.verifiedOnly !== 'true') delete p.verifiedOnly;
  if (p.withPhotoOnly !== 'true') delete p.withPhotoOnly;

  return p;
}
