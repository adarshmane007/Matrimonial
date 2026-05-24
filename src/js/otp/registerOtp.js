import { api, ApiError } from '../api.js';
import { t } from '../i18n/index.js';

let verifiedMobile = null;
let verificationToken = null;

export function resetRegisterOtpState() {
  verifiedMobile = null;
  verificationToken = null;
}

export function isMobileOtpVerified(rawMobile) {
  const m = normalizeForCompare(rawMobile);
  return !!(m && verifiedMobile === m && verificationToken);
}

function normalizeForCompare(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (String(raw || '').trim().startsWith('+')) return `+${digits}`;
  return digits ? `+${digits}` : '';
}

export function registerOtpHtml() {
  return `
    <div class="register-otp-block" id="registerOtpBlock">
      <p class="modal-hint" data-i18n="otp.regHint">Verify your mobile with a one-time code (SMS).</p>
      <div class="form-row register-otp-row">
        <div class="form-group" style="flex:1">
          <label class="form-label" data-i18n="otp.codeLabel">Verification code</label>
          <input class="form-input" type="text" id="registerOtpCode" inputmode="numeric" maxlength="8" placeholder="6-digit code" autocomplete="one-time-code">
        </div>
        <div class="form-group register-otp-actions">
          <button type="button" class="btn-secondary" id="registerOtpSendBtn" data-i18n="otp.send">Send code</button>
          <button type="button" class="btn-login" id="registerOtpVerifyBtn" data-i18n="otp.verify">Verify</button>
        </div>
      </div>
      <p class="profile-status" id="registerOtpStatus" hidden></p>
      <p class="profile-status register-otp-verified" id="registerOtpVerified" hidden data-i18n="otp.verified">Mobile verified ✓</p>
    </div>
  `;
}

function setOtpStatus(el, msg, isError = false) {
  if (!el) return;
  el.textContent = msg || '';
  el.hidden = !msg;
  el.classList.toggle('is-error', isError);
}

export function bindRegisterOtp(form, getMobileValue) {
  const block = document.getElementById('registerOtpBlock');
  if (!block) return;

  const sendBtn = document.getElementById('registerOtpSendBtn');
  const verifyBtn = document.getElementById('registerOtpVerifyBtn');
  const codeInput = document.getElementById('registerOtpCode');
  const statusEl = document.getElementById('registerOtpStatus');
  const verifiedEl = document.getElementById('registerOtpVerified');

  const onMobileChange = () => {
    const m = normalizeForCompare(getMobileValue());
    if (m && m !== verifiedMobile) {
      verifiedMobile = null;
      verificationToken = null;
      if (verifiedEl) verifiedEl.hidden = true;
    }
  };

  form.querySelector('[name="mobile"]')?.addEventListener('input', onMobileChange);

  sendBtn?.addEventListener('click', async () => {
    const mobile = getMobileValue()?.trim();
    if (!mobile) {
      setOtpStatus(statusEl, t('otp.needMobile'), true);
      return;
    }
    sendBtn.disabled = true;
    setOtpStatus(statusEl, t('otp.sending'), false);
    try {
      const res = await api.sendOtp(mobile);
      setOtpStatus(statusEl, res?.message || t('otp.sent'), false);
    } catch (err) {
      setOtpStatus(statusEl, err instanceof ApiError ? err.message : t('otp.sendFailed'), true);
    } finally {
      sendBtn.disabled = false;
    }
  });

  verifyBtn?.addEventListener('click', async () => {
    const mobile = getMobileValue()?.trim();
    const code = codeInput?.value?.trim();
    if (!mobile) {
      setOtpStatus(statusEl, t('otp.needMobile'), true);
      return;
    }
    if (!code) {
      setOtpStatus(statusEl, t('otp.needCode'), true);
      return;
    }
    verifyBtn.disabled = true;
    setOtpStatus(statusEl, t('otp.verifying'), false);
    try {
      const res = await api.verifyOtp(mobile, code);
      verifiedMobile = res?.data?.mobile || normalizeForCompare(mobile);
      verificationToken = res?.data?.mobileVerificationToken || null;
      setOtpStatus(statusEl, '', false);
      if (verifiedEl) verifiedEl.hidden = false;
    } catch (err) {
      verifiedMobile = null;
      verificationToken = null;
      if (verifiedEl) verifiedEl.hidden = true;
      setOtpStatus(statusEl, err instanceof ApiError ? err.message : t('otp.verifyFailed'), true);
    } finally {
      verifyBtn.disabled = false;
    }
  });
}

export function getMobileVerificationToken() {
  return verificationToken;
}
