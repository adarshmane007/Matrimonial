import { isLoggedIn, getUser, getProfile, clearAuth } from '../storage.js';
import { showLoginScreen } from './session.js';
import { closeFullPageOverlays } from './fullPage.js';
import { api } from '../api.js';
import { getLang, t } from '../i18n/index.js';

function syncProfileCtaLabels() {
  const hasProfile = !!(getProfile()?.id);
  const navKey = hasProfile ? 'nav.viewProfile' : 'nav.createProfile';
  const heroKey = hasProfile ? 'hero.viewProfile' : 'hero.createProfile';
  const lang = getLang();

  document.querySelectorAll('[data-i18n-profile-cta]').forEach((el) => {
    el.setAttribute('data-i18n', navKey);
    el.textContent = t(navKey, lang);
  });
  document.querySelectorAll('[data-i18n-hero-profile-cta]').forEach((el) => {
    el.setAttribute('data-i18n', heroKey);
    el.textContent = t(heroKey, lang);
  });
}

function setBadge(el, count) {
  if (!el) return;
  const n = Number(count) || 0;
  if (n <= 0) {
    el.hidden = true;
    el.textContent = '';
    el.removeAttribute('aria-label');
    return;
  }
  el.hidden = false;
  el.textContent = n > 99 ? '99+' : String(n);
  el.setAttribute('aria-label', `${n} unread`);
}

export async function refreshNavBadges() {
  if (!isLoggedIn()) {
    setBadge(document.getElementById('navMsgBadge'), 0);
    setBadge(document.getElementById('navMsgBadgeMobile'), 0);
    return;
  }
  try {
    const res = await api.getChatUnreadSummary();
    const total = res?.data?.total ?? 0;
    setBadge(document.getElementById('navMsgBadge'), total);
    setBadge(document.getElementById('navMsgBadgeMobile'), total);
  } catch {
    /* ignore when offline */
  }
}

export function updateNavAuth() {
  const loggedIn = isLoggedIn();
  const user = getUser();
  const logoutItem = document.getElementById('navLogoutItem');
  const userLabel = document.getElementById('navUserLabel');
  const registerItem = document.getElementById('navRegisterItem');
  const createProfileItem = document.getElementById('navCreateProfileItem');
  const chatItem = document.getElementById('navChatItem');
  const mobileNav = document.getElementById('mobileBottomNav');

  document.body.classList.toggle('logged-in', loggedIn);

  if (logoutItem) logoutItem.hidden = !loggedIn;
  if (userLabel) {
    userLabel.hidden = !loggedIn;
    userLabel.textContent = user?.fullName ? `Hi, ${user.fullName.split(' ')[0]}` : '';
  }
  if (registerItem) registerItem.hidden = loggedIn;
  if (createProfileItem) createProfileItem.hidden = !loggedIn;
  if (chatItem) chatItem.hidden = !loggedIn;
  if (mobileNav) mobileNav.hidden = !loggedIn;

  const mobileActions = document.getElementById('navMobileActions');
  if (mobileActions) mobileActions.hidden = !loggedIn;

  document.querySelectorAll('[data-guest-only]').forEach((el) => {
    el.hidden = loggedIn;
  });
  document.querySelectorAll('[data-member-only]').forEach((el) => {
    el.hidden = !loggedIn;
  });

  if (loggedIn) {
    syncProfileCtaLabels();
    refreshNavBadges();
  } else {
    setBadge(document.getElementById('navMsgBadge'), 0);
    setBadge(document.getElementById('navMsgBadgeMobile'), 0);
  }
}

function closeOverlays() {
  closeFullPageOverlays();
  document.body.classList.remove('nav-open');
}

export function goToHome() {
  closeOverlays();
  document.querySelectorAll('.mobile-nav-item').forEach((el) => el.classList.remove('is-active'));
  document.querySelector('.mobile-nav-item[data-nav-tab="home"]')?.classList.add('is-active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function initNav() {
  const menuBtn = document.getElementById('navMenuBtn');
  const navLinks = document.getElementById('navLinks');

  menuBtn?.addEventListener('click', () => {
    const open = navLinks?.classList.toggle('is-open');
    document.body.classList.toggle('nav-open', !!open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  navLinks?.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      document.body.classList.remove('nav-open');
      menuBtn?.setAttribute('aria-expanded', 'false');
    });
  });

  const doLogout = () => {
    clearAuth();
    closeOverlays();
    showLoginScreen();
    updateNavAuth();
  };
  document.getElementById('logoutBtn')?.addEventListener('click', doLogout);
  document.getElementById('mobileLogoutBtn')?.addEventListener('click', doLogout);
  document.querySelectorAll('[data-nav-home]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      goToHome();
    });
  });

  document.querySelector('[data-mobile-home]')?.addEventListener('click', (e) => {
    e.preventDefault();
    goToHome();
  });

  document.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-nav-tab]');
    if (!tab || !document.body.classList.contains('logged-in')) return;
    document.querySelectorAll('.mobile-nav-item').forEach((el) => el.classList.remove('is-active'));
    tab.classList.add('is-active');
  });

  document.addEventListener('smm:enter-main', () => {
    document.querySelector('.mobile-nav-item[data-nav-tab="home"]')?.classList.add('is-active');
  });

  updateNavAuth();

  if (isLoggedIn()) {
    setInterval(() => refreshNavBadges(), 45000);
  }
}
