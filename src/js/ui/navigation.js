/** Debounced full-page navigation — prevents double-tap hangs and layout shake. */
const LOCKS = {
  profile: false,
  browse: false,
  chat: false,
};

export function isNavLocked(key) {
  return LOCKS[key] === true;
}

export function withNavLock(key, fn) {
  if (LOCKS[key]) return Promise.resolve();
  LOCKS[key] = true;
  document.body.classList.add('page-switching');
  return Promise.resolve(fn()).finally(() => {
    setTimeout(() => {
      LOCKS[key] = false;
      document.body.classList.remove('page-switching');
    }, 280);
  });
}

export function preparePageSwitch() {
  document.body.classList.add('page-switching');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => document.body.classList.remove('page-switching'));
  });
}
