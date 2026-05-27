import { api } from '../api.js';
import { getLang, t } from '../i18n/index.js';
import { isLoggedIn } from '../storage.js';
let bannerState = { messageId: null };

function syncBodyClass() {
  const banner = document.getElementById('adminMessageBanner');
  const visible = banner && !banner.hidden;
  document.body.classList.toggle('has-admin-message-banner', visible);
}

export async function syncAdminMessageBanner() {
  const banner = document.getElementById('adminMessageBanner');
  const textEl = document.getElementById('adminMessageBannerText');
  if (!banner || !textEl || !isLoggedIn() || !document.body.classList.contains('on-main-site')) {
    if (banner) banner.hidden = true;
    syncBodyClass();
    return;
  }

  try {
    const res = await api.getAdminMessageBanner(getLang());
    const data = res?.data;
    if (!data?.show) {
      banner.hidden = true;
      bannerState.messageId = null;
      syncBodyClass();
      return;
    }

    bannerState.messageId = data.messageId;
    textEl.textContent = t('admin.bannerText');
    banner.hidden = false;
    syncBodyClass();
  } catch {
    banner.hidden = true;
    syncBodyClass();
  }
}

export function dismissAdminMessageBanner() {
  const banner = document.getElementById('adminMessageBanner');
  if (banner) banner.hidden = true;
  syncBodyClass();
}

export function initAdminMessageBanner() {
  document.getElementById('adminMessageBannerOpen')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      if (bannerState.messageId) {
        await api.markAdminMessagesRead(bannerState.messageId);
      }
    } catch {
      /* still open chat */
    }
    dismissAdminMessageBanner();
    const { openChatPage } = await import('../chat.js');
    openChatPage('admin');
  });

  document.addEventListener('smm:enter-main', () => {
    syncAdminMessageBanner();
  });

  document.addEventListener('smm:lang-change', () => {
    if (!document.getElementById('adminMessageBanner')?.hidden) {
      const textEl = document.getElementById('adminMessageBannerText');
      if (textEl) textEl.textContent = t('admin.bannerText');
    }
  });
}
