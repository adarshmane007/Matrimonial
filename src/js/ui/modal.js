let modalEl;
let bodyEl;

export function initModal() {
  modalEl = document.getElementById('appModal');
  bodyEl = document.getElementById('appModalBody');
  if (!modalEl || !bodyEl) return;

  modalEl.querySelectorAll('[data-modal-close]').forEach((el) => {
    el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalEl && !modalEl.hidden) closeModal();
  });
}

export function openModal(title, html) {
  if (!modalEl || !bodyEl) return;
  const titleEl = document.getElementById('appModalTitle');
  if (titleEl) titleEl.textContent = title;
  bodyEl.innerHTML = html;
  modalEl.hidden = false;
  modalEl.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

export function closeModal() {
  if (!modalEl) return;
  modalEl.hidden = true;
  modalEl.setAttribute('aria-hidden', 'true');
  bodyEl.innerHTML = '';
  document.body.style.overflow = '';
}

export function setModalMessage(msg, isError = false) {
  const el = document.getElementById('appModalMessage');
  if (!el) return;
  el.textContent = msg || '';
  el.hidden = !msg;
  el.classList.toggle('is-error', isError);
}
