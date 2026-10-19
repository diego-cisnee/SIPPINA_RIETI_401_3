(async () => {
  if (!await window.RIETI_AUTH_READY || window.RIETI_USER.role !== 'administrador') return;
  await window.RIETI_READY;
  const dialog = document.querySelector('#delete-report-dialog');
  if (!dialog) return;
  const form = dialog.querySelector('form');
  const checkbox = dialog.querySelector('#delete-acknowledgement');
  const confirm = dialog.querySelector('[data-confirm-delete]');
  const cancel = dialog.querySelector('[data-cancel-delete]');
  const description = dialog.querySelector('#delete-report-description');
  const errorMessage = document.createElement('p'); errorMessage.setAttribute('role', 'alert');
  form.querySelector('.dialog-actions').before(errorMessage);
  let selected = null, returnFocusTo = null, saving = false;
  document.querySelectorAll('[data-delete-report]').forEach(button => button.addEventListener('click', () => {
    const context = button.closest('[data-report-row], [data-report-context]');
    const report = context && window.RIETI_REPORTS[context.dataset.reportId];
    if (!report || dialog.open || saving) return;
    selected = { ...report }; returnFocusTo = context.querySelector('summary') || button;
    form.reset(); confirm.disabled = true; errorMessage.textContent = '';
    dialog.querySelector('[data-delete-folio]').textContent = selected.folio;
    description.textContent = '¿Seguro que deseas eliminar el reporte?';
    document.querySelectorAll('.row-menu').forEach(menu => { menu.open = false; });
    dialog.showModal(); cancel.focus();
  }));
  checkbox.addEventListener('change', () => { confirm.disabled = saving || !checkbox.checked; });
  cancel.addEventListener('click', () => { if (!saving) dialog.close(); });
  dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
  dialog.addEventListener('close', () => { selected = null; returnFocusTo?.focus(); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!dialog.open || saving || !selected || !checkbox.checked || !form.reportValidity()) return;
    saving = true; confirm.disabled = cancel.disabled = true; confirm.textContent = 'Eliminando…'; errorMessage.textContent = '';
    try {
      const response = await window.RIETI_API.request(`/api/reportes/${encodeURIComponent(selected.id)}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: selected.version }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'No fue posible eliminar el reporte.');
      if (document.querySelector('[data-report-context]')) location.replace(document.querySelector('[data-back-link]')?.getAttribute('href') || 'reportes.html');
      else location.reload();
    } catch (error) {
      errorMessage.textContent = error instanceof TypeError || ['TimeoutError', 'SyntaxError'].includes(error.name)
        ? 'No se pudo confirmar la eliminación. Recarga la página para comprobar el reporte antes de volver a enviar.' : error.message;
    } finally { saving = false; confirm.disabled = !checkbox.checked; cancel.disabled = false; confirm.textContent = 'Eliminar reporte'; }
  });
})();
