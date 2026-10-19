// Invalidar la sesión en Express antes de regresar al login.
(() => {
  const trigger = document.querySelector('[data-action="logout"]');
  const dialog = document.querySelector('#logout-dialog');
  if (!trigger || !dialog) return;
  const cancel = dialog.querySelector('[data-cancel-logout]');
  const confirm = dialog.querySelector('[data-confirm-logout]');
  const message = dialog.querySelector('#logout-description');
  let leaving = false;
  trigger.addEventListener('click', () => { if (!dialog.open && !leaving) { message.textContent = 'Se cerrará tu sesión en este navegador.'; dialog.showModal(); cancel.focus(); } });
  cancel.addEventListener('click', () => { if (!leaving) dialog.close(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); if (!leaving) dialog.close(); });
  dialog.addEventListener('close', () => { if (!leaving) trigger.focus(); });
  confirm.addEventListener('click', async () => {
    if (!dialog.open || leaving) return;
    leaving = true; confirm.disabled = cancel.disabled = true;
    try {
      const response = await window.RIETI_API.request('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!response.ok) throw new Error('logout');
      localStorage.removeItem('id_admin');
      window.RIETI_SESSION_CHANNEL?.postMessage('changed');
      location.replace('../index.html');
    } catch {
      leaving = false; confirm.disabled = cancel.disabled = false;
      message.textContent = 'No fue posible cerrar la sesión. Intenta nuevamente.';
    }
  });
})();
