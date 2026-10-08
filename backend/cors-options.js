// La API escucha únicamente en loopback. Admitir los servidores locales de
// desarrollo aunque cambien el puerto o utilicen localhost en vez de 127.0.0.1.
function isAllowedOrigin(origin, configuredOrigins = '') {
  if (!origin) return true; // Herramientas locales y peticiones de mismo origen.
  if (configuredOrigins.split(',').map(value => value.trim()).filter(Boolean).includes(origin)) return true;
  try {
    const url = new URL(origin);
    return ['http:', 'https:'].includes(url.protocol)
      && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      && !url.username && !url.password && url.origin === origin;
  } catch {
    return false;
  }
}
function corsOptions(configuredOrigins) {
  return {
    origin(origin, callback) { callback(null, isAllowedOrigin(origin, configuredOrigins)); },
    methods: ['GET', 'HEAD', 'OPTIONS'],
  };
}
module.exports = { isAllowedOrigin, corsOptions };
