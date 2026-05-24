import { isLoggedIn, getUser, getProfile, clearAuth } from '../storage.js';
import { showLoginScreen } from './session.js';
import { closeFullPageOverlays } from './fullPage.js';
import { api } from '../api.js';
import { getLang, t } from '../i18n/index.js';
import { setMobileNavActive, syncMobileNavFromBody, dismissMobileMore } from './navigation.js';
import { initMobileNavRouter } from './mobileNavRouter.js';
import {
  initDeleteAccount,
  syncDeleteAccountPanel,
  syncDeletionBanner,
  clearDeletionUiSession,
} from './accountDeletion.js';

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

const MOBILE_PROFILE_ICON_SVG = `<svg class="mobile-nav-profile-svg" viewBox="0 0 24 24" width="22" height="22" focusable="false" aria-hidden="true"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;

function showMobileProfileIcon(el) {
  el.innerHTML = MOBILE_PROFILE_ICON_SVG;
}

export function syncMobileProfileNavPhoto() {
  const el = document.getElementById('mobileNavProfileIcon');
  if (!el) return;

  el.className = 'mobile-nav-icon mobile-nav-icon-profile';

  const url = getProfile()?.photoUrl?.trim();
  if (!url || url.length < 12) {
    showMobileProfileIcon(el);
    return;
  }

  const img = document.createElement('img');
  img.className = 'mobile-nav-profile-img';
  img.alt = '';
  img.decoding = 'async';
  img.onerror = () => showMobileProfileIcon(el);
  el.replaceChildren(img);
  img.src = url;
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
    syncMobileProfileNavPhoto();
    refreshNavBadges();
    syncMobileNavFromBody();
    syncDeleteAccountPanel();
    syncDeletionBanner();
  } else {
    syncMobileProfileNavPhoto();
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
  dismissMobileMore();
  setMobileNavActive('home');
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
    clearDeletionUiSession();
    closeOverlays();
    showLoginScreen();
    updateNavAuth();
  };
  document.getElementById('logoutBtn')?.addEventListener('click', doLogout);
  document.getElementById('mobileLogoutBtn')?.addEventListener('click', doLogout);
  document.getElementById('mobileMoreLogoutBtn')?.addEventListener('click', doLogout);

  const moreBackdrop = document.getElementById('mobileMoreBackdrop');
  const moreClose = document.getElementById('mobileMoreClose');

  function closeMobileMoreMenu() {
    dismissMobileMore();
    syncMobileNavFromBody();
  }

  moreBackdrop?.addEventListener('click', closeMobileMoreMenu);
  moreClose?.addEventListener('click', closeMobileMoreMenu);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('mobile-more-open')) {
      closeMobileMoreMenu();
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-set-lang]') && document.body.classList.contains('mobile-more-open')) {
      setTimeout(closeMobileMoreMenu, 120);
    }
  });

  initMobileNavRouter();
  initDeleteAccount();

  document.querySelectorAll('[data-nav-home]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      goToHome();
    });
  });

  document.addEventListener('smm:enter-main', () => {
    setMobileNavActive('home');
    syncMobileProfileNavPhoto();
  });

  updateNavAuth();

  if (isLoggedIn()) {
    setInterval(() => refreshNavBadges(), 45000);
  }
}
