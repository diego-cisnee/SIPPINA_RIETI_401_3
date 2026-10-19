// La cookie HttpOnly identifica la sesión; nunca confiar en IDs o roles de localStorage.
(() => {
  const publicAbout = location.pathname.endsWith('/acerca.html') && new URLSearchParams(location.search).get('origen') !== 'panel';
  if (publicAbout) { document.body.removeAttribute('data-auth-pending'); window.RIETI_AUTH_READY = Promise.resolve(null); return; }
  document.body.setAttribute('data-auth-pending', '');
  const redirect = () => {
    document.body.setAttribute('data-auth-pending', '');
    location.replace('../index.html' + (location.pathname.endsWith('/registro.html') ? '?next=registro' : ''));
  };
  window.addEventListener('rieti:unauthorized', redirect);
  window.RIETI_SESSION_CHANNEL?.addEventListener('message', () => {
    document.body.setAttribute('data-auth-pending', ''); location.reload();
  });
  window.RIETI_AUTH_READY = (async () => {
    try {
      const registrationPage = location.pathname.endsWith('/registro.html');
      if (registrationPage) {
        const settings = await window.RIETI_API.request('/api/auth/registration');
        if (!settings.ok) throw new Error('No fue posible consultar el registro.');
        window.RIETI_PUBLIC_REGISTRATION = (await settings.json()).publicRegistrationEnabled === true;
      }
      const response = await window.RIETI_API.request('/api/auth/session');
      if (response.status === 401 && registrationPage && window.RIETI_PUBLIC_REGISTRATION) {
        document.querySelector('[data-registration-description]').textContent = 'El registro de administradores está habilitado temporalmente. Crea tu cuenta y después inicia sesión.';
        document.body.removeAttribute('data-auth-pending');
        return null;
      }
      if (response.status === 401) { redirect(); return null; }
      if (!response.ok) throw new Error('No fue posible comprobar la sesión.');
      const { user, expiresAt } = await response.json();
      if (!user || !['administrador', 'procurador'].includes(user.role)) throw new Error('La sesión recibida no es válida.');
      if (location.pathname.endsWith('/registro.html') && user.role !== 'administrador') { location.replace('dashboard.html'); return null; }
      window.RIETI_USER = user;
      document.body.dataset.role = user.role;
      document.querySelectorAll('[data-field="user-name"]').forEach(node => { node.textContent = user.name; });
      document.querySelectorAll('[data-field="user-role"]').forEach(node => { node.textContent = user.role === 'administrador' ? 'Administrador' : 'Procurador municipal'; });
      document.querySelectorAll('[data-admin-only]').forEach(node => { node.hidden = user.role !== 'administrador'; });
      const profile = { 'profile-full-name': user.name, 'profile-contact-email': user.email, 'profile-phone': 'No disponible', 'profile-organization': 'RIETI' };
      Object.entries(profile).forEach(([key, value]) => document.querySelectorAll(`[data-field="${key}"]`).forEach(node => { node.textContent = value; }));
      document.body.removeAttribute('data-auth-pending');
      if (Number.isFinite(expiresAt)) setTimeout(redirect, Math.max(0, expiresAt - Date.now()));
      return user;
    } catch {
      document.body.removeAttribute('data-auth-pending');
      const message = document.createElement('p');
      message.setAttribute('role', 'alert'); message.textContent = 'No fue posible comprobar la sesión. Recarga la página para reintentar.';
      document.querySelector('main')?.replaceChildren(message);
      return null;
    }
  })();
  window.addEventListener('pagehide', () => document.body.setAttribute('data-auth-pending', ''));
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
})();
