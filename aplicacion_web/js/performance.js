/* Rendimiento de los reportes activos bajo la responsabilidad actual de cada municipio. */
(async () => {
  if (window.RIETI_AUTH_READY && !await window.RIETI_AUTH_READY) return;
  const input = document.querySelector('#municipality-search');
  const clear = document.querySelector('#clear-municipality');
  const suggestions = document.querySelector('#municipality-suggestions');
  const combobox = document.querySelector('#municipality-combobox');
  const body = document.querySelector('#performance-rows');
  const feedback = document.querySelector('#performance-feedback');
  const exportButton = document.querySelector('[data-action="download-performance"]');
  document.querySelector('[data-action="refresh-performance"]').addEventListener('click', () => location.reload());
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().split(/\s+/).filter(Boolean);
  const percentage = (count, total) => total ? (count / total * 100).toLocaleString('es-MX', { maximumFractionDigits: 1 }) + '%' : '—';
  const days = value => value === null ? 'No disponible'
    : value > 0 && value < 0.005 ? '<0.01 días'
      : value.toLocaleString('es-MX', { maximumFractionDigits: 2 }) + (value === 1 ? ' día' : ' días');
  let matches = [], selected = -1;
  const closeSuggestions = () => {
    suggestions.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    selected = -1;
  };
  function emptyRow(message) {
    const row = document.createElement('tr'), cell = document.createElement('td');
    row.className = 'performance-empty'; cell.colSpan = 8; cell.textContent = message;
    row.append(cell); body.replaceChildren(row);
  }
  try {
    await window.RIETI_PERFORMANCE_READY;
    if (window.RIETI_PERFORMANCE_ERROR) throw new Error(window.RIETI_PERFORMANCE_ERROR);
    const records = window.RIETI_AUTHORITY_PERFORMANCE;
    let visible = records;
    function render() {
      const terms = normalize(input.value);
      visible = records.filter(row => terms.every(term => normalize(row.municipality).join(' ').includes(term)));
      body.replaceChildren();
      for (const record of visible) {
        const row = document.createElement('tr');
        row.dataset.municipalityId = String(record.municipalityId);
        const values = [record.authority, record.municipality, record.total, record.pending, record.progress, record.resolved, days(record.averageDays), percentage(record.resolved, record.total)];
        values.forEach((value, index) => {
          const cell = document.createElement(index === 0 ? 'th' : 'td');
          if (index === 0) cell.scope = 'row';
          cell.textContent = String(value);
          if (index === 7 && record.total > 0) {
            const efficiency = record.resolved / record.total * 100;
            const indicator = document.createElement('span');
            indicator.className = 'performance-efficiency';
            indicator.dataset.band = efficiency < 25 ? 'red' : efficiency < 50 ? 'orange' : efficiency < 75 ? 'yellow' : 'green';
            indicator.textContent = String(value);
            cell.replaceChildren(indicator);
          }
          if (index === 6) cell.title = `Calculado con ${record.measuredResolved} de ${record.resolved} concluidos con fecha registrada.`;
          row.append(cell);
        });
        body.append(row);
      }
      if (!visible.length) emptyRow(records.length ? 'No hay municipios que coincidan con la búsqueda.' : 'No hay municipios con reportes activos.');
      const sum = key => visible.reduce((total, row) => total + row[key], 0);
      const total = sum('total');
      const measured = sum('measuredResolved');
      const values = { average: days(measured ? sum('resolutionSeconds') / measured / 86400 : null), resolution: percentage(sum('resolved'), total), progress: percentage(sum('progress'), total), pending: percentage(sum('pending'), total) };
      document.querySelectorAll('[data-performance-metric]').forEach(node => { node.textContent = values[node.dataset.performanceMetric]; });
      document.querySelector('[data-performance-average-note]').textContent = `${measured} de ${sum('resolved')} concluidos con fecha registrada`;
      const other = total - sum('pending') - sum('progress') - sum('resolved');
      feedback.textContent = `${visible.length} de ${records.length} municipios · ${total} reportes activos` + (other ? ` · ${other} en otros estados` : '');
      exportButton.disabled = visible.length === 0;
    }
    function choose(index) {
      input.value = matches[index].municipality;
      render(); closeSuggestions(); input.focus(); closeSuggestions();
    }
    function showSuggestions() {
      closeSuggestions(); suggestions.replaceChildren();
      if (!input.value.trim()) return;
      matches = visible;
      matches.forEach((row, index) => {
        const option = document.createElement('li');
        option.id = `performance-option-${index}`;
        option.setAttribute('role', 'option'); option.setAttribute('aria-selected', 'false');
        option.textContent = row.municipality;
        option.addEventListener('pointerdown', event => event.preventDefault());
        option.addEventListener('click', () => choose(index));
        suggestions.append(option);
      });
      suggestions.hidden = matches.length === 0;
      input.setAttribute('aria-expanded', String(matches.length > 0));
    }
    input.addEventListener('input', () => { render(); showSuggestions(); });
    input.addEventListener('focus', showSuggestions);
    input.addEventListener('blur', closeSuggestions);
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape' || event.key === 'Tab') { closeSuggestions(); return; }
      if (event.key === 'Enter') { event.preventDefault(); if (!suggestions.hidden && selected >= 0) choose(selected); return; }
      if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
      event.preventDefault();
      if (suggestions.hidden) showSuggestions();
      if (suggestions.hidden) return;
      selected = selected < 0 ? (event.key === 'ArrowDown' ? 0 : matches.length - 1)
        : (selected + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length;
      Array.from(suggestions.children).forEach((option, index) => option.setAttribute('aria-selected', String(index === selected)));
      const option = suggestions.children[selected];
      input.setAttribute('aria-activedescendant', option.id); option.scrollIntoView({ block: 'nearest' });
    });
    document.addEventListener('click', event => { if (!combobox.contains(event.target)) closeSuggestions(); });
    clear.addEventListener('click', () => { input.value = ''; render(); input.focus(); closeSuggestions(); });
    exportButton.addEventListener('click', () => {
      if (!visible.length) return;
      const quote = value => {
        let text = String(value);
        if (/^[\s\uFEFF]*[=+@-]/.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
      };
      const headings = ['Autoridad', 'Municipio', 'Total reportes', 'Registrados', 'En atención', 'Concluidos', 'Tiempo promedio (días)', 'Concluidos con fecha registrada', 'Eficiencia'];
      const rows = visible.map(row => [row.authority, row.municipality, row.total, row.pending, row.progress, row.resolved,
        row.averageDays === null ? 'No disponible' : row.averageDays, row.measuredResolved, percentage(row.resolved, row.total)]);
      const url = URL.createObjectURL(new Blob(['\uFEFF' + [headings, ...rows].map(row => row.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a'); link.href = url;
      link.download = 'rendimiento_rieti.csv'; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    input.disabled = clear.disabled = records.length === 0;
    render();
  } catch (error) {
    input.disabled = clear.disabled = exportButton.disabled = true;
    closeSuggestions();
    feedback.textContent = error.message;
    emptyRow('Rendimiento no disponible. Usa Actualizar para reintentar.');
    document.querySelectorAll('[data-performance-metric]').forEach(node => { node.textContent = 'No disponible'; });
    document.querySelector('[data-performance-average-note]').textContent = 'No fue posible consultar las fechas de resolución';
  } finally {
    document.body.removeAttribute('data-report-loading');
    document.querySelector('main').setAttribute('aria-busy', 'false');
    document.querySelectorAll('[data-load-block]').forEach(block => { block.removeAttribute('inert'); block.setAttribute('aria-busy', 'false'); });
  }
})();
