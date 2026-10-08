/* No inferir autoridades ni tiempos a partir de administradores o fecha de registro. */
(async () => {
  await window.RIETI_READY;
  document.querySelectorAll('[data-performance-metric]').forEach(node => { node.textContent = 'No disponible'; });
  const body = document.querySelector('#performance-rows');
  const row = document.createElement('tr'), cell = document.createElement('td');
  cell.colSpan = 8;
  cell.textContent = 'No disponible: la base actual no contiene asignaciones a autoridades ni fechas de resolución.';
  row.append(cell); body.replaceChildren(row);
  document.querySelector('#performance-feedback').textContent = window.RIETI_API_ERROR ? 'Consulta no disponible.' : 'Indicadores no disponibles con los campos actuales.';
  document.querySelector('#municipality-search').disabled = true;
  document.querySelector('#clear-municipality').disabled = true;
})();
