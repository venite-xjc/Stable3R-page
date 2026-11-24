"use strict";
// Expanded selectors, scroll-position navigation, and citation copy. No motion loop.
(() => {
  // Keep the shared renderers and native-select fallback intact.
  const pickers = [
    ['cloud-scene', 'Point cloud scene', 'cloud-panels'],
    ['reconstruction-dataset', 'Reconstruction dataset', 'reconstruction-table'],
    ['pose-dataset', 'Camera pose dataset', 'pose-table']
  ];
  for (const [id, name, target] of pickers) {
    const select = document.getElementById(id);
    const label = select.closest('label');
    const group = document.createElement('div');
    group.className = 'choice-picker';
    group.dataset.choiceFor = id;
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', name);
    const heading = document.createElement('span');
    heading.className = 'choice-label';
    heading.textContent = id === 'cloud-scene' ? 'Scene' : 'Dataset';
    const options = document.createElement('div');
    options.className = 'choice-options';
    group.append(heading, options);
    function sync() {
      for (const button of options.children) {
        button.setAttribute('aria-pressed', String(button.dataset.choice === select.value));
      }
    }
    function render() {
      options.replaceChildren(...Array.from(select.options).filter(option => !option.hidden).map(option => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'choice-button';
        button.dataset.choice = option.value;
        button.textContent = option.label;
        button.disabled = select.disabled || option.disabled;
        button.setAttribute('aria-controls', target);
        button.addEventListener('click', () => {
          if (select.value === option.value) return;
          select.value = option.value;
          select.dispatchEvent(new Event('change', {bubbles: true}));
        });
        return button;
      }));
      sync();
    }
    render();
    select.addEventListener('change', sync);
    // Protocol switches replace the dataset options, so update the pills too.
    new MutationObserver(render).observe(select, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ['selected', 'disabled', 'hidden', 'label', 'value']
    });
    label.after(group);
    label.hidden = true;
  }

  const links = Array.from(document.querySelectorAll('#section-nav a'));
  const setActive = id => {
    if (id === 'top') id = 'abstract';
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
