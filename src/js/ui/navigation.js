/** Full-page navigation + mobile bottom bar state (single source of truth). */
const LOCKS = {
  profile: false,
  browse: false,
  chat: false,
  shortlist: false,
};

let navSwitchLock = false;
let unlockSafetyTimer = null;

export function isNavSwitchLocked() {
  return navSwitchLock;
}

export function isNavLocked(key) {
  return LOCKS[key] === true || navSwitchLock;
}

export function dismissMobileMore() {
  const sheet = document.getElementById('mobileMoreSheet');
  const moreBtn = document.getElementById('mobileMoreBtn');
  if (sheet) {
    sheet.hidden = true;
    sheet.setAttribute('aria-hidden', 'true');
  }
  moreBtn?.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('mobile-more-open');
}

function clearPageSwitchingIfIdle() {
  const anyLocked = Object.values(LOCKS).some(Boolean);
  navSwitchLock = anyLocked;
  if (!anyLocked) {
    document.body.classList.remove('page-switching');
    if (unlockSafetyTimer) {
      clearTimeout(unlockSafetyTimer);
      unlockSafetyTimer = null;
    }
  }
}

function finishNavSwitch(key) {
  LOCKS[key] = false;
  clearPageSwitchingIfIdle();
  syncMobileNavFromBody();
}

/** Exactly one bottom-nav tab may show the active highlight. */
export function setMobileNavActive(tab) {
  const tabs = ['home', 'browse', 'chat', 'profile', 'more'];
  if (!tabs.includes(tab)) return;

  document.querySelectorAll('.mobile-bottom-nav .mobile-nav-item').forEach((el) => {
    el.classList.remove('is-active');
  });

  const el =
    tab === 'more'
      ? document.getElementById('mobileMoreBtn')
      : document.querySelector(`.mobile-bottom-nav .mobile-nav-item[data-nav-tab="${tab}"]`);
  el?.classList.add('is-active');
}

/** More menu open state wins over full-page overlays for the tab highlight. */
export function syncMobileNavFromBody() {
  if (!document.body.classList.contains('logged-in')) return;

  if (document.body.classList.contains('mobile-more-open')) {
    setMobileNavActive('more');
  } else if (document.body.classList.contains('on-browse-page')) {
    setMobileNavActive('browse');
  } else if (document.body.classList.contains('on-chat-page')) {
    setMobileNavActive('chat');
  } else if (document.body.classList.contains('on-profile-page')) {
    setMobileNavActive('profile');
  } else if (document.body.classList.contains('on-shortlist-page')) {
    setMobileNavActive('more');
  } else {
    setMobileNavActive('home');
  }
}

export function withNavLock(key, fn) {
  if (LOCKS[key] || navSwitchLock) return Promise.resolve();

  LOCKS[key] = true;
  navSwitchLock = true;
  document.body.classList.add('page-switching');
  dismissMobileMore();

  if (unlockSafetyTimer) clearTimeout(unlockSafetyTimer);
  unlockSafetyTimer = setTimeout(() => {
    Object.keys(LOCKS).forEach((k) => {
      LOCKS[k] = false;
    });
    navSwitchLock = false;
    document.body.classList.remove('page-switching');
    unlockSafetyTimer = null;
    syncMobileNavFromBody();
  }, 4000);

  return Promise.resolve(fn())
    .catch((err) => {
      console.warn(`Navigation (${key}):`, err);
    })
    .finally(() => {
      setTimeout(() => finishNavSwitch(key), 80);
    });
}

export function preparePageSwitch() {
  document.body.classList.add('page-switching');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => document.body.classList.remove('page-switching'));
  });
}

export function isMobileBottomNavClick(target) {
  return !!target?.closest?.('.mobile-bottom-nav');
}
