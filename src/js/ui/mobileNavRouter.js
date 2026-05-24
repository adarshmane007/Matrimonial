import { isLoggedIn } from '../storage.js';
import { closeFullPageOverlays } from './fullPage.js';
import {
  dismissMobileMore,
  isNavSwitchLocked,
  setMobileNavActive,
  syncMobileNavFromBody,
} from './navigation.js';

function goToHomeFromNav() {
  closeFullPageOverlays();
  dismissMobileMore();
  setMobileNavActive('home');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileMore() {
  const sheet = document.getElementById('mobileMoreSheet');
  const moreBtn = document.getElementById('mobileMoreBtn');
  if (!sheet || !moreBtn) return;

  const willOpen = sheet.hidden;
  if (willOpen) {
    sheet.hidden = false;
    sheet.removeAttribute('hidden');
    sheet.setAttribute('aria-hidden', 'false');
    moreBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('mobile-more-open');
    setMobileNavActive('more');
  } else {
    dismissMobileMore();
    syncMobileNavFromBody();
  }
}

async function openBrowseFromNav() {
  if (document.body.classList.contains('on-browse-page')) {
    syncMobileNavFromBody();
    return;
  }
  const { openBrowsePage } = await import('../browseProfiles.js');
  await openBrowsePage();
}

async function openChatFromNav() {
  if (document.body.classList.contains('on-chat-page')) {
    syncMobileNavFromBody();
    return;
  }
  const { openChatPage } = await import('../chat.js');
  await openChatPage();
}

async function openProfileFromNav() {
  if (document.body.classList.contains('on-profile-page')) {
    syncMobileNavFromBody();
    return;
  }
  const { openProfilePage } = await import('../myProfile.js');
  await openProfilePage();
}

/**
 * Single handler for bottom nav — More is never blocked by page-switch lock.
 */
export function initMobileNavRouter() {
  const bar = document.getElementById('mobileBottomNav');
  if (!bar) return;

  let moreTouchHandled = false;

  bar.addEventListener(
    'click',
    (e) => {
      if (!isLoggedIn()) return;

      const tab = e.target.closest('[data-nav-tab]');
      if (!tab) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      if (tab.id === 'mobileMoreBtn') {
        if (moreTouchHandled) {
          moreTouchHandled = false;
          return;
        }
        toggleMobileMore();
        return;
      }

      if (isNavSwitchLocked()) return;

      dismissMobileMore();

      const name = tab.dataset.navTab;
      switch (name) {
        case 'home':
          goToHomeFromNav();
          break;
        case 'browse':
          openBrowseFromNav();
          break;
        case 'chat':
          openChatFromNav();
          break;
        case 'profile':
          openProfileFromNav();
          break;
        default:
          syncMobileNavFromBody();
      }
    },
    true
  );

  bar.addEventListener(
    'touchend',
    (e) => {
      const tab = e.target.closest('[data-nav-tab]');
      if (!tab || tab.id !== 'mobileMoreBtn' || !isLoggedIn()) return;
      e.preventDefault();
      moreTouchHandled = true;
      toggleMobileMore();
    },
    { passive: false }
  );
}
