/** Rotate inspirational quotes in quote blocks (no fake statistics). */
const QUOTE_SELECTORS = ['.hero-quotes', '.login-visual-quotes', '.login-trust-quotes'];

export function initQuoteRotators() {
  QUOTE_SELECTORS.forEach((selector) => {
    const wrap = document.querySelector(selector);
    if (!wrap) return;
    const items = wrap.querySelectorAll('.quote-item');
    if (items.length < 2) return;

    let idx = 0;
    items[0].classList.add('is-active');

    setInterval(() => {
      items[idx].classList.remove('is-active');
      idx = (idx + 1) % items.length;
      items[idx].classList.add('is-active');
    }, 7000);
  });
}
