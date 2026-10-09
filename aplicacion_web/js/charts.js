/* ESTADÍSTICAS / GRÁFICOS
   Reportes consultados por report-data.js. No se escribe información.
   SVG y barras CSS reutilizan el diseño existente. */
(async () => {
  // Cambiar a true para volver a mostrar esta gráfica; no hay control en la interfaz.
  const SHOW_RESOLUTION_CHART = false;
  document.querySelector('#card-resolution').hidden = !SHOW_RESOLUTION_CHART;
  await window.RIETI_READY;
  const records = Object.values(window.RIETI_REPORTS || {});
  const form = document.querySelector('#chart-filters');
  if (!form) return;
  const controls = Object.fromEntries(['municipality', 'work-type', 'start-date', 'end-date'].map(key => [key, form.querySelector(`[data-filter="${key}"]`)]));
  const dialog = document.querySelector('#chart-summary');
  const buttons = Array.from(document.querySelectorAll('[data-chart]'));
  const colors = [...window.RIETI_DONUT_COLORS];
  const statusLabel = report => window.RIETI_STATISTICS.clean(report.status) || 'Sin especificar';
  const statuses = [...new Set(records.map(statusLabel))];
  while (colors.length < statuses.length) colors.push('#858e9a');
  let summaries = {};
  let returnFocusTo;
  // Toda etiqueta futura se escapa antes de entrar en SVG/HTML; los resúmenes usan textContent.
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const isoDate = report => report.date;
  const percentage = (count, total) => total ? (count * 100 / total).toLocaleString('es-MX', { maximumFractionDigits: 1 }) + '%' : '0%';
  const svg = (width, height, contents) => `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" focusable="false">${contents}</svg>`;
  const text = (x, y, value, anchor = 'middle') => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="inherit" font-size="12" fill="#12344d">${escape(value)}</text>`;
  const legend = items => `<span class="chart-legend-list">${items.map(([label, color]) => `<span><span class="chart-legend-swatch" style="background:${color}"></span>${escape(label)}</span>`).join('')}</span>`;
  const empty = '<span class="chart-empty">No hay reportes para los filtros seleccionados.</span>';
  const setChart = (id, markup) => { document.querySelector(`#chart-${id}`).innerHTML = markup; };

  // Dibuja una distribución circular proporcional, manteniendo los estados sin casos en la leyenda.
  function renderStatus(selected) {
    const counts = statuses.map(status => selected.filter(report => statusLabel(report) === status).length);
    const total = selected.length;
    setChart('status', legend(statuses.map((label, i) => [label, colors[i]])) + (total ? window.RIETI_DRAW_DONUT(statuses, counts) : empty));
    const max = Math.max(...counts);
    const leaders = statuses.filter((_, i) => counts[i] === max).join(', ');
    summaries.status = { title: 'Distribución por estatus', description: total ? `Se muestran ${total} reportes. La mayor concentración corresponde a ${leaders}, con ${max} reporte(s) por estado. Cada segmento representa su proporción del total.` : 'No hay reportes que coincidan con los filtros.', values: statuses.map((status, i) => [status, `${counts[i]} (${percentage(counts[i], total)})`]) };
  }

  // Ejes compartidos: escala entera, líneas guía y etiqueta de unidades.
  function axes(max) {
    const step = Math.max(1, Math.ceil(max / 5));
    const top = Math.max(step, Math.ceil(max / step) * step);
    let markup = text(55, 16, 'Reportes', 'start');
    for (let value = 0; value <= top; value += step) {
      const y = 270 - value / top * 230;
      markup += `<path d="M55 ${y}H850" stroke="#dce1e7"/>` + text(43, y + 4, value, 'end');
    }
    return { top, markup };
  }

  const stats = window.RIETI_STATISTICS;
  const grouping = document.querySelector('#trend-grouping');
  const yearControl = document.querySelector('#trend-year');
  const monthControl = document.querySelector('#trend-month');
  const weekControl = document.querySelector('#trend-week');
  const fullDate = new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
  const shortDate = new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', day: 'numeric', month: 'short' });
  const monthDate = new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', month: 'short' });
  const dates = records.flatMap(r => [stats.date(r.date) || stats.registered(r), stats.resolved(r) ? stats.date(r.resolvedAt) : null]).filter(Boolean).map(d => d.toISOString().slice(0, 10)).sort();
  const latestDate = dates.at(-1) || new Date().toISOString().slice(0, 10);
  const years = [...new Set([...dates.map(day => day.slice(0, 4)), String(new Date().getFullYear()), latestDate.slice(0, 4)])].sort();
  years.forEach(year => yearControl.add(new Option(year, year)));
  yearControl.value = latestDate.slice(0, 4);
  Array.from({ length: 12 }, (_, i) => monthControl.add(new Option(new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', month: 'long' }).format(new Date(Date.UTC(2000, i, 1))), String(i + 1))));
  monthControl.value = String(Number(latestDate.slice(5, 7)));

  function updateWeeks(preferredDay) {
    const previous = weekControl.value;
    const first = new Date(Date.UTC(Number(yearControl.value), Number(monthControl.value) - 1, 1));
    const last = new Date(Date.UTC(Number(yearControl.value), Number(monthControl.value), 0));
    const cursor = new Date(+first);
    cursor.setUTCDate(cursor.getUTCDate() - (cursor.getUTCDay() + 6) % 7);
    weekControl.replaceChildren();
    while (cursor <= last) {
      const end = new Date(+cursor + 6 * 86400000);
      const key = cursor.toISOString().slice(0, 10);
      weekControl.add(new Option(`${shortDate.format(cursor)} – ${shortDate.format(end)}`, key));
      if (preferredDay && key <= preferredDay && preferredDay <= end.toISOString().slice(0, 10)) weekControl.value = key;
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }
    if (!preferredDay && Array.from(weekControl.options).some(option => option.value === previous)) weekControl.value = previous;
  }
  updateWeeks(latestDate);

  const duration = hours => hours === null ? 'Sin datos' : `${(hours >= 24 ? hours / 24 : hours).toLocaleString('es-MX', { maximumFractionDigits: 4 })} ${hours >= 24 ? (hours === 24 ? 'día' : 'días') : (hours === 1 ? 'hora' : 'horas')}`;

  function horizontal(groups, color, format = value => `${value} reporte(s)`) {
    const max = Math.max(1, ...groups.map(([, value]) => value || 0));
    return '<span class="horizontal-bars">' + groups.map(([label, value]) => `<span class="horizontal-bar" title="${escape(label + ': ' + format(value))}"><span class="horizontal-bar__label">${escape(label)}</span><span class="horizontal-bar__track"><span style="width:${(value || 0) / max * 100}%;background:${color(label)}"></span></span><span class="horizontal-bar__value">${escape(format(value))}</span></span>`).join('') + '</span>';
  }

  function renderAdditional(selected) {
    const categories = stats.counts(selected, 'workType');
    setChart('category', selected.length ? horizontal(categories, () => '#285b7b') : empty);
    summaries.category = { title: 'Reportes por categoría', description: 'Categorías obtenidas de los tipos de trabajo de los reportes consultados.', values: categories.map(([label, value]) => [label, `${value} reporte(s)`]) };
    const groups = stats.priorities.map(priority => [priority, selected.filter(r => r.priority === priority).length]);
    const step = Math.max(1, Math.ceil(Math.max(1, ...groups.map(([, count]) => count)) / 4));
    const top = Math.ceil(Math.max(1, ...groups.map(([, count]) => count)) / step) * step;
    let markup = text(40, 18, 'Reportes', 'start');
    for (let value = 0; value <= top; value += step) {
      const y = 235 - value / top * 190;
      markup += `<path d="M40 ${y}H465" stroke="#dce1e7"/>` + text(30, y + 4, value, 'end');
    }
    const bars = groups.map(([priority, count], i) => {
      const x = 95 + i * 105, height = count / top * 190;
      return `<g><title>${escape(priority)}: ${count} reporte(s)</title><rect x="${x - 22}" y="${235 - height}" width="44" height="${height}" fill="${stats.colors[priority]}"/>${text(x, 223 - height, count)}${text(x, 265, priority)}</g>`;
    }).join('');
    const unclassified = selected.length - groups.reduce((total, [, count]) => total + count, 0);
    setChart('priority', (selected.length ? svg(480, 285, markup + bars) : empty) + (unclassified ? `<span class="chart-footnote">${unclassified} reporte(s) sin prioridad reconocida.</span>` : ''));
    summaries.priority = { title: 'Reportes por prioridad', description: `Orden de menor a mayor: Baja, Media, Alta y Urgente. ${unclassified} reporte(s) sin prioridad reconocida.`, values: groups.map(([label, count]) => [label, `${count} reporte(s)`]) };
    const municipalities = stats.counts(selected, 'municipality');
    setChart('municipality', selected.length ? horizontal(municipalities.slice(0, 10), () => '#285b7b') + `<span class="chart-footnote">Se muestran ${Math.min(10, municipalities.length)} de ${municipalities.length} municipios.</span>` : empty);
    summaries.municipality = { title: 'Reportes por municipio', description: 'Cada barra muestra el total de reportes registrados en un municipio. La gráfica muestra los diez municipios principales, ordenados de mayor a menor; este resumen incluye todos.', values: municipalities.map(([label, count]) => [label, `${count} reporte(s)`]) };
    if (SHOW_RESOLUTION_CHART) {
    const averages = stats.averages(selected);
    setChart('resolution', horizontal(averages.map(r => [r.priority, r.hours]), label => stats.colors[label], duration) + '<span class="chart-footnote">Sin datos significa que no hay resoluciones con fechas válidas para calcular el promedio. La API actual no entrega fecha de resolución.</span>');
    summaries.resolution = { title: 'Tiempo promedio de resolución por prioridad', description: 'Promedio de fecha de resolución menos fecha de registro. Solo incluye resueltos con fechas válidas y duración no negativa; la longitud de las barras se compara en horas; no se sustituye la resolución por la fecha de registro o actualización.', values: averages.map(r => [r.priority, `${duration(r.hours)} · ${r.count} reporte(s) válidos`]) };
    }
  }

  function renderTrend(selected) {
    const unit = grouping.value;
    document.querySelector('#trend-month-field').hidden = unit === 'month';
    document.querySelector('#trend-week-field').hidden = unit !== 'day';
    const groups = stats.trend(selected, unit, { year: yearControl.value, month: monthControl.value, weekStart: weekControl.value });
    const validResolution = r => {
      const start = stats.date(r.date) || stats.registered(r), end = stats.date(r.resolvedAt);
      return stats.resolved(r) && start && end && end >= start;
    };
    const withDates = selected.some(validResolution);
    const missing = selected.filter(r => stats.resolved(r) && !validResolution(r)).length;
    const labels = { day: 'día (lunes a domingo)', week: 'cuatro tramos del mes', month: 'mes (enero a diciembre)' };
    const noEvents = !groups.some(row => row.registered || row.resolved);
    const note = (noEvents ? 'No hay reportes para el período y los filtros seleccionados. ' : '')
      + 'Los períodos sin reportes se muestran sin puntos; la línea une únicamente períodos con reportes. '
      + (unit === 'week' ? 'El cuarto tramo incluye del día 22 al último día del mes. ' : '')
      + (!withDates ? 'Resoluciones: sin datos de fecha de resolución.' : `${missing} reporte(s) resueltos sin fecha válida, excluidos de la línea de resoluciones.`);
    const { top, markup } = axes(Math.max(1, ...groups.flatMap(r => [r.registered, r.resolved])));
    const x = i => 65 + i * 770 / Math.max(1, groups.length - 1);
    const axisLabel = (row, i) => unit === 'month' ? monthDate.format(stats.date(row.date)) : unit === 'week' ? `Semana ${i + 1}` : shortDate.format(stats.date(row.date));
    const periodLabel = row => row.endDate ? `${fullDate.format(stats.date(row.date))} al ${fullDate.format(stats.date(row.endDate))}` : fullDate.format(stats.date(row.date));
    let drawing = markup;
    const displayedYears = [...new Set(groups.map(row => row.date.slice(0, 4)))];
    drawing += text(850, 16, displayedYears.join(' – '), 'end');
    [['registered', '#287cbb', 'Registrados'], ...(withDates ? [['resolved', '#27834d', 'Resueltos']] : [])].forEach(([key, color, label]) => {
      const points = groups.flatMap((row, i) => row[key] > 0 ? [{ row, x: x(i), y: 270 - row[key] / top * 230 }] : []);
      if (points.length > 1) drawing += `<polyline data-series="${key}" points="${points.map(p => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5"/>`;
      drawing += points.map(p => `<circle data-series="${key}" cx="${p.x}" cy="${p.y}" r="5" fill="${color}"><title>${escape(periodLabel(p.row))} · ${label}: ${p.row[key]} reporte(s)</title></circle>`).join('');
    });
    drawing += groups.map((row, i) => {
      const anchor = i === 0 ? 'start' : i === groups.length - 1 ? 'end' : 'middle';
      let label = text(x(i), 298, axisLabel(row, i), anchor);
      if (unit === 'week') label += text(x(i), 323, `${Number(row.date.slice(8))}–${Number(row.endDate.slice(8))} ${monthDate.format(stats.date(row.date))}`, anchor);
      return label;
    }).join('');
    setChart('trend', legend([['Registrados', '#287cbb'], ['Resueltos' + (!withDates ? ' (sin datos)' : ''), '#27834d']]) + svg(900, 345, drawing) + `<span class="chart-footnote">${escape(note)}</span>`);
    summaries.trend = { title: 'Tendencia de reportes', description: `Agrupación por ${labels[unit]}. Registros por fecha de registro y resoluciones por fecha de resolución. ${note}`, values: groups.map(row => [row.endDate ? `${row.date} al ${row.endDate}` : row.date, `${row.registered ? row.registered + ' registrados' : 'sin registros'} · ${withDates ? (row.resolved ? row.resolved + ' resueltos' : 'sin resoluciones') : 'resueltos: Sin datos'}`]) };
  }

  function render() {
    if (window.RIETI_API_ERROR) return;
    const filters = Object.fromEntries(Object.entries(controls).map(([key, input]) => [key, input.value]));
    const invalidRange = filters['start-date'] && filters['end-date'] && filters['start-date'] > filters['end-date'];
    controls['end-date'].setCustomValidity(invalidRange ? 'La fecha fin debe ser igual o posterior a la fecha inicio.' : '');
    if (!form.reportValidity()) return;
    const selected = records.filter(report => (!filters.municipality || report.municipality === filters.municipality)
      && (!filters['work-type'] || report.workTypeId === filters['work-type'])
      && (!filters['start-date'] || isoDate(report) >= filters['start-date'])
      && (!filters['end-date'] || (isoDate(report) && isoDate(report) <= filters['end-date'])));
    const active = Object.values(filters).some(Boolean);
    document.querySelector('#chart-feedback').textContent = `${selected.length} de ${records.length} reportes consultados · ${active ? 'Filtros aplicados' : 'Sin filtros'}`;
    renderStatus(selected);
    renderTrend(selected);
    renderAdditional(selected);
    // El contexto queda guardado con el resumen aplicado, no con cambios de formulario inválidos.
    const scope = Object.values(filters).filter(Boolean).join(' · ');
    const workType = window.RIETI_WORK_TYPES.find(type => type.id === filters['work-type']);
    Object.values(summaries).forEach(summary => {
      summary.description += active ? ` Filtros: ${workType ? scope.replace(filters['work-type'], workType.label) : scope}.` : ' Sin filtros aplicados.';
    });
  }

  grouping.addEventListener('change', render);
  [yearControl, monthControl].forEach(control => control.addEventListener('change', () => { updateWeeks(); render(); }));
  weekControl.addEventListener('change', render);
  form.addEventListener('submit', event => { event.preventDefault(); render(); });
  form.addEventListener('change', render);
  document.querySelector('#clear-chart-filters').addEventListener('click', () => { form.reset(); render(); });
  buttons.forEach(button => button.addEventListener('click', () => {
    const summary = summaries[button.dataset.chart];
    document.querySelector('#chart-summary-title').textContent = summary.title;
    document.querySelector('#chart-summary-text').textContent = summary.description;
    const values = document.querySelector('#chart-summary-values');
    values.replaceChildren();
    summary.values.forEach(([label, value]) => {
      const term = document.createElement('dt'), description = document.createElement('dd');
      term.textContent = label;
      description.textContent = value;
      values.append(term, description);
    });
    returnFocusTo = button;
    dialog.showModal();
  }));
  document.querySelector('#close-chart-summary').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => returnFocusTo?.focus());
  // Escape y confinamiento del foco provienen del elemento dialog nativo.
  if (window.RIETI_API_ERROR) {
    ['status', 'municipality', 'trend', 'category', 'priority', 'resolution'].forEach(id => setChart(id, '<span class="chart-empty">Datos no disponibles.</span>'));
    buttons.forEach(button => { button.disabled = true; });
    document.querySelector('#chart-feedback').textContent = 'Datos no disponibles.';
    return;
  }
  render();
})();
