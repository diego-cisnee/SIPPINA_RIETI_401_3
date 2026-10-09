/* Fuente única de lectura. Nunca conserva muestras ni envía modificaciones. */
window.RIETI_REPORTS = Object.create(null);
window.RIETI_WORK_TYPES = [];
window.RIETI_API_ERROR = null;
// Equivalencias de resumen; las tablas conservan literalmente el estatus almacenado.
window.RIETI_STATUS_GROUPS = { pending: ['Recibido', 'Pendiente', 'Registrado'], progress: ['En proceso', 'En revision', 'En revisión', 'Canalizado'], resolved: ['Resuelto', 'Concluido'] };
window.RIETI_READY = (async () => {
  const unavailable = 'No disponible';
  const value = v => v === null || v === undefined || v === '' ? unavailable : String(v);
  const statusClasses = { Recibido: 'received', Pendiente: 'pending', 'En proceso': 'progress', Resuelto: 'resolved', Cancelado: 'cancelled', Registrado: 'received', 'En revision': 'progress', 'En revisión': 'progress', Canalizado: 'progress', Concluido: 'resolved' };
  const context = document.querySelector('[data-report-context]');
  const id = new URLSearchParams(location.search).get('id');
  const apiBase = (window.RIETI_API_BASE || (location.port === '3000' && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) ? location.origin : 'http://127.0.0.1:3000')).replace(/\/$/, '');
  const apiURL = apiBase + '/api/reportes' + (context ? '/' + encodeURIComponent(id) : '');
  const feedback = document.createElement('p');
  feedback.className = 'demo-caption';
  feedback.setAttribute('role', 'status');
  feedback.textContent = 'Cargando reportes…';
  document.querySelector('main')?.prepend(feedback);
  document.querySelectorAll('[data-action="refresh-reports"]').forEach(button => button.addEventListener('click', event => { event.preventDefault(); location.reload(); }));
  try {
    if (context && (!id || !/^[1-9]\d*$/.test(id))) throw new Error('Identificador de reporte inválido.');
    const response = await fetch(apiURL, { method: 'GET', signal: AbortSignal.timeout(15000), cache: 'no-store' });
    if (!response.ok) throw new Error(response.status === 404 ? 'Reporte no encontrado.' : 'No fue posible consultar los reportes.');
    const payload = await response.json();
    const records = context ? [payload.data] : payload.data;
    if (!Array.isArray(records)) throw new Error('Respuesta de API inválida.');
    for (const raw of records) {
      const report = Object.fromEntries(Object.entries(raw).map(([key, v]) => [key, value(v)]));
      report.id = String(raw.id_reporte);
      report.date = raw.date || '';
      window.RIETI_REPORTS[report.id] = report;
    }
    window.RIETI_WORK_TYPES = [...new Set(records.map(r => r.workType).filter(Boolean))].map(label => ({ id: label, label }));
    document.querySelectorAll('[data-filter]').forEach(select => {
      if (select.tagName !== 'SELECT') return;
      const key = { municipality: 'municipality', status: 'status', priority: 'priority', 'work-type': 'workTypeId' }[select.dataset.filter];
      if (!key) return;
      const first = select.options[0].cloneNode(true);
      select.replaceChildren(first);
      [...new Set(records.map(r => r[key]).filter(v => v !== null && v !== undefined && v !== ''))].sort().forEach(v => select.add(new Option(v, v)));
    });
    // Object.values reordena claves numéricas; conservar el orden de la API.
    const reports = records.map(raw => window.RIETI_REPORTS[String(raw.id_reporte)]);
    const tbody = document.querySelector('tbody[data-list]');
    if (tbody && !document.querySelector('#performance-rows')) {
      const statistics = document.body.classList.contains('statistics-page');
      const management = document.body.classList.contains('reports-management-page');
      const fields = statistics ? ['id', 'workType', 'observations', 'municipality', 'authority', 'status', 'priority', 'reportedAt', 'reporter'] : management ? ['id', 'reporter', 'municipality', 'status', 'priority', 'reportedAt'] : ['id', 'municipality', 'status', 'reportedAt'];
      const labels = statistics ? ['Folio', 'Tipo de trabajo', 'Observaciones', 'Municipio', 'Autoridad', 'Estatus', 'Prioridad', 'Fecha', 'Denunciante'] : management ? ['Folio', 'Denunciante', 'Municipio', 'Estatus', 'Prioridad', 'Fecha'] : ['Folio', 'Municipio', 'Estado', 'Fecha'];
      tbody.replaceChildren();
      (management || statistics ? reports : reports.slice(0, 5)).forEach(report => {
        const row = document.createElement('tr');
        row.tabIndex = 0;
        row.setAttribute('role', 'link');
        row.setAttribute('aria-label', 'Abrir reporte ' + report.id);
        Object.assign(row.dataset, { reportRow: '', reportId: report.id, municipality: report.municipality, status: report.status, priority: report.priority, workType: report.workTypeId, date: report.date });
        fields.forEach((key, index) => {
          const cell = document.createElement('td');
          cell.dataset.label = labels[index];
          const span = document.createElement(key === 'id' ? 'strong' : 'span');
          span.textContent = value(report[key]);
          if (statistics && ['workType', 'observations', 'municipality', 'authority', 'reporter'].includes(key)) {
            span.className = 'cell-preview' + (key === 'workType' ? ' cell-preview--work' : key === 'observations' ? ' cell-preview--observations' : '');
          }
          if (key === 'status') span.className = 'status' + (statusClasses[report.status] ? ' status--' + statusClasses[report.status] : '');
          if (key === 'priority') { span.className = 'priority'; span.dataset.priority = report.priority; }
          cell.title = span.textContent;
          cell.append(span);
          row.append(cell);
        });
        const menuCell = document.createElement('td');
        menuCell.className = 'menu-cell';
        // Solo marcado fijo; los valores de la API siempre usan textContent.
        menuCell.innerHTML = '<details class="row-menu"><summary>•••</summary><div class="row-menu__content"><button type="button" data-report-action="status">Cambiar estado</button><button type="button" data-report-action="authority">Asignar autoridad</button><button type="button" class="is-danger" data-delete-report>Eliminar</button></div></details>';
        menuCell.querySelector('summary').setAttribute('aria-label', 'Opciones del reporte ' + report.id);
        row.append(menuCell);
        tbody.append(row);
      });
      const empty = document.createElement('tr');
      empty.dataset.emptyRow = '';
      empty.className = 'empty-table-row';
      empty.hidden = reports.length > 0;
      const cell = document.createElement('td');
      cell.colSpan = fields.length + 1;
      cell.textContent = 'No hay reportes que coincidan con los filtros seleccionados.';
      empty.append(cell);
      tbody.append(empty);
    }
    const counts = { 'reports-total': reports.length, 'reports-pending': reports.filter(r => window.RIETI_STATUS_GROUPS.pending.includes(r.status)).length, 'reports-progress': reports.filter(r => window.RIETI_STATUS_GROUPS.progress.includes(r.status)).length, 'reports-resolved': reports.filter(r => window.RIETI_STATUS_GROUPS.resolved.includes(r.status)).length };
    document.querySelectorAll('[data-field^="reports-"]').forEach(node => { node.textContent = counts[node.dataset.field] ?? unavailable; });
    const rates = { 'resolution-rate': counts['reports-resolved'], 'progress-rate': counts['reports-progress'], 'pending-rate': counts['reports-pending'] };
    Object.entries(rates).forEach(([key, count]) => {
      const node = document.querySelector(`[data-field="${key}"]`);
      if (node) node.textContent = reports.length ? (count / reports.length * 100).toLocaleString('es-MX', {maximumFractionDigits: 1}) + '%' : 'No disponible';
    });
    const filterFeedback = document.querySelector('#filter-feedback');
    if (filterFeedback) filterFeedback.textContent = `Mostrando ${reports.length} reportes`;
    const listCount = document.querySelector('[data-list-count]');
    if (listCount) listCount.textContent = '(' + reports.length + ')';
    const donut = document.querySelector('.donut-chart');
    if (donut) {
      const statuses = [...new Set(reports.map(r => r.status))];
      const palette = window.RIETI_DONUT_COLORS;
      donut.insertAdjacentHTML('beforeend', window.RIETI_DRAW_DONUT(statuses, statuses.map(status => reports.filter(r => r.status === status).length)));
      donut.setAttribute('aria-label', statuses.map(status => `${status}: ${reports.filter(r => r.status === status).length}`).join(', ') || 'Sin reportes');
      const legend = donut.closest('article').querySelector('.chart-legend');
      legend.replaceChildren();
      statuses.forEach((status, index) => {
        const item = document.createElement('li'), dot = document.createElement('span');
        dot.className = 'legend-dot'; dot.style.background = palette[index % palette.length];
        item.append(dot, document.createTextNode(status)); legend.append(item);
      });
    }
    const lastQuery = document.querySelector('[data-last-report-query]');
    if (lastQuery) {
      const consultedAt = new Date();
      lastQuery.textContent = 'Última consulta: ' + consultedAt.toLocaleTimeString('es-MX', {
        timeZone: 'America/Mexico_City', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
      });
      lastQuery.title = consultedAt.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }) + ' (hora de Ciudad de México)';
    }
    feedback.textContent = context ? 'Consulta de lectura · Acciones de modificación simuladas.' : `${reports.length} reportes consultados · Acciones de modificación simuladas.`;
  } catch (error) {
    window.RIETI_API_ERROR = error.message;
    const lastQuery = document.querySelector('[data-last-report-query]');
    if (lastQuery) lastQuery.textContent = 'Última consulta: no disponible';
    feedback.textContent = error.name === 'TimeoutError'
      ? 'La consulta tardó demasiado. Usa Actualizar para reintentar.'
      : error instanceof TypeError
        ? `No fue posible conectar con ${apiBase}. Comprueba que el backend esté iniciado y que su CORS permita ${location.origin}. También puedes abrir el dashboard desde ${apiBase}/pages/dashboard.html.`
        : error.message + ' Vuelve a cargar para reintentar.';
    document.querySelectorAll('[data-field^="reports-"]').forEach(node => { node.textContent = unavailable; });
    const donut = document.querySelector('.donut-chart');
    if (donut) { donut.style.background = '#eef0f4'; donut.setAttribute('aria-label', unavailable); donut.closest('article').querySelector('.chart-legend').textContent = unavailable; }
    const filterFeedback = document.querySelector('#filter-feedback');
    if (filterFeedback) filterFeedback.textContent = unavailable;
    const listCount = document.querySelector('[data-list-count]');
    if (listCount) listCount.textContent = '(—)';
    const tbody = document.querySelector('tbody[data-list]');
    if (tbody) { const row = document.createElement('tr'), cell = document.createElement('td'); cell.colSpan = tbody.closest('table').querySelectorAll('thead th').length; cell.textContent = 'Reportes no disponibles.'; row.append(cell); tbody.replaceChildren(row); }
  } finally {
    // Liberar también ante errores: deben verse los avisos, nunca una carga infinita.
    document.body.removeAttribute('data-report-loading');
    document.querySelector('main')?.setAttribute('aria-busy', 'false');
    document.querySelectorAll('[data-load-block]').forEach(block => {
      block.removeAttribute('inert');
      block.setAttribute('aria-busy', 'false');
    });
    document.querySelectorAll('[data-loading-only]').forEach(block => { block.hidden = true; });
  }
})();
