// Promedio de todos los reportes medibles dentro del alcance de la sesión.
// Sumar duraciones y casos evita dar el mismo peso a municipios de distinto tamaño.
window.RIETI_DASHBOARD_METRICS_READY = (async () => {
  const value = document.querySelector('[data-field="average-resolution-days"]');
  if (!value) return;
  try {
    if (!await window.RIETI_AUTH_READY) return;
    await window.RIETI_PERFORMANCE_READY;
    if (window.RIETI_PERFORMANCE_ERROR) throw new Error('performance');
    const summary = window.RIETI_AUTHORITY_PERFORMANCE.reduce((result, row) => ({
      seconds: result.seconds + row.resolutionSeconds,
      measured: result.measured + row.measuredResolved,
    }), { seconds: 0, measured: 0 });
    const days = summary.measured ? summary.seconds / summary.measured / 86400 : null;
    value.textContent = days === null ? 'No disponible' : days > 0 && days < 0.005 ? '<0.01 días'
      : days.toLocaleString('es-MX', { maximumFractionDigits: 2 }) + (days === 1 ? ' día' : ' días');
  } catch {
    value.textContent = 'No disponible';
  } finally { value.setAttribute('aria-busy', 'false'); }
})();
