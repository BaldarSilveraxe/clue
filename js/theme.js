(() => {
  const btns = document.querySelectorAll('button[data-type="theme"]');
  if (!btns.length) return;

  const render = () => {
    const t = document.documentElement.dataset.theme;
    const label = (t === 'dark') ? 'Light mode' : 'Dark mode';
    btns.forEach(btn => {
      btn.textContent = label;
      btn.setAttribute('aria-pressed', String(t === 'dark'));
    });
  };

  // Wire up clicks on all theme buttons
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      window.theme?.toggle();
      render();
    });
  });

  // If something else changes data-theme (e.g. system change while in "auto"),
  // keep labels updated.
  new MutationObserver(render).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });

  render(); // initial
})();
