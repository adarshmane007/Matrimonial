export const STORAGE_KEYS = {
  lang: 'smm-lang',
  session: 'smm-session',
  token: 'smm-token',
  user: 'smm-user',
  profile: 'smm-profile',
};

export function getToken() {
  try {
    return localStorage.getItem(STORAGE_KEYS.token);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(STORAGE_KEYS.token, token);
    else localStorage.removeItem(STORAGE_KEYS.token);
  } catch {
    /* ignore */
  }
}

export function getUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(user) {
  try {
    if (user) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEYS.user);
  } catch {
    /* ignore */
  }
}

export function saveAuth({ token, user, profile }) {
  setToken(token);
  setUser(user || null);
  if (profile !== undefined) setProfile(profile);
  setSession(true);
}

export function getProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.profile);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setProfile(profile) {
  try {
    if (profile) localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
    else localStorage.removeItem(STORAGE_KEYS.profile);
  } catch {
    /* ignore */
  }
}

export function clearAuth() {
  setToken(null);
  setUser(null);
  setProfile(null);
  setSession(false);
}

export function hasSession() {
  try {
    return localStorage.getItem(STORAGE_KEYS.session) === '1';
  } catch {
    return false;
  }
}

export function isLoggedIn() {
  return !!getToken();
}

export function setSession(active) {
  try {
    if (active) localStorage.setItem(STORAGE_KEYS.session, '1');
    else localStorage.removeItem(STORAGE_KEYS.session);
  } catch {
    /* ignore */
  }
}

export function getSavedLang() {
  try {
    return localStorage.getItem(STORAGE_KEYS.lang) || 'en';
  } catch {
    return 'en';
  }
}

export function saveLang(lang) {
  try {
    localStorage.setItem(STORAGE_KEYS.lang, lang);
  } catch {
    /* ignore */
  }
}
