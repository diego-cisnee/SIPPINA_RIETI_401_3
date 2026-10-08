(async () => {
  if (window.RIETI_READY) await window.RIETI_READY;
/* ELIMINACIÓN SIMULADA: aviso común para las acciones rápidas y los menús de reportes.
   No borra registros, archivos ni almacenamiento. La casilla solo habilita la confirmación.
   INTEGRACIÓN FUTURA: enviar el ID a una API que valide permisos, registrar la operación
   y mostrar éxito únicamente después de la respuesta; ante un error conservar el reporte.
   La advertencia de irreversibilidad debe corresponder al comportamiento real aprobado. */
(() => {
  const dialog = document.querySelector('#delete-report-dialog');
  if (!dialog) return;
  const form = dialog.querySelector('#delete-report-form');
  const checkbox = dialog.querySelector('#delete-acknowledgement');
  const confirm = dialog.querySelector('[data-confirm-delete]');
  const cancel = dialog.querySelector('[data-cancel-delete]');
  const done = dialog.querySelector('[data-finish-delete]');
  const result = dialog.querySelector('[data-delete-result]');
  const title = dialog.querySelector('#delete-report-title');
  const description = dialog.querySelector('#delete-report-description');
  const folio = dialog.querySelector('[data-delete-folio]');
  let selectedId = '';
  let returnFocusTo = null;

  function reset() {
    checkbox.checked = false;
    confirm.disabled = true;
    form.hidden = false;
    result.hidden = true;
    title.textContent = '¿Eliminar este reporte?';
    description.textContent = '¿Estás seguro de que quieres eliminar este folio? Esta acción no puede deshacerse.';
  }

  document.querySelectorAll('[data-delete-report]').forEach(button => {
    button.addEventListener('click', () => {
      if (dialog.open) return;
      const context = button.closest('[data-report-row], [data-report-context]');
      if (!context || context.hidden || !context.dataset.reportId) return;
      reset();
      selectedId = context.dataset.reportId;
      // El folio se trata como texto, nunca como HTML proveniente de la URL o API.
      folio.textContent = selectedId;
      returnFocusTo = context.querySelector('summary') || button;
      document.querySelectorAll('.row-menu').forEach(menu => { menu.open = false; });
      dialog.showModal();
      cancel.focus();
    });
  });
  checkbox.addEventListener('change', () => { confirm.disabled = !checkbox.checked; });
  cancel.addEventListener('click', () => dialog.close());
  done.addEventListener('click', () => dialog.close());
  dialog.addEventListener('cancel', event => { event.preventDefault(); dialog.close(); });
  dialog.addEventListener('close', () => {
    reset();
    selectedId = '';
    folio.textContent = '';
    returnFocusTo?.focus();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    // Defensa adicional: no basta con cambiar visualmente el estado del botón.
    if (!dialog.open || form.hidden || !selectedId || !checkbox.checked || !form.reportValidity()) return;
    confirm.disabled = true;
    form.hidden = true;
    result.hidden = false;
    title.textContent = 'Eliminación simulada';
    description.textContent = `Confirmaste la eliminación del folio ${selectedId}. No se ha eliminado ningún dato del prototipo.`;
    done.focus();
  });
})();

})();
