import { api, ApiError } from './api.js';
import { getUser } from './storage.js';
import { getLang } from './i18n/index.js';
import { openProfileModal } from './profileModal.js';

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function closeChatPage() {
  document.body.classList.remove('on-chat-page');
  const page = document.getElementById('chat-page');
  if (page) page.hidden = true;
}

export async function openChatPage(tab = 'requests') {
  const page = document.getElementById('chat-page');
  if (!page) return;

  document.body.classList.add('on-chat-page');
  page.hidden = false;
  page.innerHTML = '<p class="profile-loading">Loading messages…</p>';
  window.scrollTo(0, 0);

  try {
    const [incoming, conversations] = await Promise.all([
      api.getIncomingChatRequests(),
      api.getConversations(),
    ]);

    page.innerHTML = `
      <div class="chat-page-inner">
        <div class="browse-page-header">
          <div>
            <p class="profile-page-label">Messages</p>
            <h1 class="profile-page-title">Chat &amp; Requests</h1>
            <p class="profile-page-sub">Accept requests to start chatting. Phone numbers stay private until you connect.</p>
          </div>
          <button type="button" class="profile-page-back" id="chatPageBack">← Back</button>
        </div>
        <div class="chat-tabs" role="tablist">
          <button type="button" class="chat-tab ${tab === 'requests' ? 'active' : ''}" data-chat-tab="requests">
            Requests (${incoming?.data?.length || 0})
          </button>
          <button type="button" class="chat-tab ${tab === 'chats' ? 'active' : ''}" data-chat-tab="chats">
            Chats (${conversations?.data?.length || 0})
          </button>
        </div>
        <div class="chat-tab-pane ${tab === 'requests' ? '' : 'hidden'}" data-pane="requests">
          ${renderRequests(incoming?.data || [])}
        </div>
        <div class="chat-tab-pane ${tab === 'chats' ? '' : 'hidden'}" data-pane="chats">
          ${renderConversations(conversations?.data || [])}
        </div>
        <div id="chatThreadWrap" class="chat-thread-wrap hidden"></div>
      </div>
    `;

    document.getElementById('chatPageBack')?.addEventListener('click', (e) => {
      e.preventDefault();
      closeChatPage();
    });

    page.querySelectorAll('[data-chat-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.chatTab;
        page.querySelectorAll('.chat-tab').forEach((b) => b.classList.toggle('active', b === btn));
        page.querySelectorAll('.chat-tab-pane').forEach((p) => {
          p.classList.toggle('hidden', p.dataset.pane !== t);
        });
        document.getElementById('chatThreadWrap')?.classList.add('hidden');
      });
    });

    bindRequestActions(page);
    bindConversationActions(page);
  } catch (err) {
    page.innerHTML = `<p class="profile-status is-error">${escapeHtml(err.message)}</p>`;
  }
}

function renderRequests(list) {
  if (!list.length) {
    return '<p class="chat-empty">No pending chat requests.</p>';
  }
  return `<ul class="chat-list">${list
    .map(
      (r) => `
    <li class="chat-list-item">
      <div class="chat-list-main">
        <strong>${escapeHtml(r.fromUser?.fullName || 'Member')}</strong>
        ${r.message ? `<p class="chat-list-msg">${escapeHtml(r.message)}</p>` : ''}
        ${r.profile?.id ? `<button type="button" class="btn-link" data-view-profile="${r.profile.id}">View profile</button>` : ''}
      </div>
      <div class="chat-list-actions">
        <button type="button" class="btn-secondary btn-sm" data-decline-request="${r.requestId}">Decline</button>
        <button type="button" class="btn-login btn-sm" data-accept-request="${r.requestId}">Accept</button>
      </div>
    </li>`
    )
    .join('')}</ul>`;
}

function renderConversations(list) {
  if (!list.length) {
    return '<p class="chat-empty">No active chats yet. Send a chat request from a profile.</p>';
  }
  return `<ul class="chat-list">${list
    .map(
      (c) => `
    <li class="chat-list-item chat-list-item-clickable" data-open-conversation="${c.conversationId}">
      <div class="chat-list-main">
        <strong>${escapeHtml(c.profile?.displayName || c.otherName)}</strong>
        <p class="chat-list-msg">${escapeHtml(c.lastMessage || 'Start conversation')}</p>
      </div>
      <span class="chat-list-arrow">→</span>
    </li>`
    )
    .join('')}</ul>`;
}

function bindRequestActions(page) {
  page.querySelectorAll('[data-accept-request]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        const res = await api.respondChatRequest(btn.dataset.acceptRequest, 'accept');
        if (res?.data?.conversationId) {
          openThread(res.data.conversationId, page);
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
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await api.respondChatRequest(btn.dataset.declineRequest, 'decline');
        openChatPage('requests');
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
      openThread(el.dataset.openConversation, page);
    });
  });
}

async function openThread(conversationId, page) {
  const wrap = page.querySelector('#chatThreadWrap');
  if (!wrap) return;

  wrap.classList.remove('hidden');
  wrap.innerHTML = '<p class="chat-empty">Loading chat…</p>';

  try {
    const res = await api.getChatMessages(conversationId);
    const messages = res?.data || [];
    const me = getUser();

    wrap.innerHTML = `
      <div class="chat-thread">
        <button type="button" class="chat-thread-back" id="chatThreadBack">← Back to list</button>
        <div class="chat-messages" id="chatMessages">${messages
          .map(
            (m) => `
          <div class="chat-bubble ${m.isMine ? 'mine' : 'theirs'}">
            ${!m.isMine ? `<span class="chat-bubble-name">${escapeHtml(m.senderName)}</span>` : ''}
            <p>${escapeHtml(m.body)}</p>
          </div>`
          )
          .join('')}</div>
        <form class="chat-compose" id="chatComposeForm">
          <input class="form-input" name="body" placeholder="Type a message…" maxlength="2000" required autocomplete="off">
          <button type="submit" class="btn-login">Send</button>
        </form>
      </div>
    `;

    const box = document.getElementById('chatMessages');
    if (box) box.scrollTop = box.scrollHeight;

    document.getElementById('chatThreadBack')?.addEventListener('click', () => {
      wrap.classList.add('hidden');
    });

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
        openThread(conversationId, page);
      } catch (err) {
        alert(err instanceof ApiError ? err.message : 'Send failed');
      } finally {
        submitBtn.disabled = false;
      }
    });
  } catch (err) {
    wrap.innerHTML = `<p class="profile-status is-error">${escapeHtml(err.message)}</p>`;
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
}
