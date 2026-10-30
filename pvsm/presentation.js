"use strict";
// User-triggered navigation and citation copying only. No timers or animation.
(() => {
  const toc = document.getElementById('page-toc');
  toc.addEventListener('click', event => {
    if (event.target.closest('nav a')) toc.open = false;
  });
  document.addEventListener('click', event => {
    if (toc.open && !toc.contains(event.target)) toc.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toc.open) {
      toc.open = false;
      toc.querySelector('summary').focus();
    }
  });
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
