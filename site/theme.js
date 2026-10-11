(() => {
  const root = document.documentElement;
  const storageKey = 'wayfinder-theme';
  let explicitTheme = null;
  let preference = null;
  let button;
  let label;

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'light' || saved === 'dark') explicitTheme = saved;
  } catch {}

  if (!explicitTheme) {
    try { preference = window.matchMedia('(prefers-color-scheme: dark)'); } catch {}
  }

  function systemTheme() {
    try { return preference && preference.matches === true ? 'dark' : 'light'; }
    catch { return 'light'; }
  }

  let theme = explicitTheme || systemTheme();

  function applyTheme(next) {
    theme = next;
    root.dataset.theme = theme;
    const color = document.querySelector('meta[name="theme-color"]');
    if (color) color.content = theme === 'dark' ? '#0e1728' : '#f8fafd';
    if (button) {
      button.setAttribute('aria-pressed', String(theme === 'dark'));
      button.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
      if (label) label.textContent = theme === 'dark' ? 'Dark' : 'Light';
    }
  }

  applyTheme(theme);

  function followSystemTheme() {
    if (!explicitTheme) applyTheme(systemTheme());
  }

  if (preference) {
    try {
      if (typeof preference.addEventListener === 'function') preference.addEventListener('change', followSystemTheme);
      else if (typeof preference.addListener === 'function') preference.addListener(followSystemTheme);
    } catch {}
  }

  function initializeToggle() {
    button = document.getElementById('theme-toggle');
    if (!button) return;
    label = button.querySelector('[data-theme-label]');

    applyTheme(theme);
    button.hidden = false;
    button.addEventListener('click', () => {
      explicitTheme = theme === 'dark' ? 'light' : 'dark';
      applyTheme(explicitTheme);
      try { localStorage.setItem(storageKey, theme); } catch {}
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeToggle, { once: true });
  else initializeToggle();
})();
