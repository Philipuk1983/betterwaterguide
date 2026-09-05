// Better Water Guide library.
/* This site's library controls. Article and affiliate behavior remains site-local. */
(() => {
  const library = document.querySelector('[data-library]');
  if (!library) return;
  const filter = document.querySelector('[data-library-filter]');
  const search = filter.querySelector('input[type="search"]');
  const sort = filter.querySelector('select');
  const count = filter.querySelector('[role="status"]');
  const empty = document.querySelector('[data-library-empty]');
  const items = Array.from(library.querySelectorAll('[data-library-item]'));
  const normalize = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const update = () => {
    const terms = normalize(search.value).trim().split(/\s+/).filter(Boolean);
    let visible = 0;
    items.forEach(item => {
      const text = normalize(item.textContent);
      item.hidden = !terms.every(term => text.includes(term));
      if (!item.hidden) visible++;
    });
    count.textContent = `${visible} of ${items.length} articles shown`;
    empty.hidden = visible !== 0;
  };
  search.addEventListener('input', update);
  sort.addEventListener('change', () => {
    const ordered = [...items].sort((a, b) => sort.value === 'title'
      ? a.dataset.title.localeCompare(b.dataset.title)
      : Number(b.dataset.date) - Number(a.dataset.date) || a.dataset.title.localeCompare(b.dataset.title));
    ordered.forEach(item => library.append(item));
  });
  filter.hidden = false;
  update();
})();
