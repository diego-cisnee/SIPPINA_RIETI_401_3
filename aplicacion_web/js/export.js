function exportarReportesCSV() {

  const reportes = Object.values(window.RIETI_REPORTS || {});

  if (reportes.length === 0) {
    alert('No hay reportes disponibles para exportar.');
    return;
  }

    const columnas = [
    { label: 'Folio', key: 'id' },
    { label: 'Denunciante', key: 'reporter' },
    { label: 'Municipio', key: 'municipality' },
    { label: 'Estatus', key: 'status' },
    { label: 'Prioridad', key: 'priority' },
    { label: 'Fecha', key: 'reportedAt' },
    { label: 'Tipo de Trabajo', key: 'workType' },
    { label: 'Autoridad', key: 'authority' },
    { label: 'Observaciones', key: 'observations' }
  ];

  
  const encabezados = columnas.map(c => `"${c.label}"`).join(',');

  
  const filas = reportes.map(reporte => {
    return columnas.map(col => {
      let valor = reporte[col.key] || '';
    valor = String(valor).replace(/"/g, '""');
      return `"${valor}"`;
    }).join(',');
  });

  const csvContent = '\uFEFF' + [encabezados, ...filas].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');

  enlace.href = url;
  enlace.setAttribute('download', `reportes_rieti_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
  const btnExportar = document.querySelector('[data-action="download-reports"]');
  if (btnExportar) {
    btnExportar.addEventListener('click', (e) => {
      e.preventDefault();
      exportarReportesCSV();
    });
  }
});