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

async function requestForm(path, formData) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', body: formData, headers });
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

async function request(path, options = {}) {
  const { signal, ...fetchOpts } = options;
  const headers = { ...(fetchOpts.headers || {}) };
  if (fetchOpts.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...fetchOpts, headers, signal });
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

  getCities(state, lang) {
    return request(`/meta/cities?state=${encodeURIComponent(state)}&lang=${lang}`);
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

  getMyProfile() {
    return request('/profiles/me');
  },

  updateMyProfile(payload) {
    return request('/profiles/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  uploadProfilePhoto(file) {
    const formData = new FormData();
    formData.append('photo', file, file.name || 'profile.jpg');
    return requestForm('/profiles/me/photo', formData);
  },

  parseBiodataPdf(file) {
    const formData = new FormData();
    formData.append('biodataPdf', file);
    return requestForm('/biodata/parse-pdf', formData);
  },

  getFeatured(lang, { gender, limit = 6 } = {}) {
    const q = new URLSearchParams({ lang, limit: String(limit) });
    if (gender === 'bride' || gender === 'groom') q.set('gender', gender);
    return request(`/profiles/featured?${q.toString()}`);
  },

  getProfile(id, lang) {
    return request(`/profiles/${id}?lang=${lang}`);
  },

  search(params, options = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') q.set(key, String(val));
    });
    return request(`/profiles/search?${q.toString()}`, options);
  },

  sendChatRequest(profileId, message) {
    return request('/chat/requests', {
      method: 'POST',
      body: JSON.stringify({ toProfileId: Number(profileId), message }),
    });
  },

  getChatUnreadSummary() {
    return request('/chat/unread-summary');
  },

  getIncomingChatRequests() {
    return request('/chat/requests/incoming');
  },

  getOutgoingChatRequests() {
    return request('/chat/requests/outgoing');
  },

  respondChatRequest(requestId, action) {
    return request(`/chat/requests/${requestId}/respond`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    });
  },

  getConversations() {
    return request('/chat/conversations');
  },

  getChatMessages(conversationId) {
    return request(`/chat/conversations/${conversationId}/messages`);
  },

  sendChatMessage(conversationId, body) {
    return request(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
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

  getShortlistIds() {
    return request('/shortlist/ids');
  },

  getShortlist(lang) {
    return request(`/shortlist?lang=${lang}`);
  },

  addShortlist(profileId) {
    return request(`/shortlist/${profileId}`, { method: 'POST' });
  },

  removeShortlist(profileId) {
    return request(`/shortlist/${profileId}`, { method: 'DELETE' });
  },

  requestAccountDeletion() {
    return request('/auth/account/delete-request', { method: 'POST' });
  },

  cancelAccountDeletion() {
    return request('/auth/account/cancel-deletion', { method: 'POST' });
  },
};
