import { isLoggedIn, getUser, clearAuth } from '../storage.js';
import { showLoginScreen } from './session.js';
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

  document.querySelectorAll('[data-guest-only]').forEach((el) => {
    el.hidden = loggedIn;
  });
  document.querySelectorAll('[data-member-only]').forEach((el) => {
    el.hidden = !loggedIn;
  });
}

function closeOverlays() {
  document.body.classList.remove(
    'on-profile-page',
    'on-browse-page',
    'on-chat-page',
    'browse-filters-open',
    'nav-open'
  );
  ['profile-page', 'browse-page', 'chat-page'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  });
  document.getElementById('navLinks')?.classList.remove('is-open');
  document.getElementById('navMenuBtn')?.setAttribute('aria-expanded', 'false');
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

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    clearAuth();
    closeOverlays();
    showLoginScreen();
    updateNavAuth();
  });
  document.querySelector('[data-mobile-home]')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeOverlays();
    window.scrollTo(0, 0);
  });

  updateNavAuth();
}
