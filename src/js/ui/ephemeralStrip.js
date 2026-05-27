let hideTimer = null;

export function showEphemeralStrip(text, { durationMs = 10000, variant = '' } = {}) {
  const strip = document.getElementById('ephemeralStrip');
  const textEl = document.getElementById('ephemeralStripText');
  if (!strip || !textEl) return;

  clearTimeout(hideTimer);
  strip.classList.remove('ephemeral-strip--founding', 'ephemeral-strip--visible');
  if (variant) strip.classList.add(`ephemeral-strip--${variant}`);

  textEl.textContent = text || '';
  strip.hidden = false;
  document.body.classList.add('has-ephemeral-strip');
  requestAnimationFrame(() => strip.classList.add('ephemeral-strip--visible'));

  hideTimer = setTimeout(() => hideEphemeralStrip(), durationMs);
}

export function hideEphemeralStrip() {
  const strip = document.getElementById('ephemeralStrip');
  if (!strip) return;
  clearTimeout(hideTimer);
  strip.classList.remove('ephemeral-strip--visible');
  document.body.classList.remove('has-ephemeral-strip');
  setTimeout(() => {
    if (!strip.classList.contains('ephemeral-strip--visible')) {
      strip.hidden = true;
    }
  }, 320);
}
