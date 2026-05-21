import { setSession } from '../storage.js';
import { updateNavAuth } from './nav.js';

export function enterMainSite() {
  document.body.classList.add('on-main-site');
  setSession(true);
  window.scrollTo(0, 0);
  updateNavAuth();
  document.dispatchEvent(new CustomEvent('smm:enter-main'));
}

export function showLoginScreen() {
  document.body.classList.remove('on-main-site');
  setSession(false);
  window.scrollTo(0, 0);
  updateNavAuth();
}

export function initGuestEntryLinks() {
  document.querySelectorAll('.enter-main').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      enterMainSite();
    });
  });
}
