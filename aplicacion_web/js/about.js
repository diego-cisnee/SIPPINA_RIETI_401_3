// El origen solo selecciona la presentación; no determina autenticación ni permisos.
document.documentElement.classList.toggle(
  'about-panel',
  new URLSearchParams(window.location.search).get('origen') === 'panel',
);
