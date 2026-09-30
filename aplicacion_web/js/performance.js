/* RENDIMIENTO: filtro automático local y autocompletado accesible.
   INTEGRACIÓN FUTURA: sustituir la muestra por una consulta autorizada a la API.
   No se escriben datos ni se altera el catálogo de asignación de reportes. */
(() => {
  const input = document.querySelector('#municipality-search');
  if (!input) return;
  const authorities = window.RIETI_AUTHORITY_PERFORMANCE || [];
  const container = document.querySelector('#municipality-combobox');
  const suggestions = document.querySelector('#municipality-suggestions');
  const body = document.querySelector('#performance-rows');
  const feedback = document.querySelector('#performance-feedback');
  const metricNodes = Array.from(document.querySelectorAll('[data-performance-metric]'));
  let matches = authorities;
  let activeIndex = -1;
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim().replace(/\s+/g, ' ');
  const number = value => value.toLocaleString('es-MX', { maximumFractionDigits: 1 });
  const rate = (part, total) => total ? `${number(part / total * 100)}%` : '—';
  const sum = values => values.reduce((total, value) => total + value, 0);

  function stats(authority) {
    const finished = authority.resolutionDays.length;
    const total = authority.pending + authority.progress + finished;
    return { finished, total, days: sum(authority.resolutionDays) };
  }

  function closeSuggestions() {
    suggestions.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    activeIndex = -1;
    Array.from(suggestions.children).forEach(option => option.setAttribute('aria-selected', 'false'));
  }

  function choose(authority) {
    input.value = authority.municipality;
    update(false);
    input.focus();
    closeSuggestions();
  }

  function showSuggestions() {
    suggestions.replaceChildren();
    activeIndex = -1;
    input.removeAttribute('aria-activedescendant');
    matches.forEach(authority => {
      const option = document.createElement('li');
      option.id = `municipality-option-${authority.id}`;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      // textContent evita ejecutar texto recibido de una futura API como HTML.
      option.textContent = authority.municipality;
      option.addEventListener('pointerdown', event => event.preventDefault());
      option.addEventListener('click', () => choose(authority));
      suggestions.append(option);
    });
    suggestions.hidden = matches.length === 0;
    input.setAttribute('aria-expanded', String(matches.length > 0));
  }

  function renderResults() {
    body.replaceChildren();
    const totals = { assigned: 0, pending: 0, progress: 0, finished: 0, days: 0 };
    matches.forEach(authority => {
      const { total, finished, days } = stats(authority);
      totals.assigned += total;
      totals.pending += authority.pending;
      totals.progress += authority.progress;
      totals.finished += finished;
      totals.days += days;
      const row = document.createElement('tr');
      row.dataset.authorityId = authority.id;
      const values = [authority.authority, authority.municipality, total, authority.pending, authority.progress, finished, finished ? `${number(days / finished)} días` : '—', rate(finished, total)];
      values.forEach((value, index) => {
        const cell = document.createElement(index === 0 ? 'th' : 'td');
        if (index === 0) cell.setAttribute('scope', 'row');
        if (index < 2) cell.textContent = value;
        else {
          const badge = document.createElement('span');
          badge.className = 'performance-value';
          badge.textContent = value;
          cell.append(badge);
        }
        row.append(cell);
      });
      body.append(row);
    });
    if (!matches.length) {
      const row = document.createElement('tr'), cell = document.createElement('td');
      row.className = 'performance-empty';
      cell.colSpan = 8;
      cell.textContent = 'No se encontraron municipios. Prueba con otro nombre o limpia el filtro.';
      row.append(cell);
      body.append(row);
    }
    // Promedio ponderado por casos finalizados; no se promedian porcentajes de autoridades.
    const metrics = {
      average: totals.finished ? number(totals.days / totals.finished) : '—',
      resolution: rate(totals.finished, totals.assigned),
      progress: rate(totals.progress, totals.assigned),
      pending: rate(totals.pending, totals.assigned),
    };
    metricNodes.forEach(node => { node.textContent = metrics[node.dataset.performanceMetric]; });
    feedback.textContent = `${matches.length} de ${authorities.length} autoridades de muestra · ${totals.assigned} reportes asignados${input.value.trim() ? ` · Coincidencias con “${input.value.trim()}”` : ' · Todos los municipios'}`;
  }

  function update(show = true) {
    // Coincidencias parciales sin acentos: “nau”, “JUAREZ” o “villa carbon” funcionan.
    const tokens = normalize(input.value).split(' ').filter(Boolean);
    matches = authorities.filter(authority => tokens.every(token => normalize(authority.municipality).includes(token)));
    renderResults();
    if (show) showSuggestions();
    else closeSuggestions();
  }

  input.addEventListener('input', () => update());
  input.addEventListener('focus', showSuggestions);
  input.addEventListener('blur', closeSuggestions);
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') event.preventDefault();
      closeSuggestions();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!suggestions.hidden && matches.length) choose(matches[activeIndex >= 0 ? activeIndex : 0]);
      return;
    }
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    if (!matches.length) return;
    if (suggestions.hidden) showSuggestions();
    activeIndex = activeIndex < 0 ? (event.key === 'ArrowDown' ? 0 : matches.length - 1)
      : (activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length;
    Array.from(suggestions.children).forEach((option, index) => option.setAttribute('aria-selected', String(index === activeIndex)));
    const activeOption = suggestions.children[activeIndex];
    input.setAttribute('aria-activedescendant', activeOption.id);
    activeOption.scrollIntoView({ block: 'nearest' });
  });
  document.addEventListener('click', event => { if (!container.contains(event.target)) closeSuggestions(); });
  document.querySelector('#clear-municipality').addEventListener('click', () => {
    input.value = '';
    update(false);
    input.focus();
    closeSuggestions();
  });
  update(false);
})();
