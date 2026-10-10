// Runs before first paint (blocking <script> in index.html). Keep in sync with
// the initial state in src/hooks/useTheme.ts: stored choice first, then the OS.
(function () {
  var theme;
  try {
    theme = localStorage.getItem('theme');
  } catch (e) {
    // localStorage unavailable (private browsing with strict settings)
  }
  if (theme !== 'dark' && theme !== 'light') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
