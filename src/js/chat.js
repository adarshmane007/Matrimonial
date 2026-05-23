import { api, ApiError } from './api.js';
import { getUser } from './storage.js';
import { getLang } from './i18n/index.js';
import { translations } from './i18n/translations.js';
import { openProfileModal } from './profileModal.js';
import { refreshNavBadges } from './ui/nav.js';

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

export function closeChatPage() {
  document.body.classList.remove('on-chat-page', 'chat-thread-open');
  const page = document.getElementById('chat-page');
  if (page) page.hidden = true;
}

let chatState = { tab: 'chats', activeConversationId: null };

export async function openChatPage(tab = 'chats', conversationId = null) {
  const page = document.getElementById('chat-page');
  if (!page) return;

  chatState.tab = tab;
  chatState.activeConversationId = conversationId;

  document.body.classList.add('on-chat-page');
  page.hidden = false;
  page.innerHTML = '<p class="profile-loading">Loading messages…</p>';
  window.scrollTo(0, 0);

  try {
    const [incoming, conversations] = await Promise.all([
      api.getIncomingChatRequests(),
      api.getConversations(),
    ]);

    const reqCount = incoming?.data?.length || 0;
    const chatCount = conversations?.data?.length || 0;

    page.innerHTML = `
      <div class="chat-app">
        <aside class="chat-sidebar" id="chatSidebar">
          <header class="chat-sidebar-header">
            <div>
              <p class="profile-page-label">${escapeHtml(t('chat.title'))}</p>
              <h1 class="chat-sidebar-title">${escapeHtml(t('chat.title'))}</h1>
            </div>
            <button type="button" class="profile-page-back chat-sidebar-back" id="chatPageBack">${escapeHtml(t('chat.back'))}</button>
          </header>
          <div class="chat-sidebar-tabs" role="tablist">
            <button type="button" class="chat-sidebar-tab ${tab === 'requests' ? 'active' : ''}" data-chat-tab="requests">
              ${escapeHtml(t('chat.requests'))}
              ${reqCount ? `<span class="chat-tab-badge">${reqCount}</span>` : ''}
            </button>
            <button type="button" class="chat-sidebar-tab ${tab === 'chats' ? 'active' : ''}" data-chat-tab="chats">
              ${escapeHtml(t('chat.chats'))}
              ${chatCount ? `<span class="chat-tab-badge chat-tab-badge--muted">${chatCount}</span>` : ''}
            </button>
          </div>
          <div class="chat-sidebar-pane ${tab === 'requests' ? '' : 'hidden'}" data-pane="requests">
            ${renderRequests(incoming?.data || [])}
          </div>
          <div class="chat-sidebar-pane ${tab === 'chats' ? '' : 'hidden'}" data-pane="chats">
            ${renderConversations(conversations?.data || [])}
          </div>
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

    document.getElementById('chatPageBack')?.addEventListener('click', (e) => {
      e.preventDefault();
      closeChatPage();
    });

    page.querySelectorAll('[data-chat-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        openChatPage(btn.dataset.chatTab, null);
      });
    });

    bindRequestActions(page);
    bindConversationActions(page);

    if (conversationId) {
      const conv = (conversations?.data || []).find((c) => String(c.conversationId) === String(conversationId));
      openThread(conversationId, conv?.profile?.displayName || conv?.otherName, conv?.profile?.photoUrl, page);
    }

    refreshNavBadges();
  } catch (err) {
    page.innerHTML = `<p class="profile-status is-error">${escapeHtml(err.message)}</p>`;
  }
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

function bindRequestActions(page) {
  page.querySelectorAll('[data-accept-request]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      btn.disabled = true;
      try {
        const res = await api.respondChatRequest(btn.dataset.acceptRequest, 'accept');
        if (res?.data?.conversationId) {
          openChatPage('chats', res.data.conversationId);
        } else {
          openChatPage('requests');
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
        await api.respondChatRequest(btn.dataset.declineRequest, 'decline');
        openChatPage('requests');
        refreshNavBadges();
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
    el.addEventListener('click', () => {
      openThread(
        el.dataset.openConversation,
        el.dataset.convName,
        el.dataset.convPhoto || '',
        page
      );
    });
  });
}

async function openThread(conversationId, displayName, photoUrl, page) {
  const main = page.querySelector('#chatMain');
  if (!main) return;

  chatState.activeConversationId = Number(conversationId);
  document.body.classList.add('chat-thread-open');

  page.querySelectorAll('.chat-conv-item[data-open-conversation]').forEach((el) => {
    el.classList.toggle('active', el.dataset.openConversation === String(conversationId));
  });

  main.innerHTML = `
    <div class="chat-thread-panel">
      <header class="chat-thread-header">
        <button type="button" class="chat-thread-back-btn" id="chatThreadBack" aria-label="Back">←</button>
        ${avatarHtml(displayName, photoUrl, 'chat-avatar--lg')}
        <div class="chat-thread-header-text">
          <strong>${escapeHtml(displayName || 'Chat')}</strong>
          <span class="chat-thread-status">${escapeHtml(t('chat.startConversation'))}</span>
        </div>
      </header>
      <div class="chat-thread-messages" id="chatMessages">
        <p class="chat-sidebar-empty">Loading…</p>
      </div>
      <form class="chat-thread-compose" id="chatComposeForm">
        <input class="chat-compose-input" name="body" placeholder="${escapeHtml(t('chat.typeMessage'))}" maxlength="2000" required autocomplete="off">
        <button type="submit" class="chat-compose-send" aria-label="${escapeHtml(t('chat.send'))}">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
        </button>
      </form>
    </div>
  `;

  document.getElementById('chatThreadBack')?.addEventListener('click', () => {
    document.body.classList.remove('chat-thread-open');
    chatState.activeConversationId = null;
    main.innerHTML = `
      <div class="chat-main-empty">
        <div class="chat-main-empty-icon">💬</div>
        <h2>${escapeHtml(t('chat.selectConversation'))}</h2>
        <p>${escapeHtml(t('chat.selectConversationSub'))}</p>
      </div>
    `;
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

    document.getElementById('chatComposeForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = e.target.elements.body;
      const body = input?.value?.trim();
      if (!body) return;
      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      try {
        await api.sendChatMessage(conversationId, body);
        input.value = '';
        openThread(conversationId, displayName, photoUrl, page);
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
    const link = e.target.closest('[data-open-chat]');
    if (!link) return;
    e.preventDefault();
    if (!document.body.classList.contains('on-main-site')) {
      import('./ui/session.js').then(({ enterMainSite }) => enterMainSite());
    }
    openChatPage();
  });

  document.addEventListener('smm:lang-change', () => {
    if (document.body.classList.contains('on-chat-page')) {
      const tab = chatState.tab;
      const conv = chatState.activeConversationId;
      openChatPage(tab, conv);
    }
  });
}
