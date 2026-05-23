/** Prevent layout jump / sideways scroll when overlays open on mobile */
export function lockPageScroll() {
  if (document.body.classList.contains('scroll-locked')) return;
  const y = window.scrollY;
  document.body.dataset.scrollLockY = String(y);
  document.body.style.setProperty('--scroll-lock-top', `-${y}px`);
  document.body.classList.add('scroll-locked');
}

export function unlockPageScroll() {
  if (!document.body.classList.contains('scroll-locked')) return;
  const y = Number(document.body.dataset.scrollLockY || 0);
  document.body.classList.remove('scroll-locked');
  document.body.style.removeProperty('--scroll-lock-top');
  delete document.body.dataset.scrollLockY;
  window.scrollTo(0, y);
}
