document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.login-form');
  const button = document.getElementById('btn-login');
  const error = document.getElementById('mensaje-error');
  let checking = true, submitting = false, redirecting = false;
  const enter = user => {
    redirecting = true;
    localStorage.removeItem('id_admin');
    const registration = new URLSearchParams(location.search).get('next') === 'registro' && user.role === 'administrador';
    location.replace(registration ? 'pages/registro.html' : 'pages/dashboard.html');
  };
  button.disabled = true;
  window.RIETI_LOGIN_READY = (async () => {
    try {
      const response = await window.RIETI_API.request('/api/auth/session');
      if (response.ok) {
        const { user } = await response.json();
        if (user && ['administrador', 'procurador'].includes(user.role)) { enter(user); return; }
      }
    } catch { /* Permitir el login manual si la comprobación no está disponible. */ }
    finally {
      checking = false;
      if (!redirecting) {
        document.body.removeAttribute('data-session-checking');
        form.setAttribute('aria-busy', 'false'); button.disabled = false;
      }
    }
  })();
  window.RIETI_API.request('/api/auth/registration').then(async response => {
    if (response.ok && (await response.json()).publicRegistrationEnabled === true) {
      document.querySelector('[data-public-registration]').hidden = false;
    }
  }).catch(() => {});
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (checking || submitting || redirecting) return;
    error.hidden = true; error.style.display = 'none';
    submitting = true; button.disabled = true; button.textContent = 'Iniciando sesión…';
    try {
      const response = await window.RIETI_API.request('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: form.elements.email.value.trim(), pwrd: form.elements.password.value,
          role: form.elements.role.value, remember: form.elements.remember.checked }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'No fue posible iniciar sesión.');
      window.RIETI_SESSION_CHANNEL?.postMessage('changed');
      enter(data.user);
    } catch (failure) {
      error.textContent = failure instanceof TypeError || failure.name === 'TimeoutError' ? 'No fue posible conectar con el servidor. Intenta nuevamente.' : failure.message;
      error.hidden = false; error.style.display = 'block';
    } finally { submitting = false; if (!redirecting) { button.disabled = false; button.textContent = 'Iniciar sesión'; } }
  });
});
