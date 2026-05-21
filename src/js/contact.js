import { api, ApiError } from './api.js';
import { openModal, closeModal, setModalMessage } from './ui/modal.js';

const CONTACT_HTML = `
  <form id="contactForm" class="modal-form">
    <div class="form-group">
      <label class="form-label">Your name *</label>
      <input class="form-input" name="name" required maxlength="120">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Email</label>
        <input class="form-input" type="email" name="email">
      </div>
      <div class="form-group">
        <label class="form-label">Phone</label>
        <input class="form-input" type="tel" name="phone">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Subject</label>
      <input class="form-input" name="subject" maxlength="200">
    </div>
    <div class="form-group">
      <label class="form-label">Message *</label>
      <textarea class="form-input" name="message" rows="4" required maxlength="2000" style="resize:vertical;min-height:100px"></textarea>
    </div>
    <button type="submit" class="btn-login">Send message</button>
  </form>
`;

export function openContactModal() {
  openModal('Contact us', CONTACT_HTML);
  setModalMessage('');

  document.getElementById('contactForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setModalMessage('');
    const fd = new FormData(e.target);
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await api.sendContact({
        name: fd.get('name')?.trim(),
        email: fd.get('email')?.trim() || undefined,
        phone: fd.get('phone')?.trim() || undefined,
        subject: fd.get('subject')?.trim() || undefined,
        message: fd.get('message')?.trim(),
      });
      setModalMessage('Thank you! We will get back to you soon.');
      setTimeout(closeModal, 2000);
    } catch (err) {
      setModalMessage(err instanceof ApiError ? err.message : 'Could not send message.', true);
    } finally {
      btn.disabled = false;
    }
  });
}

export function initContact() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-open-contact]');
    if (!el) return;
    e.preventDefault();
    openContactModal();
  });
}
