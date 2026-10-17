/*
  VISTA DE SEGUIMIENTO
  Lee únicamente el ID interno y un origen permitido de la URL.
  Espera la consulta GET por id_reporte; carga y errores se manejan sin datos de muestra.
*/
(async () => {
  await window.RIETI_READY;
  const content = document.querySelector("[data-report-context]");
  if (!content) return;

  const params = new URLSearchParams(window.location.search);
  const origins = {
    dashboard: ["dashboard.html", "Dashboard"],
    reportes: ["reportes.html", "Gestión de reportes"],
    "mapa-calor": ["mapa-calor.html", "Estadísticas · Mapa de calor"],
    estadisticas: ["estadisticas.html", "Estadísticas · Reportes"],
  };
  const origin = params.get("from");
  const [originPath, originName] = Object.hasOwn(origins, origin) ? origins[origin] : origins.reportes;
  const id = params.get("id");
  const records = window.RIETI_REPORTS || {};
  const report = Object.hasOwn(records, id) ? records[id] : null;

  document.querySelectorAll("[data-origin-link]").forEach((link) => {
    link.href = originPath;
    link.textContent = originName;
  });
  document.querySelectorAll("[data-back-link]").forEach((link) => { link.href = originPath; });
  document.querySelectorAll(".sidebar-nav a").forEach((link) => {
    if (link.getAttribute("href") === originPath) link.classList.add("is-active");
  });

  const printButton = document.querySelector("[data-print-report]");
  if (!report) {
    document.querySelector("[data-report-error]").hidden = false;
    printButton.disabled = true;
    return;
  }

  // No se inserta HTML a partir de la URL o de los datos del reporte.
  document.querySelectorAll("[data-detail]").forEach((node) => {
    node.textContent = report[node.dataset.detail] ?? "No disponible";
    if (node.dataset.detail === "priority") node.dataset.priority = report.priority;
  });
  document.querySelector("[data-heatmap-link]").href = "mapa-calor.html?reporte=" + encodeURIComponent(report.id);
  content.dataset.reportId = report.id;
  content.dataset.reportFolio = report.folio;
  content.dataset.status = report.status;
  content.dataset.priority = report.priority;
  content.hidden = false;
  document.title = report.folio + " | Seguimiento RIETI";
  document.querySelector('meta[name="description"]').content =
    "Seguimiento del reporte " + report.folio + " en " + report.municipality + ".";
  printButton.addEventListener("click", () => { window.print(); });

  const duplicateNotice = document.querySelector('[data-duplicate-notice]');
  const duplicateStatus = document.querySelector('[data-duplicate-status]');
  const duplicateList = document.querySelector('[data-duplicate-list]');
  async function checkDuplicates() {
    duplicateNotice.hidden = true;
    duplicateNotice.setAttribute('aria-busy', 'true');
    duplicateNotice.classList.remove('duplicate-notice--warning');
    duplicateStatus.textContent = 'Comprobando coincidencias…';
    duplicateList.hidden = true;
    duplicateList.replaceChildren();
    const apiBase = (window.RIETI_API_BASE || (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) && location.port !== '3000' ? 'http://127.0.0.1:3000' : location.origin)).replace(/\/$/, '');
    try {
      const response = await fetch(`${apiBase}/api/reportes/${encodeURIComponent(report.id)}/coincidencias`, { method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('No fue posible comprobar coincidencias.');
      const payload = await response.json();
      if (!Array.isArray(payload.data) || !payload.data.every(match => match && /^[1-9]\d*$/.test(String(match.id)) && String(match.id) !== report.id && Array.isArray(match.reasons) && match.reasons.every(reason => typeof reason === 'string'))) throw new Error('Respuesta de coincidencias inválida.');
      duplicateStatus.textContent = payload.data.length
        ? 'Revisa estos reportes: podrían corresponder al mismo caso.'
        : 'No se encontraron coincidencias con los criterios actuales. Esto no descarta que exista un duplicado.';
      duplicateNotice.classList.toggle('duplicate-notice--warning', payload.data.length > 0);
      for (const match of payload.data) {
        const item = document.createElement('li');
        const heading = document.createElement('strong');
        heading.textContent = `Folio ${match.folio == null || match.folio === '' ? 'No disponible' : match.folio}`;
        const reasons = document.createElement('p');
        reasons.textContent = match.reasons.join(' · ');
        const link = document.createElement('a');
        link.className = 'detail-text-link duplicate-notice__link';
        link.textContent = 'Abrir posible duplicado ↗';
        link.setAttribute('aria-label', `Abrir posible duplicado: ${heading.textContent}`);
        link.href = `reporte.html?id=${encodeURIComponent(match.id)}&from=${Object.hasOwn(origins, origin) ? origin : 'reportes'}`;
        item.append(heading, reasons, link);
        duplicateList.append(item);
      }
      duplicateList.hidden = payload.data.length === 0;
      duplicateNotice.hidden = payload.data.length === 0;
    } catch {
      duplicateNotice.hidden = true;
    } finally {
      duplicateNotice.setAttribute('aria-busy', 'false');
    }
  }
  checkDuplicates();

  // Solo visualización: utiliza las coordenadas que ya entrega la consulta del reporte.
  const mapNode = document.querySelector('[data-case-map]');
  const mapMessage = document.querySelector('[data-map-message]');
  const coordinate = (value, limit) => {
    if (value == null || String(value).trim() === '') return null;
    const number = Number(value);
    return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
  };
  const latitude = coordinate(report.latitude, 90);
  const longitude = coordinate(report.longitude, 180);
  if (latitude !== null && longitude !== null && window.L) {
    mapNode.hidden = false;
    mapMessage.hidden = true;
    const map = L.map(mapNode, { scrollWheelZoom: false }).setView([latitude, longitude], 16);
    const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    streets.on('tileerror', () => {
      mapMessage.hidden = false;
      mapMessage.textContent = 'No se pudo cargar el mapa base. La ubicación marcada sigue disponible.';
    });
    L.marker([latitude, longitude], {
      icon: L.divIcon({ className: 'case-map-pin', iconSize: [20, 20], iconAnchor: [10, 10] }),
    }).addTo(map).bindTooltip('Ubicación del caso', { permanent: true, direction: 'top' });
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(mapNode);
    window.addEventListener('beforeprint', () => map.invalidateSize());
    window.addEventListener('afterprint', () => map.invalidateSize());
  }
})();
