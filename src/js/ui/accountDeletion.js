import { api, ApiError } from '../api.js';
import { getToken, saveAuth, getProfile, getUser, setUser } from '../storage.js';
import { getLang, t } from '../i18n/index.js';
import { dismissMobileMore } from './navigation.js';

const BANNER_DISMISS_KEY = 'smm-deletion-banner-dismissed';

function formatDateTime(iso, lang) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(lang === 'mr' ? 'mr-IN' : 'en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function getPendingDeletion() {
  return getUser()?.accountDeletion ?? null;
}

/** Always load latest user + deletion state from server (avoids stale localStorage). */
export async function refreshAuthFromServer() {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await api.getMe();
    if (res?.data?.user) {
      saveAuth({
        token,
        user: res.data.user,
        profile: res.data.profile ?? getProfile(),
      });
      return res.data.user;
    }
  } catch (err) {
    console.warn('Could not refresh account status:', err);
  }
  return getUser();
}

function applyUserFromApi(data) {
  if (data?.user) {
    setUser(data.user);
    return;
  }
  const user = getUser();
  if (!user) return;
  setUser({ ...user, accountDeletion: data?.accountDeletion ?? null });
}

function setActionStatus(msg, isError = false) {
  const el = document.getElementById('deleteAccountActionStatus');
  if (!el) return;
  el.textContent = msg || '';
  el.hidden = !msg;
  el.classList.toggle('is-error', isError);
}

export function hideDeletionBanner() {
  const banner = document.getElementById('accountDeletionBanner');
  if (banner) banner.hidden = true;
  document.body.classList.remove('has-deletion-banner');
}

function isBannerDismissed() {
  try {
    return sessionStorage.getItem(BANNER_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function dismissBannerForSession() {
  try {
    sessionStorage.setItem(BANNER_DISMISS_KEY, '1');
  } catch {
    /* ignore */
  }
  hideDeletionBanner();
}

export function syncDeletionBanner() {
  const banner = document.getElementById('accountDeletionBanner');
  const textEl = document.getElementById('accountDeletionBannerText');
  const recoverBtn = document.getElementById('accountDeletionBannerRecover');
  if (!banner || !textEl) return;

  const lang = getLang();
  const pending = getPendingDeletion();

  if (!pending?.scheduledAt || !pending.canRecover) {
    banner.hidden = true;
    document.body.classList.remove('has-deletion-banner');
    return;
  }

  if (isBannerDismissed()) {
    banner.hidden = true;
    document.body.classList.remove('has-deletion-banner');
    return;
  }

  const effective = formatDateTime(pending.effectiveAt, lang);
  textEl.textContent = t('delete.bannerText', lang).replace('{time}', effective);
  if (recoverBtn) recoverBtn.hidden = false;
  banner.hidden = false;
  document.body.classList.add('has-deletion-banner');
}

export function syncDeleteAccountPanel() {
  const panel = document.getElementById('deleteAccountPanel');
  const statusEl = document.getElementById('deleteAccountStatus');
  const requestBtn = document.getElementById('deleteAccountRequestBtn');
  const recoverBtn = document.getElementById('deleteAccountRecoverBtn');
  if (!panel || !statusEl || !requestBtn || !recoverBtn) return;

  const lang = getLang();
  const pending = getPendingDeletion();

  if (!pending?.scheduledAt) {
    statusEl.textContent = '';
    statusEl.hidden = true;
    requestBtn.hidden = false;
    recoverBtn.hidden = true;
    panel.classList.remove('is-pending');
    return;
  }

  panel.classList.add('is-pending');
  statusEl.hidden = false;
  const effective = formatDateTime(pending.effectiveAt, lang);
  statusEl.textContent = t('delete.pendingStatus', lang).replace('{time}', effective);
  requestBtn.hidden = true;
  recoverBtn.hidden = !pending.canRecover;
}

export async function syncAccountDeletionUi() {
  await refreshAuthFromServer();
  syncDeleteAccountPanel();
  syncDeletionBanner();
}

export function clearDeletionUiSession() {
  try {
    sessionStorage.removeItem(BANNER_DISMISS_KEY);
  } catch {
    /* ignore */
  }
  hideDeletionBanner();
  setActionStatus('');
}

export function handlePostLoginDeletionNotice() {
  const pending = getPendingDeletion();
  if (!pending?.scheduledAt) {
    hideDeletionBanner();
    return;
  }
  try {
    sessionStorage.removeItem(BANNER_DISMISS_KEY);
  } catch {
    /* ignore */
  }
  syncDeletionBanner();
  syncDeleteAccountPanel();
}

async function scheduleAccountDeletion() {
  const lang = getLang();
  const requestBtn = document.getElementById('deleteAccountRequestBtn');
  if (requestBtn) requestBtn.disabled = true;
  setActionStatus(t('delete.working', lang), false);

  try {
    const res = await api.requestAccountDeletion();
    applyUserFromApi(res?.data);
    try {
      sessionStorage.removeItem(BANNER_DISMISS_KEY);
    } catch {
      /* ignore */
    }
    syncDeleteAccountPanel();
    syncDeletionBanner();
    setActionStatus(res?.message || t('delete.requestSuccess', lang), false);
  } catch (err) {
    const msg =
      err instanceof ApiError
        ? err.message
        : err?.message || t('delete.requestFailed', lang);
    console.error('Account deletion request failed:', err);
    setActionStatus(msg, true);
    throw err;
  } finally {
    if (requestBtn) requestBtn.disabled = false;
  }
}

async function recoverAccount() {
  const lang = getLang();
  const recoverBtn = document.getElementById('deleteAccountRecoverBtn');
  const bannerRecover = document.getElementById('accountDeletionBannerRecover');
  if (recoverBtn) recoverBtn.disabled = true;
  if (bannerRecover) bannerRecover.disabled = true;
  setActionStatus(t('delete.working', lang), false);

  try {
    const res = await api.cancelAccountDeletion();
    applyUserFromApi(res?.data);
    dismissMobileMore();
    hideDeletionBanner();
    clearDeletionUiSession();
    syncDeleteAccountPanel();
    setActionStatus(res?.message || t('delete.recoverSuccess', lang), false);
  } catch (err) {
    const msg =
      err instanceof ApiError ? err.message : err?.message || t('delete.recoverFailed', lang);
    setActionStatus(msg, true);
    throw err;
  } finally {
    if (recoverBtn) recoverBtn.disabled = false;
    if (bannerRecover) bannerRecover.disabled = false;
  }
}

export function initDeleteAccount() {
  const requestBtn = document.getElementById('deleteAccountRequestBtn');
  const recoverBtn = document.getElementById('deleteAccountRecoverBtn');
  const bannerRecover = document.getElementById('accountDeletionBannerRecover');
  const bannerDismiss = document.getElementById('accountDeletionBannerDismiss');

  requestBtn?.addEventListener('click', async () => {
    const lang = getLang();
    const ok = window.confirm(t('delete.confirmRequest', lang));
    if (!ok) return;
    try {
      await scheduleAccountDeletion();
    } catch {
      /* status shown inline */
    }
  });

  recoverBtn?.addEventListener('click', async () => {
    const lang = getLang();
    const ok = window.confirm(t('delete.confirmRecover', lang));
    if (!ok) return;
    try {
      await recoverAccount();
    } catch {
      /* status shown inline */
    }
  });

  bannerRecover?.addEventListener('click', async () => {
    const lang = getLang();
    const ok = window.confirm(t('delete.confirmRecover', lang));
    if (!ok) return;
    try {
      await recoverAccount();
    } catch {
      /* status shown inline */
    }
  });

  bannerDismiss?.addEventListener('click', () => {
    dismissBannerForSession();
  });

  document.addEventListener('smm:lang-change', () => {
    syncDeleteAccountPanel();
    syncDeletionBanner();
  });

  document.addEventListener('smm:enter-main', () => {
    requestAnimationFrame(() => {
      syncDeleteAccountPanel();
      syncDeletionBanner();
    });
  });
}
