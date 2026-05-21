import { API_BASE } from './config.js';
import { getToken, clearAuth } from './storage.js';

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

let onUnauthorized = () => {};

export function setOnUnauthorized(handler) {
  onUnauthorized = handler;
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (res.status === 401) {
    clearAuth();
    onUnauthorized();
  }

  if (!res.ok) {
    throw new ApiError(
      data?.message || `Request failed (${res.status})`,
      res.status,
      data
    );
  }
  return data;
}

export const api = {
  getMeta(lang) {
    return request(`/meta?lang=${lang}`);
  },

  login(identifier, password) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  },

  register(payload) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  parseBiodata(biodata) {
    return request('/biodata/parse', {
      method: 'POST',
      body: JSON.stringify({ biodata }),
    });
  },

  getMe() {
    return request('/auth/me');
  },

  getFeatured(lang) {
    return request(`/profiles/featured?lang=${lang}&limit=6`);
  },

  getProfile(id, lang) {
    return request(`/profiles/${id}?lang=${lang}`);
  },

  search(params) {
    const q = new URLSearchParams(params);
    return request(`/profiles/search?${q.toString()}`);
  },

  getStats() {
    return request('/stats');
  },

  getTestimonials(lang) {
    return request(`/testimonials?lang=${lang}`);
  },

  sendContact(payload) {
    return request('/contact', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  expressInterest(profileId, message) {
    return request('/interests', {
      method: 'POST',
      body: JSON.stringify({ profileId, message }),
    });
  },
};
