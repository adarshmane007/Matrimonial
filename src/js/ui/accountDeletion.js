import { api, ApiError } from '../api.js';
import { getUser, setUser } from '../storage.js';
import { getLang, t } from '../i18n/index.js';

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

function applyUserFromApi(data) {
  if (data?.user) {
    setUser(data.user);
    return;
  }
  const user = getUser();
  if (!user) return;
  setUser({ ...user, accountDeletion: data?.accountDeletion || null });
}

export function syncDeleteAccountPanel() {
  const panel = document.getElementById('deleteAccountPanel');
  const statusEl = document.getElementById('deleteAccountStatus');
  const requestBtn = document.getElementById('deleteAccountRequestBtn');
  const recoverBtn = document.getElementById('deleteAccountRecoverBtn');
  if (!panel || !statusEl || !requestBtn || !recoverBtn) return;

  const lang = getLang();
  const pending = getUser()?.accountDeletion;

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

export function initDeleteAccount() {
  const requestBtn = document.getElementById('deleteAccountRequestBtn');
  const recoverBtn = document.getElementById('deleteAccountRecoverBtn');

  requestBtn?.addEventListener('click', async () => {
    const lang = getLang();
    const ok = window.confirm(t('delete.confirmRequest', lang));
    if (!ok) return;

    requestBtn.disabled = true;
    try {
      const res = await api.requestAccountDeletion();
      mergeUserDeletion(res?.data?.accountDeletion);
      syncDeleteAccountPanel();
      alert(res?.message || t('delete.requestSuccess', lang));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : t('delete.requestFailed', lang));
    } finally {
      requestBtn.disabled = false;
    }
  });

  recoverBtn?.addEventListener('click', async () => {
    const lang = getLang();
    recoverBtn.disabled = true;
    try {
      const res = await api.cancelAccountDeletion();
      applyUserFromApi(res?.data);
      syncDeleteAccountPanel();
      alert(res?.message || t('delete.recoverSuccess', lang));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : t('delete.recoverFailed', lang));
    } finally {
      recoverBtn.disabled = false;
    }
  });

  document.addEventListener('smm:lang-change', syncDeleteAccountPanel);
  document.addEventListener('smm:enter-main', syncDeleteAccountPanel);

  syncDeleteAccountPanel();
}
