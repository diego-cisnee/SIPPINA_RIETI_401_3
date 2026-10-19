document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.RIETI_AUTH_READY;
  if (user?.role !== 'administrador' && !window.RIETI_PUBLIC_REGISTRATION) return;
  const form = document.getElementById('register-form');
  const button = form.querySelector('button[type="submit"]');
  const message = document.getElementById('registration-message');
  const confirmation = document.getElementById('registration-confirmation');
  confirmation.addEventListener('close', () => button.focus());
  const role = form.elements.role;
  const updateLimits = () => {
    form.elements.nombre.maxLength = role.value === 'procurador' ? 150 : 50;
    form.elements.email.maxLength = role.value === 'procurador' ? 254 : 50;
  };
  role.addEventListener('change', updateLimits);
  updateLimits();
  const toggle = form.querySelector('.password-toggle');
  toggle?.setAttribute('aria-pressed', 'false');
  toggle?.addEventListener('click', () => {
    const password = document.getElementById('contrasena');
    const visible = password.type === 'password';
    password.type = visible ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', String(visible));
    toggle.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const password = document.getElementById('contrasena');
    if (new TextEncoder().encode(password.value).length > 72) {
      message.textContent = 'La contraseña debe ocupar como máximo 72 bytes.'; return;
    }
    const selectedRole = user?.role === 'administrador' ? role.value : 'administrador';
    const label = selectedRole === 'procurador' ? 'Procurador' : 'Administrador';
    button.disabled = true; message.textContent = 'Registrando cuenta…';
    try {
      const response = await window.RIETI_API.request('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: form.elements.nombre.value.trim(), email: form.elements.email.value.trim(),
          id_municipio: Number(form.elements.id_municipio.value), contrasena: password.value, role: selectedRole }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'No fue posible registrar la cuenta.');
      form.reset(); form.elements.id_municipio.value = '';
      role.value = selectedRole; updateLimits();
      message.textContent = '';
      document.getElementById('registration-confirmation-title').textContent = `${label} registrado correctamente`;
      confirmation.showModal();
      await window.RIETI_REFRESH_ACCOUNTS?.();
    } catch (error) {
      message.textContent = error instanceof TypeError || error.name === 'TimeoutError' ? 'No fue posible conectar con el servidor. Intenta nuevamente.' : error.message;
    } finally { button.disabled = false; }
  });
});
