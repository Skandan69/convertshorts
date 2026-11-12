// Explore page: category filter + search over the static template cards.
// Without this script every card stays visible, so the page works with JS disabled.
(() => {
  const grid = document.getElementById('template-grid');
  if (!grid) return;
  const cards = [...grid.querySelectorAll('.tpl')];
  const chips = [...document.querySelectorAll('.explore-chips .chip')];
  const search = document.getElementById('template-search');
  const empty = document.getElementById('template-empty');
  const valid = new Set(chips.map(c => c.dataset.filter));
  const fromHash = () => { const h = location.hash.slice(1); return valid.has(h) ? h : 'all'; };
  let filter = fromHash();

  function apply() {
    const words = search.value.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const card of cards) {
      const ok = (filter === 'all' || card.dataset.category === filter) &&
        words.every(w => card.dataset.search.includes(w));
      card.hidden = !ok;
      if (ok) shown++;
    }
    chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.filter === filter)));
    empty.hidden = shown > 0;
  }

  chips.forEach(chip => chip.addEventListener('click', () => {
    filter = chip.dataset.filter;
    history.replaceState(null, '', filter === 'all' ? location.pathname : '#' + filter);
    apply();
  }));
  search.addEventListener('input', apply);
  window.addEventListener('hashchange', () => { filter = fromHash(); apply(); });

  // Play sample videos (once added) only while hovered or focused.
  grid.addEventListener('pointerover', e => e.target.closest('.tpl')?.querySelector('video')?.play().catch(() => {}));
  grid.addEventListener('pointerout', e => e.target.closest('.tpl')?.querySelector('video')?.pause());
  apply();
})();
