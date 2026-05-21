import { isLoggedIn, getUser } from '../storage.js';
import { showLoginScreen } from './session.js';
import { clearAuth } from '../storage.js';

export function updateNavAuth() {
  const loggedIn = isLoggedIn();
  const user = getUser();
  const logoutItem = document.getElementById('navLogoutItem');
  const userLabel = document.getElementById('navUserLabel');
  const registerCtas = document.querySelectorAll('[data-open-register]');

  if (logoutItem) logoutItem.hidden = !loggedIn;
  if (userLabel) {
    userLabel.hidden = !loggedIn;
    userLabel.textContent = user?.fullName ? `Hi, ${user.fullName.split(' ')[0]}` : '';
  }

  registerCtas.forEach((el) => {
    if (loggedIn) el.setAttribute('aria-hidden', 'true');
    else el.removeAttribute('aria-hidden');
  });
}

export function initNav() {
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    clearAuth();
    showLoginScreen();
    updateNavAuth();
  });
  updateNavAuth();
}
