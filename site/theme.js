(() => {
  const root = document.documentElement;
  const storageKey = 'wayfinder-theme';
  let theme = 'dark';

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch {}

  function applyTheme(next) {
    theme = next;
    root.dataset.theme = theme;
    const color = document.querySelector('meta[name="theme-color"]');
    if (color) color.content = theme === 'dark' ? '#0e1728' : '#f8fafd';
  }

  applyTheme(theme);

  function initializeToggle() {
    const button = document.getElementById('theme-toggle');
    if (!button) return;
    const label = button.querySelector('[data-theme-label]');

    function updateToggle() {
      button.setAttribute('aria-pressed', String(theme === 'dark'));
      button.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
      if (label) label.textContent = theme === 'dark' ? 'Dark' : 'Light';
    }

    updateToggle();
    button.hidden = false;
    button.addEventListener('click', () => {
      applyTheme(theme === 'dark' ? 'light' : 'dark');
      updateToggle();
      try { localStorage.setItem(storageKey, theme); } catch {}
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeToggle, { once: true });
  else initializeToggle();
})();
