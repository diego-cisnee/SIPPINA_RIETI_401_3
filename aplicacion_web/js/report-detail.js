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
  const attachments = document.querySelector('[data-list="attachments"]');
  attachments.replaceChildren();
  const evidence = document.createElement('li');
  evidence.textContent = report.evidence === 'No disponible' ? 'No disponible' : 'Evidencia registrada: ' + report.evidence + ' · Descarga pendiente';
  attachments.append(evidence);
  content.dataset.reportId = report.id;
  content.dataset.status = report.status;
  content.dataset.priority = report.priority;
  content.hidden = false;
  document.title = report.id + " | Seguimiento RIETI";
  document.querySelector('meta[name="description"]').content =
    "Seguimiento del reporte " + report.id + " en " + report.municipality + ".";
  printButton.addEventListener("click", () => { window.print(); });

  // Mapa y adjuntos solo presentan avisos. No se descargan ni envían datos.
  const notice = document.querySelector("#detail-notice");
  let noticeTrigger = null;
  document.querySelectorAll("[data-detail-notice]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      noticeTrigger = link;
      const isMap = link.dataset.detailNotice === "map";
      notice.querySelector("h2").textContent = isMap ? "Ubicación del caso" : "Descarga de archivo";
      notice.querySelector("[data-detail-notice-message]").textContent = isMap
        ? "Aquí se abrirá la ubicación del reporte en el mapa. La integración del mapa está pendiente."
        : "La descarga de " + link.dataset.filename + " se habilitará después. Este adjunto es ficticio y no se descargará ningún archivo.";
      notice.showModal();
    });
  });
  notice.querySelector("[data-dismiss-detail-notice]").addEventListener("click", () => { notice.close(); });
  notice.addEventListener("close", () => { noticeTrigger?.focus(); });
})();
