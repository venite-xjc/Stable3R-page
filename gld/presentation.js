"use strict";
// Scroll-position navigation and user-triggered citation copy. No motion loop.
(() => {
  const links = Array.from(document.querySelectorAll('#section-nav a'));
  const setActive = id => {
    if (id === 'top') id = 'overview';
    for (const link of links) {
      if (link.hash === '#' + id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  };
  for (const link of links) link.addEventListener('click', () => setActive(link.hash.slice(1)));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting);
      if (visible.length) setActive(visible[visible.length - 1].target.id);
    }, {rootMargin: '-12% 0px -58% 0px'});
    for (const link of links) observer.observe(document.getElementById(link.hash.slice(1)));
    observer.observe(document.getElementById('top'));
  }
  const copy = document.getElementById('copy-citation');
  const text = document.getElementById('bibtex-text');
  const status = document.getElementById('copy-status');
  copy.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard) throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text.textContent);
      copy.textContent = 'Copied';
      status.textContent = 'BibTeX copied to clipboard.';
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(text);
      selection.removeAllRanges();
      selection.addRange(range);
      text.closest('pre').focus();
      copy.textContent = 'Text selected';
      status.textContent = 'Press Command+C or Control+C to copy the selected citation.';
    }
  });
})();
