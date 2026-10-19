// Solo datos consultados: sin muestras, escrituras ni información de denunciantes.
window.RIETI_AUTHORITY_PERFORMANCE = [];
window.RIETI_PERFORMANCE_ERROR = null;
window.RIETI_PERFORMANCE_READY = (async () => {
  if (window.RIETI_AUTH_READY && !await window.RIETI_AUTH_READY) return;
  try {
    const response = await window.RIETI_API.request('/api/rendimiento');
    if (!response.ok) throw new Error('No fue posible consultar el rendimiento.');
    const payload = await response.json();
    if (!Array.isArray(payload.data) || !payload.data.every(row => row
      && Number.isInteger(row.municipalityId) && typeof row.municipality === 'string'
      && typeof row.authority === 'string'
      && ['total', 'pending', 'progress', 'resolved', 'authorityCount', 'measuredResolved', 'resolutionSeconds'].every(key => Number.isSafeInteger(row[key]) && row[key] >= 0)
      && row.measuredResolved <= row.resolved
      && (row.measuredResolved === 0 ? row.averageDays === null && row.resolutionSeconds === 0 : Number.isFinite(row.averageDays) && row.averageDays >= 0)
      && row.pending + row.progress + row.resolved <= row.total)) throw new Error('Respuesta de rendimiento inválida.');
    window.RIETI_AUTHORITY_PERFORMANCE = payload.data;
  } catch (error) {
    window.RIETI_PERFORMANCE_ERROR = error.name === 'TimeoutError'
      ? 'La consulta tardó demasiado. Usa Actualizar para reintentar.'
      : 'No fue posible cargar el rendimiento. Usa Actualizar para reintentar.';
  }
})();
