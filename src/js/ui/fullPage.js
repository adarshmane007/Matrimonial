/** Close full-page overlays (profile, browse, chat) without scroll-lock jitter. */
export function closeFullPageOverlays({ except } = {}) {
  const pages = [
    { id: 'profile-page', bodyClass: 'on-profile-page', key: 'profile' },
    { id: 'browse-page', bodyClass: 'on-browse-page', key: 'browse' },
    { id: 'chat-page', bodyClass: 'on-chat-page', key: 'chat' },
    { id: 'shortlist-page', bodyClass: 'on-shortlist-page', key: 'shortlist' },
  ];

  document.body.classList.remove(
    'chat-thread-open',
    'browse-filters-open',
    'nav-open'
  );
  document.getElementById('navLinks')?.classList.remove('is-open');
  document.getElementById('navMenuBtn')?.setAttribute('aria-expanded', 'false');

  pages.forEach(({ id, bodyClass, key }) => {
    if (except && except === key) return;
    document.body.classList.remove(bodyClass);
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  });
}
