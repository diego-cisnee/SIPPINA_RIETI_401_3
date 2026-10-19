document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.RIETI_AUTH_READY;
  if (!user || user.role !== 'administrador') return;
  const form = document.getElementById('reset-password-form');
  const role = document.getElementById('account-role');
  const account = document.getElementById('account-id');
  const button = form.querySelector('button[type="submit"]');
  const message = document.getElementById('reset-message');
  const confirmation = document.getElementById('reset-confirmation');
  let reauthenticate = false;
  confirmation.addEventListener('close', () => {
    if (reauthenticate) {
      window.RIETI_SESSION_CHANNEL?.postMessage('changed');
      location.replace('../index.html');
    } else button.focus();
  });
  let accounts = [];
  function populate() {
    account.replaceChildren(new Option('Selecciona una cuenta', ''));
    accounts.filter(item => item.role === role.value).forEach(item => account.add(new Option(`${item.name} · ${item.email}`, String(item.id))));
    account.disabled = button.disabled = account.options.length === 1;
  }
  async function loadAccounts() {
    try {
      const response = await window.RIETI_API.request('/api/auth/accounts');
      if (!response.ok) throw new Error('accounts');
      const data = await response.json();
      if (!Array.isArray(data.data)) throw new Error('accounts');
      accounts = data.data; populate();
    } catch {
      account.disabled = button.disabled = true;
      message.textContent = 'No fue posible consultar las cuentas. Recarga la página para reintentar.';
    }
  }
  window.RIETI_REFRESH_ACCOUNTS = loadAccounts;
  role.addEventListener('change', populate);
  await loadAccounts();
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const password = document.getElementById('new-password');
    if (new TextEncoder().encode(password.value).length > 72) { message.textContent = 'La contraseña debe ocupar como máximo 72 bytes.'; return; }
    const selectedAccount = accounts.find(item => item.role === role.value && item.id === Number(account.value));
    if (!selectedAccount) { message.textContent = 'Selecciona una cuenta válida.'; return; }
    button.disabled = true; message.textContent = 'Restableciendo contraseña…';
    try {
      const response = await window.RIETI_API.request('/api/auth/password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedAccount.role, id: selectedAccount.id, password: password.value }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'No fue posible restablecer la contraseña.');
      password.value = ''; message.textContent = '';
      reauthenticate = data.reauthenticate === true;
      document.getElementById('reset-confirmation-account').textContent = `${selectedAccount.name} · ${selectedAccount.email}`;
      confirmation.showModal();
    } catch (error) {
      message.textContent = error instanceof TypeError || error.name === 'TimeoutError' ? 'No fue posible conectar con el servidor. Intenta nuevamente.' : error.message;
    } finally { button.disabled = reauthenticate || account.disabled; }
  });
});
