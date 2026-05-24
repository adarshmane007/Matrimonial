import { translations } from './translations.js';
import { getSavedLang, saveLang } from '../storage.js';

let currentLang = 'en';

export function getLang() {
  return currentLang;
}

export function t(key, lang = currentLang) {
  const dict = translations[lang === 'mr' ? 'mr' : 'en'] || translations.en;
  return dict[key] ?? translations.en[key] ?? key;
}

function yearsLabel(n, lang) {
  return lang === 'mr' ? `${n} वर्षे` : `${n} Years`;
}

let applyingLanguage = false;

function applyDocumentMeta(lang) {
  const dict = translations[lang] || translations.en;
  document.documentElement.lang = lang;
  document.documentElement.setAttribute('data-lang', lang);
  document.body.classList.toggle('lang-mr', lang === 'mr');
  document.title = dict['page.title'] || document.title;
}

/** Update i18n inside a subtree only — does not fire smm:lang-change. */
export function applyLanguageToRoot(root, lang = currentLang) {
  if (!root) return;
  const dict = translations[lang === 'mr' ? 'mr' : 'en'] || translations.en;
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    if (el.classList.contains('lang-choice')) return;
    const key = el.getAttribute('data-i18n');
    if (!key || dict[key] === undefined) return;
    el.textContent = dict[key];
  });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const key = el.getAttribute('data-i18n-html');
    if (!key || dict[key] === undefined) return;
    el.innerHTML = dict[key];
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (!key || dict[key] === undefined) return;
    el.placeholder = dict[key];
  });
}

/** Full DOM pass without smm:lang-change (for deferred startup). */
function applyLanguageQuiet(lang) {
  if (applyingLanguage) return;
  applyingLanguage = true;
  try {
    lang = lang === 'mr' ? 'mr' : 'en';
    currentLang = lang;
    const dict = translations[lang] || translations.en;
    applyDocumentMeta(lang);

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      if (el.classList.contains('lang-choice')) return;
      const key = el.getAttribute('data-i18n');
      if (!key || dict[key] === undefined) return;
      el.textContent = dict[key];
    });

    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const key = el.getAttribute('data-i18n-html');
      if (!key || dict[key] === undefined) return;
      el.innerHTML = dict[key];
    });

    document.querySelectorAll('[data-i18n-years]').forEach((el) => {
      const n = el.getAttribute('data-i18n-years');
      if (n) el.textContent = yearsLabel(n, lang);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (!key || dict[key] === undefined) return;
      el.placeholder = dict[key];
    });

    document.querySelectorAll('.settings-toggle').forEach((btn) => {
      if (dict['settings.btnLabel']) {
        btn.setAttribute('aria-label', dict['settings.btnLabel']);
        btn.setAttribute('title', dict['settings.btnLabel']);
      }
    });

    document.querySelectorAll('[data-set-lang]').forEach((btn) => {
      const code = btn.getAttribute('data-set-lang');
      btn.classList.toggle('active', code === lang);
      if (btn.getAttribute('role') === 'button') {
        btn.setAttribute('aria-pressed', code === lang ? 'true' : 'false');
      }
    });

    document.querySelectorAll('[data-lang-status]').forEach((el) => {
      el.textContent = lang === 'mr' ? 'मराठी' : 'English';
    });

    saveLang(lang);
  } finally {
    applyingLanguage = false;
  }
}

export function applyLanguage(lang) {
  lang = lang === 'mr' ? 'mr' : 'en';
  applyLanguageQuiet(lang);
  document.dispatchEvent(new CustomEvent('smm:lang-change', { detail: { lang } }));
}

function scheduleIdleWork(fn, timeoutMs = 1500) {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => fn(), { timeout: timeoutMs });
  } else {
    setTimeout(fn, 16);
  }
}

export function initI18n() {
  const lang = getSavedLang() === 'mr' ? 'mr' : 'en';
  currentLang = lang;
  applyDocumentMeta(lang);

  applyLanguageToRoot(document.getElementById('login-screen'), lang);
  applyLanguageToRoot(document.getElementById('mobileBottomNav'), lang);
  applyLanguageToRoot(document.querySelector('nav.site-nav'), lang);

  scheduleIdleWork(() => {
    applyLanguageQuiet(lang);
    document.dispatchEvent(new CustomEvent('smm:lang-ready', { detail: { lang } }));
  });

  window.setSiteLanguage = applyLanguage;
  window.__applySiteLanguage = applyLanguage;
}
