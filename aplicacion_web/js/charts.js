/* ESTADÍSTICAS / GRÁFICOS
   Datos de muestra compartidos con los reportes. No se hacen peticiones ni se guarda información.
   INTEGRACIÓN FUTURA: reemplazar RIETI_REPORTS por una respuesta autorizada de la API.
   SVG dibuja únicamente gráficas de datos; el mapa es un esquema GPS, no cartografía oficial. */
(() => {
  const records = Object.values(window.RIETI_REPORTS || {});
  const form = document.querySelector('#chart-filters');
  if (!form) return;
  const controls = Object.fromEntries(['municipality', 'work-type', 'start-date', 'end-date'].map(key => [key, form.querySelector(`[data-filter="${key}"]`)]));
  const dialog = document.querySelector('#chart-summary');
  const buttons = Array.from(document.querySelectorAll('[data-chart]'));
  const colors = ['#dce0e5', '#bfc6ce', '#9ea6b0', '#68717d', '#454d57'];
  const statuses = ['Recibido', 'Pendiente', 'En proceso', 'Resuelto', 'Cancelado'];
  const abbreviations = { 'Naucalpan de Juárez': 'NAU', 'Tlalnepantla de Baz': 'TLA', 'Coacalco': 'COA', 'Villa del Carbón': 'VDC', 'Huixquilucan': 'HUI', 'Tultitlán': 'TUL', 'Atizapán de Zaragoza': 'ATZ', 'Cuautitlán Izcalli': 'CIZ' };
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  let summaries = {};
  let returnFocusTo;
  // Toda etiqueta futura se escapa antes de entrar en SVG/HTML; los resúmenes usan textContent.
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const isoDate = report => report.reportedAt.slice(0, 10).split('/').reverse().join('-');
  const percentage = (count, total) => total ? (count * 100 / total).toLocaleString('es-MX', { maximumFractionDigits: 1 }) + '%' : '0%';
  const svg = (width, height, contents) => `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" focusable="false">${contents}</svg>`;
  const text = (x, y, value, anchor = 'middle') => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Arial, sans-serif" font-size="12" fill="#68717d">${escape(value)}</text>`;
  const legend = items => `<span class="chart-legend-list">${items.map(([label, color]) => `<span><span class="chart-legend-swatch" style="background:${color}"></span>${escape(label)}</span>`).join('')}</span>`;
  const empty = '<span class="chart-empty">No hay reportes para los filtros seleccionados.</span>';
  const setChart = (id, markup) => { document.querySelector(`#chart-${id}`).innerHTML = markup; };

  // Dibuja una distribución circular proporcional, manteniendo los estados sin casos en la leyenda.
  function renderStatus(selected) {
    const counts = statuses.map(status => selected.filter(report => report.status === status).length);
    const total = selected.length;
    let offset = 0;
    const segments = counts.map((count, index) => {
      const length = total ? count / total * 100 : 0;
      const segment = count ? `<circle cx="180" cy="150" r="90" fill="none" stroke="${colors[index]}" stroke-width="80" pathLength="100" stroke-dasharray="${length} ${100 - length}" stroke-dashoffset="${-offset}" transform="rotate(-90 180 150)" />` : '';
      offset += length;
      return segment;
    }).join('');
    setChart('status', legend(statuses.map((label, i) => [label, colors[i]])) + (total ? svg(360, 300, segments + text(180, 147, total) + text(180, 166, 'reportes')) : empty));
    const max = Math.max(...counts);
    const leaders = statuses.filter((_, i) => counts[i] === max).join(', ');
    summaries.status = { title: 'Distribución por estatus', description: total ? `Se muestran ${total} reportes. La mayor concentración corresponde a ${leaders}, con ${max} reporte(s) por estado. Cada segmento representa su proporción del total.` : 'No hay reportes que coincidan con los filtros.', values: statuses.map((status, i) => [status, `${counts[i]} (${percentage(counts[i], total)})`]) };
  }

  function municipalityCounts(selected) {
    const counts = new Map();
    selected.forEach(report => counts.set(report.municipality, (counts.get(report.municipality) || 0) + 1));
    return Array.from(counts).sort((a, b) => a[0].localeCompare(b[0], 'es'));
  }

  // Esquema de concentración sobre coordenadas ficticias, con escala fija al filtrar.
  // INTEGRACIÓN FUTURA: usar polígonos municipales y un proveedor cartográfico aprobado.
  function renderHeat(selected) {
    const groups = municipalityCounts(selected);
    const max = Math.max(1, ...groups.map(([, count]) => count));
    const allLat = records.map(r => Number(r.latitude));
    const allLng = records.map(r => Number(r.longitude));
    const minLat = Math.min(...allLat), maxLat = Math.max(...allLat);
    const minLng = Math.min(...allLng), maxLng = Math.max(...allLng);
    const points = groups.map(([name, count]) => {
      const record = selected.find(r => r.municipality === name);
      const x = 55 + (Number(record.longitude) - minLng) / (maxLng - minLng || 1) * 300;
      const y = 255 - (Number(record.latitude) - minLat) / (maxLat - minLat || 1) * 205;
      return `<circle cx="${x}" cy="${y}" r="${12 + count / max * 12}" fill="#68717d" opacity="${0.18 + count / max * 0.6}" />` + text(x, y + 4, abbreviations[name] || name.slice(0, 3));
    }).join('');
    const grid = [60, 110, 160, 210, 260].map(y => `<path d="M25 ${y}H385" stroke="#eef0f4"/>`).join('');
    setChart('heat', legend([['Más casos', '#68717d'], ['Menos casos', '#dce0e5']]) + (selected.length ? svg(410, 300, grid + text(380, 25, 'N ↑') + points) : empty));
    const leaders = groups.filter(([, count]) => count === max).map(([name]) => name).join(', ');
    summaries.heat = { title: 'Mapa de calor', description: selected.length ? `Los ${selected.length} reportes se concentran en ${groups.length} municipio(s). Mayor concentración: ${leaders}, con ${max} reporte(s) por municipio. La intensidad y el tamaño indican la cantidad. Es un esquema de coordenadas ficticias, no un mapa oficial ni una medición de riesgo.` : 'No hay ubicaciones que mostrar con estos filtros.', values: groups.map(([name, count]) => [name, `${count} reporte(s)`]) };
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

  function renderMunicipality(selected) {
    const groups = municipalityCounts(selected);
    const { top, markup } = axes(Math.max(1, ...groups.map(([, count]) => count)));
    const width = 780 / (groups.length || 1);
    const bars = groups.map(([name, count], i) => {
      const x = 65 + width * (i + 0.5);
      const height = count / top * 230;
      return `<rect x="${x - 9}" y="${270 - height}" width="18" height="${height}" fill="#bfc6ce"/>` + text(x, 258 - height, count) + text(x, 298, abbreviations[name] || name);
    }).join('');
    setChart('municipality', selected.length ? svg(900, 325, markup + bars) : empty);
    summaries.municipality = { title: 'Reportes por municipio', description: `Comparación de ${selected.length} reportes entre ${groups.length} municipios. Cada barra representa el total registrado en el municipio, sin normalizar por población.`, values: groups.map(([name, count]) => [name, `${count} reporte(s) (${percentage(count, selected.length)})`]) };
  }

  function renderTrend(selected) {
    if (!selected.length) {
      setChart('trend', empty);
      summaries.trend = { title: 'Tendencia mensual de reportes', description: 'No hay reportes para calcular una tendencia con estos filtros.', values: [] };
      return;
    }
    // Se incluyen los meses sin registros; cero significa ausencia en la muestra, no dato real.
    const years = selected.map(r => Number(isoDate(r).slice(0, 4)));
    const groups = [];
    for (let year = Math.min(...years); year <= Math.max(...years); year++) {
      months.forEach((month, i) => {
        const key = `${year}-${String(i + 1).padStart(2, '0')}`;
        groups.push([`${month} ${year}`, selected.filter(r => isoDate(r).startsWith(key)).length]);
      });
    }
    const peak = Math.max(...groups.map(([, count]) => count));
    const { top, markup } = axes(peak);
    const points = groups.map(([, count], i) => [65 + i * 770 / Math.max(1, groups.length - 1), 270 - count / top * 230]);
    const labels = groups.map(([label, count], i) => text(points[i][0], 298, groups.length === 12 ? label.slice(0, 3) : label) + `<circle cx="${points[i][0]}" cy="${points[i][1]}" r="4" fill="#68717d"/>`).join('');
    setChart('trend', svg(900, 330, markup + `<polyline points="${points.map(p => p.join(',')).join(' ')}" fill="none" stroke="#858e9a" stroke-width="2.5"/>` + labels + text(450, 325, [...new Set(years)].sort().join(' · '))));
    const peaks = groups.filter(([, count]) => count === peak).map(([label]) => label).join(', ');
    summaries.trend = { title: 'Tendencia mensual de reportes', description: `Se agrupan ${selected.length} reportes por mes de registro. El máximo es ${peak} en ${peaks}. Los meses con cero no contienen reportes dentro de esta muestra y de los filtros aplicados; no representan estadísticas reales.`, values: groups.map(([label, count]) => [label, `${count} reporte(s)`]) };
  }

  function render() {
    const filters = Object.fromEntries(Object.entries(controls).map(([key, input]) => [key, input.value]));
    const invalidRange = filters['start-date'] && filters['end-date'] && filters['start-date'] > filters['end-date'];
    controls['end-date'].setCustomValidity(invalidRange ? 'La fecha fin debe ser igual o posterior a la fecha inicio.' : '');
    if (!form.reportValidity()) return;
    const selected = records.filter(report => (!filters.municipality || report.municipality === filters.municipality)
      && (!filters['work-type'] || report.workTypeId === filters['work-type'])
      && (!filters['start-date'] || isoDate(report) >= filters['start-date'])
      && (!filters['end-date'] || isoDate(report) <= filters['end-date']));
    const active = Object.values(filters).some(Boolean);
    document.querySelector('#card-municipality').hidden = active;
    document.querySelector('#municipality-hidden-note').hidden = !active;
    document.querySelector('#chart-feedback').textContent = `${selected.length} de ${records.length} reportes de muestra · ${active ? 'Filtros aplicados' : 'Sin filtros'}`;
    renderStatus(selected);
    renderHeat(selected);
    renderMunicipality(selected);
    renderTrend(selected);
    // El contexto queda guardado con el resumen aplicado, no con cambios de formulario inválidos.
    const scope = Object.values(filters).filter(Boolean).join(' · ');
    const workType = window.RIETI_WORK_TYPES.find(type => type.id === filters['work-type']);
    Object.values(summaries).forEach(summary => {
      summary.description += active ? ` Filtros: ${workType ? scope.replace(filters['work-type'], workType.label) : scope}.` : ' Sin filtros aplicados.';
    });
  }

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
  render();
})();
