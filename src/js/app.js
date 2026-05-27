import '../styles/main.css';
import { initI18n, getLang } from './i18n/index.js';
import { clearMetaCache } from './meta.js';
import { initSettingsPanels } from './ui/settings.js';
import { initModal } from './ui/modal.js';
import { initNav } from './ui/nav.js';
import { initGuestEntryLinks, enterMainSite } from './ui/session.js';
import { initAuth, restoreSession } from './auth.js';
import { initRegister } from './register.js';
import { initContact } from './contact.js';
import { initProfileModal } from './profileModal.js';
import { initMyProfile } from './myProfile.js';
import { initBrowseProfiles } from './browseProfiles.js';
import { initChat } from './chat.js';
import { initShortlist, refreshShortlistIds } from './shortlist.js';
import { loadFeaturedProfiles, initProfiles } from './profiles.js';
import { initSearch } from './search.js';
import { initQuoteRotators } from './quotes.js';
import { loadTestimonials } from './testimonials.js';
import { hasSession } from './storage.js';
import { API_BASE } from './config.js';
import { initAdminMessageBanner } from './ui/adminMessageBanner.js';

function scheduleIdleWork(fn, timeoutMs = 2000) {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => fn(), { timeout: timeoutMs });
  } else {
    setTimeout(fn, 0);
  }
}

async function loadHomeData() {
  try {
    if (hasSession()) await refreshShortlistIds();
    await Promise.all([loadFeaturedProfiles(), loadTestimonials(getLang())]);
  } catch (err) {
    console.warn('Home data load:', err);
  }
}

async function bootstrap() {
  initI18n();
  initModal();
  initSettingsPanels();
  initNav();
  initGuestEntryLinks();
  initAuth();
  initRegister();
  initContact();
  initProfileModal();
  initMyProfile();
  initBrowseProfiles();
  initChat();
  initShortlist();
  initProfiles();
  initSearch();
  initQuoteRotators();
  initAdminMessageBanner();

  document.body.classList.add('app-bootstrapped');

  const restored = await restoreSession();
  if (!restored && hasSession()) enterMainSite();

  let homeDataScheduled = false;
  const scheduleHomeDataOnce = () => {
    if (homeDataScheduled) return;
    homeDataScheduled = true;
    scheduleIdleWork(() => loadHomeData());
  };

  scheduleHomeDataOnce();
  document.addEventListener('smm:lang-ready', scheduleHomeDataOnce, { once: true });

  let langReloadTimer = null;
  document.addEventListener('smm:lang-change', (e) => {
    clearMetaCache();
    const lang = e.detail?.lang || getLang();
    clearTimeout(langReloadTimer);
    langReloadTimer = setTimeout(() => {
      if (!document.body.classList.contains('on-browse-page')) {
        loadFeaturedProfiles();
      }
      loadTestimonials(lang);
    }, 80);
  });

  document.addEventListener('smm:enter-main', () => {
    scheduleIdleWork(() => refreshShortlistIds().then(() => loadFeaturedProfiles()));
  });

  console.info('Sakal Maratha — API:', API_BASE);
}

bootstrap();
