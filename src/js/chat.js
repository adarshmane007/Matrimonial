import { api, ApiError } from './api.js';
import { isLoggedIn } from './storage.js';
import { getLang } from './i18n/index.js';
import { translations } from './i18n/translations.js';
import { openProfileModal } from './profileModal.js';
import { refreshNavBadges } from './ui/nav.js';
import { closeFullPageOverlays } from './ui/fullPage.js';
import { isNavLocked, isNavSwitchLocked, withNavLock, isMobileBottomNavClick } from './ui/navigation.js';

function t(key) {
  const lang = getLang();
  return translations[lang]?.[key] ?? translations.en[key] ?? key;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function initials(name) {
  const parts = String(name || 'M').trim().split(/\s+/);
  return (parts[0]?.[0] || 'M') + (parts[1]?.[0] || '');
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function avatarHtml(name, photoUrl, extraClass = '') {
  if (photoUrl) {
    return `<img src="${escapeHtml(photoUrl)}" alt="" class="chat-avatar ${extraClass}">`;
  }
  return `<span class="chat-avatar chat-avatar--initials ${extraClass}" aria-hidden="true">${escapeHtml(initials(name))}</span>`;
}

let chatState = { tab: 'chats', activeConversationId: null };
let chatMounted = false;
let chatBusy = false;
let chatCache = { incoming: [], conversations: [], at: 0 };

const CACHE_MS = 12000;

export function closeChatPage() {
  document.body.classList.remove('on-chat-page', 'chat-thread-open');
  const page = document.getElementById('chat-page');
  if (page) {
    page.hidden = true;
    page.querySelector('#chatLoadingOverlay')?.setAttribute('hidden', '');
  }
  import('./ui/navigation.js').then(({ syncMobileNavFromBody }) => syncMobileNavFromBody());
}

function buildChatShell() {
  return `
    <div class="chat-app" id="chatApp">
      <aside class="chat-sidebar" id="chatSidebar">
        <header class="chat-sidebar-header">
          <div>
            <p class="profile-page-label">${escapeHtml(t('chat.title'))}</p>
            <h1 class="chat-sidebar-title">${escapeHtml(t('chat.title'))}</h1>
          </div>
          <button type="button" class="profile-page-back chat-sidebar-back" id="chatPageBack">${escapeHtml(t('chat.back'))}</button>
        </header>
        <div class="chat-sidebar-tabs" role="tablist">
          <button type="button" class="chat-sidebar-tab" data-chat-tab="requests">${escapeHtml(t('chat.requests'))}<span class="chat-tab-badge" data-requests-badge hidden></span></button>
          <button type="button" class="chat-sidebar-tab active" data-chat-tab="chats">${escapeHtml(t('chat.chats'))}<span class="chat-tab-badge chat-tab-badge--muted" data-chats-badge hidden></span></button>
        </div>
        <div class="chat-loading-overlay" id="chatLoadingOverlay" aria-live="polite" aria-busy="true">
          <div class="chat-skeleton">
            <div class="chat-skeleton-line"></div>
            <div class="chat-skeleton-line"></div>
            <div class="chat-skeleton-line"></div>
          </div>
        </div>
        <div class="chat-sidebar-pane" data-pane="requests"></div>
        <div class="chat-sidebar-pane" data-pane="chats"></div>
      </aside>
      <main class="chat-main" id="chatMain">
        <div class="chat-main-empty">
          <div class="chat-main-empty-icon">💬</div>
          <h2>${escapeHtml(t('chat.selectConversation'))}</h2>
          <p>${escapeHtml(t('chat.selectConversationSub'))}</p>
        </div>
      </main>
    </div>
  `;
}

function ensureChatMounted(page) {
  if (chatMounted) return;
  page.innerHTML = buildChatShell();

  page.querySelector('#chatPageBack')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeChatPage();
  });

  page.querySelectorAll('[data-chat-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return;
      switchChatTab(btn.dataset.chatTab, page);
    });
  });

  chatMounted = true;
}

function setLoading(page, on) {
  const overlay = page.querySelector('#chatLoadingOverlay');
  if (!overlay) return;
  if (on) overlay.removeAttribute('hidden');
  else overlay.setAttribute('hidden', '');
}

function updateTabBadges(page, reqCount, chatCount) {
  const reqBadge = page.querySelector('[data-requests-badge]');
  const chatBadge = page.querySelector('[data-chats-badge]');
  if (reqBadge) {
    if (reqCount > 0) {
      reqBadge.textContent = String(reqCount);
      reqBadge.hidden = false;
    } else {
      reqBadge.hidden = true;
    }
  }
  if (chatBadge) {
    if (chatCount > 0) {
      chatBadge.textContent = String(chatCount);
      chatBadge.hidden = false;
    } else {
      chatBadge.hidden = true;
    }
  }
}

function switchChatTab(tab, page) {
  chatState.tab = tab;
  page.querySelectorAll('[data-chat-tab]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.chatTab === tab);
  });
  page.querySelectorAll('[data-pane]').forEach((pane) => {
    pane.classList.toggle('hidden', pane.dataset.pane !== tab);
  });
  document.body.classList.remove('chat-thread-open');
  chatState.activeConversationId = null;
  resetMainPane(page);
}

function resetMainPane(page) {
  const main = page.querySelector('#chatMain');
  if (!main) return;
  main.innerHTML = `
    <div class="chat-main-empty">
      <div class="chat-main-empty-icon">💬</div>
      <h2>${escapeHtml(t('chat.selectConversation'))}</h2>
      <p>${escapeHtml(t('chat.selectConversationSub'))}</p>
    </div>
  `;
}

function renderRequests(list) {
  if (!list.length) {
    return `<p class="chat-sidebar-empty">${escapeHtml(t('chat.noRequests'))}</p>`;
  }
  return `<ul class="chat-conv-list">${list
    .map(
      (r) => `
    <li class="chat-conv-item chat-conv-item--request">
      ${avatarHtml(r.fromUser?.fullName, r.profile?.photoUrl)}
      <div class="chat-conv-body">
        <div class="chat-conv-top">
          <strong>${escapeHtml(r.fromUser?.fullName || 'Member')}</strong>
          <span class="chat-conv-time">${formatTime(r.createdAt)}</span>
        </div>
        ${r.message ? `<p class="chat-conv-preview">${escapeHtml(r.message)}</p>` : '<p class="chat-conv-preview chat-conv-preview--muted">Chat request</p>'}
        <div class="chat-conv-actions">
          ${r.profile?.id ? `<button type="button" class="btn-link" data-view-profile="${r.profile.id}">${escapeHtml(t('chat.viewProfile'))}</button>` : ''}
          <button type="button" class="btn-secondary btn-sm" data-decline-request="${r.requestId}">${escapeHtml(t('chat.decline'))}</button>
          <button type="button" class="btn-login btn-sm" data-accept-request="${r.requestId}">${escapeHtml(t('chat.accept'))}</button>
        </div>
      </div>
    </li>`
    )
    .join('')}</ul>`;
}

function renderConversations(list) {
  if (!list.length) {
    return `<p class="chat-sidebar-empty">${escapeHtml(t('chat.noChats'))}</p>`;
  }
  return `<ul class="chat-conv-list">${list
    .map(
      (c) => `
    <li class="chat-conv-item ${chatState.activeConversationId === c.conversationId ? 'active' : ''}"
        data-open-conversation="${c.conversationId}"
        data-conv-profile-id="${c.profile?.id || ''}"
        data-conv-name="${escapeHtml(c.profile?.displayName || c.otherName)}"
        data-conv-photo="${escapeHtml(c.profile?.photoUrl || '')}">
      ${avatarHtml(c.profile?.displayName || c.otherName, c.profile?.photoUrl)}
      <div class="chat-conv-body">
        <div class="chat-conv-top">
          <strong>${escapeHtml(c.profile?.displayName || c.otherName)}</strong>
          <span class="chat-conv-time">${formatTime(c.lastAt)}</span>
        </div>
        <p class="chat-conv-preview">${escapeHtml(c.lastMessage || t('chat.startConversation'))}</p>
      </div>
      ${c.unreadCount > 0 ? `<span class="chat-conv-unread">${c.unreadCount > 9 ? '9+' : c.unreadCount}</span>` : ''}
    </li>`
    )
    .join('')}</ul>`;
}

function paintChatData(page, incoming, conversations, tab) {
  const reqPane = page.querySelector('[data-pane="requests"]');
  const chatPane = page.querySelector('[data-pane="chats"]');
  if (reqPane) reqPane.innerHTML = renderRequests(incoming);
  if (chatPane) chatPane.innerHTML = renderConversations(conversations);

  updateTabBadges(page, incoming.length, conversations.length);
  switchChatTab(tab, page);

  bindRequestActions(page);
  bindConversationActions(page);
}

async function fetchChatData(force = false) {
  const now = Date.now();
  if (!force && chatCache.at && now - chatCache.at < CACHE_MS) {
    return { incoming: chatCache.incoming, conversations: chatCache.conversations };
  }
  const [incomingRes, conversationsRes] = await Promise.all([
    api.getIncomingChatRequests(),
    api.getConversations(),
  ]);
  const incoming = incomingRes?.data || [];
  const conversations = conversationsRes?.data || [];
  chatCache = { incoming, conversations, at: now };
  return { incoming, conversations };
}

export async function openChatPage(tab = 'chats', conversationId = null) {
  const page = document.getElementById('chat-page');
  if (!page || chatBusy || isNavLocked('chat')) return;
  if (!isLoggedIn() || !document.body.classList.contains('on-main-site')) return;

  return withNavLock('chat', async () => {
  chatBusy = true;
  chatState.tab = tab;
  chatState.activeConversationId = conversationId;

  closeFullPageOverlays({ except: 'chat' });
  ensureChatMounted(page);

  document.body.classList.add('on-chat-page');
  page.hidden = false;
  window.scrollTo(0, 0);

  const useCache = chatCache.at && Date.now() - chatCache.at < CACHE_MS;
  if (!useCache) setLoading(page, true);

  try {
    const { incoming, conversations } = await fetchChatData(!useCache);
    paintChatData(page, incoming, conversations, tab);
    setLoading(page, false);

    if (conversationId) {
      const conv = conversations.find((c) => String(c.conversationId) === String(conversationId));
      openThread(
        conversationId,
        conv?.profile?.displayName || conv?.otherName,
        conv?.profile?.photoUrl || '',
        conv?.profile?.id || null,
        page
      );
    }

    refreshNavBadges();
  } catch (err) {
    setLoading(page, false);
    const reqPane = page.querySelector('[data-pane="requests"]');
    if (reqPane) {
      reqPane.innerHTML = `<p class="profile-status is-error">${escapeHtml(err.message)}</p>`;
      reqPane.classList.remove('hidden');
    }
  } finally {
    chatBusy = false;
  }
  });
}

function bindRequestActions(page) {
  page.querySelectorAll('[data-accept-request]').forEach((btn) => {
    btn.replaceWith(btn.cloneNode(true));
  });
  page.querySelectorAll('[data-decline-request]').forEach((btn) => {
    btn.replaceWith(btn.cloneNode(true));
  });
  page.querySelectorAll('[data-view-profile]').forEach((btn) => {
    btn.replaceWith(btn.cloneNode(true));
  });

  page.querySelectorAll('[data-accept-request]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      btn.disabled = true;
      try {
        chatCache.at = 0;
        const res = await api.respondChatRequest(btn.dataset.acceptRequest, 'accept');
        if (res?.data?.conversationId) {
          await openChatPage('chats', res.data.conversationId);
        } else {
          await openChatPage('requests');
        }
      } catch (err) {
        alert(err instanceof ApiError ? err.message : 'Could not accept');
      } finally {
        btn.disabled = false;
      }
    });
  });

  page.querySelectorAll('[data-decline-request]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      btn.disabled = true;
      try {
        chatCache.at = 0;
        await api.respondChatRequest(btn.dataset.declineRequest, 'decline');
        await openChatPage('requests');
      } catch (err) {
        alert(err instanceof ApiError ? err.message : 'Could not decline');
      } finally {
        btn.disabled = false;
      }
    });
  });

  page.querySelectorAll('[data-view-profile]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openProfileModal(btn.dataset.viewProfile);
    });
  });
}

function bindConversationActions(page) {
  page.querySelectorAll('[data-open-conversation]').forEach((el) => {
    el.replaceWith(el.cloneNode(true));
  });
  page.querySelectorAll('[data-open-conversation]').forEach((el) => {
    el.addEventListener('click', () => {
      openThread(
        el.dataset.openConversation,
        el.dataset.convName,
        el.dataset.convPhoto || '',
        el.dataset.convProfileId || null,
        page
      );
    });
  });
}

function threadShellHtml(displayName, photoUrl, profileId) {
  const profileBtn = profileId
    ? `<button type="button" class="chat-thread-profile-btn" id="chatThreadProfileBtn" data-profile-id="${profileId}" aria-label="${escapeHtml(t('chat.viewProfileHeader'))}">
        ${avatarHtml(displayName, photoUrl, 'chat-avatar--lg')}
        <div class="chat-thread-header-text">
          <strong>${escapeHtml(displayName || 'Chat')}</strong>
          <span class="chat-thread-status">${escapeHtml(t('chat.viewProfileHeader'))}</span>
        </div>
      </button>`
    : `<div class="chat-thread-profile-btn chat-thread-profile-btn--static">
        ${avatarHtml(displayName, photoUrl, 'chat-avatar--lg')}
        <div class="chat-thread-header-text">
          <strong>${escapeHtml(displayName || 'Chat')}</strong>
          <span class="chat-thread-status">${escapeHtml(t('chat.startConversation'))}</span>
        </div>
      </div>`;

  return `
    <div class="chat-thread-panel">
      <header class="chat-thread-header">
        <button type="button" class="chat-thread-back-btn" id="chatThreadBack" aria-label="Back">←</button>
        ${profileBtn}
        <div class="chat-thread-menu-wrap">
          <button type="button" class="chat-thread-menu-btn" id="chatThreadMenuBtn" aria-label="${escapeHtml(t('chat.moreActions'))}" aria-haspopup="true" aria-expanded="false">⋮</button>
          <div class="chat-thread-menu-dropdown" id="chatThreadMenuDropdown" hidden role="menu">
            <button type="button" class="chat-thread-menu-item chat-thread-menu-item--danger" id="chatThreadUnfriendBtn" role="menuitem">${escapeHtml(t('chat.unfriend'))}</button>
          </div>
        </div>
      </header>
      <div class="chat-thread-messages" id="chatMessages">
        <div class="chat-msg-skeleton"><div class="chat-skeleton-line"></div><div class="chat-skeleton-line"></div></div>
      </div>
      <form class="chat-thread-compose" id="chatComposeForm">
        <input class="chat-compose-input" name="body" placeholder="${escapeHtml(t('chat.typeMessage'))}" maxlength="2000" required autocomplete="off">
        <button type="submit" class="chat-compose-send" aria-label="${escapeHtml(t('chat.send'))}">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
        </button>
      </form>
    </div>
  `;
}

function closeThreadMenu() {
  const dropdown = document.getElementById('chatThreadMenuDropdown');
  const menuBtn = document.getElementById('chatThreadMenuBtn');
  if (dropdown) dropdown.hidden = true;
  if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
}

function bindThreadHeaderActions(conversationId, profileId, page) {
  document.getElementById('chatThreadProfileBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeThreadMenu();
    const id = e.currentTarget.dataset.profileId;
    if (id) openProfileModal(id);
  });

  const menuBtn = document.getElementById('chatThreadMenuBtn');
  const dropdown = document.getElementById('chatThreadMenuDropdown');

  menuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = dropdown?.hidden !== false;
    if (dropdown) dropdown.hidden = !open;
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  document.getElementById('chatThreadUnfriendBtn')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    closeThreadMenu();
    if (!window.confirm(t('chat.unfriendConfirm'))) return;

    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      chatCache.at = 0;
      await api.disconnectChat(conversationId);
      document.body.classList.remove('chat-thread-open');
      chatState.activeConversationId = null;
      await openChatPage('chats');
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 404 && /route not found/i.test(err.message || '')
          ? t('chat.unfriendRetry')
          : err instanceof ApiError
            ? err.message
            : t('chat.unfriendFailed');
      alert(msg);
    } finally {
      btn.disabled = false;
    }
  });
}

async function openThread(conversationId, displayName, photoUrl, profileId, page) {
  const main = page.querySelector('#chatMain');
  if (!main) return;

  chatState.activeConversationId = Number(conversationId);
  document.body.classList.add('chat-thread-open');

  page.querySelectorAll('.chat-conv-item[data-open-conversation]').forEach((el) => {
    el.classList.toggle('active', el.dataset.openConversation === String(conversationId));
  });

  main.innerHTML = threadShellHtml(displayName, photoUrl, profileId);
  bindThreadHeaderActions(conversationId, profileId, page);

  document.getElementById('chatThreadBack')?.addEventListener('click', () => {
    closeThreadMenu();
    document.body.classList.remove('chat-thread-open');
    chatState.activeConversationId = null;
    resetMainPane(page);
    page.querySelectorAll('.chat-conv-item.active').forEach((el) => el.classList.remove('active'));
  });

  try {
    const res = await api.getChatMessages(conversationId);
    const messages = res?.data || [];
    const box = document.getElementById('chatMessages');

    if (!messages.length) {
      box.innerHTML = `<p class="chat-sidebar-empty">${escapeHtml(t('chat.startConversation'))}</p>`;
    } else {
      let lastDay = '';
      box.innerHTML = messages
        .map((m) => {
          const d = new Date(m.createdAt);
          const dayKey = d.toDateString();
          let daySep = '';
          if (dayKey !== lastDay) {
            lastDay = dayKey;
            const dayLabel = d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
            daySep = `<div class="chat-day-sep"><span>${escapeHtml(dayLabel)}</span></div>`;
          }
          return `${daySep}
          <div class="chat-msg-row ${m.isMine ? 'chat-msg-row--mine' : 'chat-msg-row--theirs'}">
            <div class="chat-msg-bubble">
              <p>${escapeHtml(m.body)}</p>
              <time class="chat-msg-time">${formatTime(m.createdAt)}</time>
            </div>
          </div>`;
        })
        .join('');
      box.scrollTop = box.scrollHeight;
    }

    refreshNavBadges();
    chatCache.at = 0;

    document.getElementById('chatComposeForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = e.target.elements.body;
      const body = input?.value?.trim();
      if (!body) return;
      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      try {
        const sent = await api.sendChatMessage(conversationId, body);
        input.value = '';
        const msgBox = document.getElementById('chatMessages');
        if (msgBox && sent?.data) {
          const empty = msgBox.querySelector('.chat-sidebar-empty');
          if (empty) empty.remove();
          const row = document.createElement('div');
          row.className = 'chat-msg-row chat-msg-row--mine';
          row.innerHTML = `
            <div class="chat-msg-bubble">
              <p>${escapeHtml(sent.data.body)}</p>
              <time class="chat-msg-time">${formatTime(sent.data.createdAt || new Date().toISOString())}</time>
            </div>`;
          msgBox.appendChild(row);
          msgBox.scrollTop = msgBox.scrollHeight;
        }
        refreshNavBadges();
      } catch (err) {
        alert(err instanceof ApiError ? err.message : 'Send failed');
      } finally {
        submitBtn.disabled = false;
      }
    });
  } catch (err) {
    document.getElementById('chatMessages').innerHTML = `<p class="profile-status is-error">${escapeHtml(err.message)}</p>`;
  }
}

export function initChat() {
  document.addEventListener('click', (e) => {
    if (document.body.classList.contains('chat-thread-open')) {
      if (!e.target.closest('.chat-thread-menu-wrap')) closeThreadMenu();
    }
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-open-chat]');
    if (!link || isMobileBottomNavClick(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn() || !document.body.classList.contains('on-main-site')) return;
    if (isNavSwitchLocked() || document.body.classList.contains('on-chat-page')) return;

    openChatPage();
  });

  document.addEventListener('smm:lang-change', () => {
    if (!document.body.classList.contains('on-chat-page')) return;
    const page = document.getElementById('chat-page');
    if (!page) return;
    import('./i18n/index.js').then(({ applyLanguageToRoot }) => {
      applyLanguageToRoot(page);
    });
  });
}
