/*
  VISTA DE SEGUIMIENTO
  Lee únicamente el folio y un origen permitido de la URL.
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
  content.dataset.status = report.status;
  content.dataset.priority = report.priority;
  content.hidden = false;
  document.title = report.id + " | Seguimiento RIETI";
  document.querySelector('meta[name="description"]').content =
    "Seguimiento del reporte " + report.id + " en " + report.municipality + ".";
  printButton.addEventListener("click", () => { window.print(); });

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
