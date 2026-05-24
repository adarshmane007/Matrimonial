import { isLoggedIn, getUser, getProfile, clearAuth } from '../storage.js';
import { showLoginScreen } from './session.js';
import { closeFullPageOverlays } from './fullPage.js';
import { api } from '../api.js';
import { getLang, t } from '../i18n/index.js';
import {
  isNavSwitchLocked,
  setMobileNavActive,
  syncMobileNavFromBody,
} from './navigation.js';

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

export function syncMobileProfileNavPhoto() {
  const el = document.getElementById('mobileNavProfileIcon');
  if (!el) return;
  const url = getProfile()?.photoUrl;
  if (url) {
    el.innerHTML = `<img src="${url.replace(/"/g, '&quot;')}" alt="" class="mobile-nav-profile-img">`;
  } else {
    el.textContent = '👤';
    el.className = 'mobile-nav-icon mobile-nav-icon-profile';
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
    syncMobileProfileNavPhoto();
    refreshNavBadges();
    syncMobileNavFromBody();
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
  document.getElementById('mobileMoreSheet')?.setAttribute('hidden', '');
  document.body.classList.remove('mobile-more-open');
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
    closeOverlays();
    showLoginScreen();
    updateNavAuth();
  };
  document.getElementById('logoutBtn')?.addEventListener('click', doLogout);
  document.getElementById('mobileLogoutBtn')?.addEventListener('click', doLogout);
  document.getElementById('mobileMoreLogoutBtn')?.addEventListener('click', doLogout);

  const moreSheet = document.getElementById('mobileMoreSheet');
  const moreBtn = document.getElementById('mobileMoreBtn');
  const moreBackdrop = document.getElementById('mobileMoreBackdrop');
  const moreClose = document.getElementById('mobileMoreClose');

  function closeMobileMore() {
    if (!moreSheet) return;
    moreSheet.hidden = true;
    moreSheet.setAttribute('aria-hidden', 'true');
    moreBtn?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('mobile-more-open');
    syncMobileNavFromBody();
  }

  function openMobileMore() {
    if (!moreSheet) return;
    if (isNavSwitchLocked()) return;
    moreSheet.hidden = false;
    moreSheet.setAttribute('aria-hidden', 'false');
    moreBtn?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('mobile-more-open');
    setMobileNavActive('more');
  }

  moreBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isNavSwitchLocked()) return;
    if (moreSheet?.hidden) openMobileMore();
    else closeMobileMore();
  });
  moreBackdrop?.addEventListener('click', closeMobileMore);
  moreClose?.addEventListener('click', closeMobileMore);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('mobile-more-open')) closeMobileMore();
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-set-lang]') && document.body.classList.contains('mobile-more-open')) {
      setTimeout(closeMobileMore, 120);
    }
    const tab = e.target.closest('[data-nav-tab]');
    if (tab && tab.id !== 'mobileMoreBtn' && document.body.classList.contains('mobile-more-open')) {
      closeMobileMore();
    }
  });

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

  /* Block rapid tab taps while a page switch is in progress (capture phase). */
  document.addEventListener(
    'click',
    (e) => {
      const tab = e.target.closest('.mobile-bottom-nav [data-nav-tab]');
      if (!tab || !document.body.classList.contains('logged-in')) return;
      if (tab.id === 'mobileMoreBtn') return;

      if (isNavSwitchLocked()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }

      const tabName = tab.dataset.navTab;
      if (tabName) {
        document.getElementById('mobileMoreSheet')?.setAttribute('hidden', '');
        document.body.classList.remove('mobile-more-open');
        setMobileNavActive(tabName);
      }
    },
    true
  );

  document.addEventListener('smm:enter-main', () => {
    setMobileNavActive('home');
  });

  updateNavAuth();

  if (isLoggedIn()) {
    setInterval(() => refreshNavBadges(), 45000);
  }
}
