import { api, ApiError, setOnUnauthorized } from './api.js';
import { getToken, saveAuth, clearAuth } from './storage.js';
import { enterMainSite, showLoginScreen } from './ui/session.js';

function setLoginError(msg) {
  let el = document.getElementById('loginError');
  if (!el) {
    el = document.createElement('p');
    el.id = 'loginError';
    el.className = 'login-error';
    document.getElementById('loginForm')?.appendChild(el);
  }
  el.textContent = msg || '';
  el.hidden = !msg;
}

export function initAuth() {
  setOnUnauthorized(() => {
    showLoginScreen();
    setLoginError('Session expired. Please sign in again.');
  });

  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoginError('');

    const identifier = document.getElementById('loginEmail')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value;

    if (!identifier || !password) {
      setLoginError('Please enter email/mobile and password.');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    const prevText = btn?.textContent;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Signing in…';
    }

    try {
      const res = await api.login(identifier, password);
      if (!res?.data?.token) {
        setLoginError('Login failed. Please try again.');
        return;
      }

      saveAuth({
        token: res.data.token,
        user: res.data.user,
        profile: res.data.profile ?? null,
      });

      enterMainSite();

      const { syncAccountDeletionUi, handlePostLoginDeletionNotice } = await import(
        './ui/accountDeletion.js'
      );
      const { syncAdminMessageBanner } = await import('./ui/adminMessageBanner.js');
      await syncAccountDeletionUi();
      handlePostLoginDeletionNotice();
      await syncAdminMessageBanner();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Unable to reach server. Check API URL and try again.';
      setLoginError(msg);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = prevText || 'Sign In';
      }
    }
  });
}

export async function restoreSession() {
  if (!getToken()) return false;

  try {
    const { refreshAuthFromServer, handlePostLoginDeletionNotice, syncDeleteAccountPanel, syncDeletionBanner } =
      await import('./ui/accountDeletion.js');
    const { syncAdminMessageBanner } = await import('./ui/adminMessageBanner.js');
    const user = await refreshAuthFromServer();
    if (!user) {
      clearAuth();
      return false;
    }
    enterMainSite();
    syncDeleteAccountPanel();
    syncDeletionBanner();
    handlePostLoginDeletionNotice();
    await syncAdminMessageBanner();
    return true;
  } catch {
    clearAuth();
    showLoginScreen();
  }
  return false;
}
