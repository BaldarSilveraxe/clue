(function() {
  const btn = document.getElementById('themeToggle');
  
  if (!btn) {
    return; // Stop if the button doesn't exist
  }

  const render = () => {
    const t = document.documentElement.dataset.theme;
    btn.textContent = t === 'dark' ? 'Light mode' : 'Dark mode';
    btn.setAttribute('aria-pressed', t === 'dark');
  };
  
  btn.addEventListener('click', () => {
    window.theme.toggle();
    render();
  });
  
  // Initial render when the script loads
  render();
})();
