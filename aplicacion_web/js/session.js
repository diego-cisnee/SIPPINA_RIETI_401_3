/* CIERRE DE SESIÓN DEL PROTOTIPO — compartido por todas las pantallas internas.
   No existe autenticación real: solo se confirma la navegación al login.
   INTEGRACIÓN FUTURA: al confirmar, solicitar a la API invalidar la sesión/cookie;
   esperar una respuesta satisfactoria antes de redirigir y mostrar un error si falla.
   No borrar todo localStorage/sessionStorage: puede contener datos ajenos a la sesión.
   Las rutas deberán estar protegidas por el servidor cuando se conecte autenticación. */
(() => {
  const trigger = document.querySelector('[data-action="logout"]');
  const dialog = document.querySelector('#logout-dialog');
  if (!trigger || !dialog) return;
  const cancel = dialog.querySelector('[data-cancel-logout]');
  const confirm = dialog.querySelector('[data-confirm-logout]');
  let leaving = false;

  trigger.addEventListener('click', () => {
    if (dialog.open || leaving) return;
    dialog.showModal();
    // Enfocar Cancelar evita una confirmación accidental con Enter al abrir el aviso.
    cancel.focus();
  });
  cancel.addEventListener('click', () => dialog.close());
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    dialog.close(); // Escape equivale a cancelar; no cambia la URL ni los datos.
  });
  dialog.addEventListener('close', () => { if (!leaving) trigger.focus(); });
  confirm.addEventListener('click', () => {
    if (!dialog.open || leaving) return;
    leaving = true;
    confirm.disabled = true;
    // Ruta fija local: no se transmiten credenciales ni parámetros de redirección.
    // replace sustituye la entrada actual; no protege otras pantallas del prototipo.
    window.location.replace('../index.html');
  });
  // Si el navegador restaura una pantalla de su caché, no deja el botón bloqueado.
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    leaving = false;
    confirm.disabled = false;
    if (dialog.open) dialog.close();
  });
})();
