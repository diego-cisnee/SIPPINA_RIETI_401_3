// El mismo origen en EC2; en desarrollo conservar el host para compartir la cookie.
(() => {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  window.RIETI_API_BASE = (window.RIETI_API_BASE || (local && location.port !== '3000' ? `http://${location.hostname === 'localhost' ? 'localhost' : '127.0.0.1'}:3000` : location.origin)).replace(/\/$/, '');
  window.RIETI_API = {
    async request(path, options = {}) {
      const response = await fetch(window.RIETI_API_BASE + path, {
        cache: 'no-store', ...options, credentials: 'include',
        signal: options.signal || AbortSignal.timeout(15000),
      });
      if (response.status === 401 && !path.startsWith('/api/auth/')) window.dispatchEvent(new Event('rieti:unauthorized'));
      return response;
    },
  };
  if ('BroadcastChannel' in window) window.RIETI_SESSION_CHANNEL = new BroadcastChannel('rieti-session');
})();
