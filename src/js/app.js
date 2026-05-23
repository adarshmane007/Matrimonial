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
import { loadFeaturedProfiles } from './profiles.js';
import { initSearch } from './search.js';
import { loadStats } from './stats.js';
import { loadTestimonials } from './testimonials.js';
import { hasSession } from './storage.js';
import { API_BASE } from './config.js';

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
  initSearch();

  const restored = await restoreSession();
  if (!restored && hasSession()) enterMainSite();

  await Promise.all([
    loadStats(),
    loadFeaturedProfiles(),
    loadTestimonials(getLang()),
  ]);

  document.addEventListener('smm:lang-change', (e) => {
    clearMetaCache();
    const lang = e.detail?.lang || getLang();
    loadFeaturedProfiles();
    loadTestimonials(lang);
  });

  document.addEventListener('smm:enter-main', () => {
    loadFeaturedProfiles();
    loadStats();
  });

  console.info('Sakal Maratha — API:', API_BASE);
}

bootstrap();
