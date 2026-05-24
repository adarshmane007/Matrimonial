import { api } from '../api.js';

let cached = null;
let loadPromise = null;

export async function getOtpStatus(force = false) {
  if (cached && !force) return cached;
  if (loadPromise && !force) return loadPromise;

  loadPromise = api
    .getOtpStatus()
    .then((res) => {
      cached = res?.data || { enabled: false };
      return cached;
    })
    .catch(() => {
      cached = { enabled: false };
      return cached;
    })
    .finally(() => {
      loadPromise = null;
    });

  return loadPromise;
}

export function isOtpEnabled() {
  return !!cached?.enabled;
}
