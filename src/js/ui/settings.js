export function initSettingsPanels() {
  const panels = document.querySelectorAll('.settings-panel, .settings-panel--mobile');

  document.addEventListener(
    'click',
    (e) => {
      const langEl = e.target.closest('[data-set-lang]');
      if (langEl) {
        e.preventDefault();
        e.stopPropagation();
        const lang = langEl.getAttribute('data-set-lang');
        if (window.setSiteLanguage) window.setSiteLanguage(lang);
        return;
      }

      const toggle = e.target.closest('.settings-toggle');
      if (toggle) {
        e.stopPropagation();
        const wrap = toggle.closest('.nav-settings-wrap');
        const panel =
          wrap?.querySelector('.settings-panel') ||
          wrap?.querySelector('.settings-panel--mobile');
        if (!panel) return;
        const isOpen = panel.classList.contains('open');
        panels.forEach((p) => p.classList.remove('open'));
        if (!isOpen) panel.classList.add('open');
        return;
      }

      if (!e.target.closest('.nav-settings-wrap')) {
        panels.forEach((p) => p.classList.remove('open'));
      }
    },
    true
  );

  document.querySelectorAll('.settings-toggle').forEach((btn) => {
    btn.addEventListener('click', (e) => e.stopPropagation());
  });
}
