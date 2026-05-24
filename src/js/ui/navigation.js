/** Debounced full-page navigation — prevents double-tap hangs and layout shake. */
const LOCKS = {
  profile: false,
  browse: false,
  chat: false,
  shortlist: false,
};

let navSwitchLock = false;

export function isNavSwitchLocked() {
  return navSwitchLock;
}

export function isNavLocked(key) {
  return LOCKS[key] === true || navSwitchLock;
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

export function syncMobileNavFromBody() {
  if (!document.body.classList.contains('logged-in')) return;

  if (document.body.classList.contains('mobile-more-open')) {
    setMobileNavActive('more');
    return;
  }
  if (document.body.classList.contains('on-browse-page')) {
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
  return Promise.resolve(fn()).finally(() => {
    setTimeout(() => {
      LOCKS[key] = false;
      navSwitchLock = false;
      document.body.classList.remove('page-switching');
      syncMobileNavFromBody();
    }, 280);
  });
}

export function preparePageSwitch() {
  document.body.classList.add('page-switching');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => document.body.classList.remove('page-switching'));
  });
}
