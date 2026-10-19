const express = require('express');
const cors = require('cors');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const fs = require('node:fs');
const path = require('node:path');
const { corsOptions } = require('./cors-options');
const { createAuth, SESSION_COOKIE } = require('./auth');
const { readReports } = require('./reports');
const { readDuplicates } = require('./duplicates');
const { readHeatmap } = require('./heatmap');
const { readPerformance } = require('./performance');
const { changeReport, readHistory } = require('./report-actions');

function createApplication({ pool, sessionSecret = process.env.SESSION_SECRET, sessionStore, loginLimit,
  publicAdminRegistrationUntil = process.env.PUBLIC_ADMIN_REGISTRATION_UNTIL } = {}) {
  if (typeof sessionSecret !== 'string' || Buffer.byteLength(sessionSecret) < 32) throw new Error('Configura SESSION_SECRET con al menos 32 caracteres aleatorios en .env.');
  if (!sessionStore) {
    const directory = path.resolve(process.env.SESSION_DIR || path.join(__dirname, '.sessions'));
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    sessionStore = new FileStore({ path: directory, secret: sessionSecret, ttl: 7 * 86400, retries: 0, logFn: () => {} });
  }
  const app = express();
  app.disable('x-powered-by');
  // El servidor escucha en loopback; únicamente confiar en el proxy local de EC2.
  app.set('trust proxy', 'loopback');
  app.use(cors(corsOptions(process.env.CORS_ORIGIN)));
  app.use(express.json({ limit: '16kb' }));
  app.use(session({
    name: SESSION_COOKIE, secret: sessionSecret, store: sessionStore,
    resave: false, saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' ? true : 'auto', path: '/' },
  }));
  app.use('/api', (request, response, next) => { response.set('Cache-Control', 'no-store'); next(); });
  const registrationDeadline = Date.parse(publicAdminRegistrationUntil || '');
  const publicRegistrationOpen = () => Number.isFinite(registrationDeadline) && Date.now() < registrationDeadline;
  const auth = createAuth({ pool, loginLimit, publicRegistrationOpen });
  auth.mount(app);
  app.get('/api/auth/registration/municipios', async (request, response, next) => {
    if (!publicRegistrationOpen()) return response.status(403).json({ success: false, error: 'El registro público está cerrado.' });
    try {
      const [rows] = await pool.query('SELECT id_municipio, nombre, clave_corta FROM Municipio ORDER BY nombre ASC');
      response.json(rows);
    } catch (error) { next(error); }
  });
  const scope = request => request.auth.role === 'procurador' ? request.auth.municipalityId : null;

  app.get('/test', (request, response) => response.json({ success: true, message: 'API RIETI funcionando' }));
  app.get('/test-db', auth.requireAuth, auth.requireAdmin, async (request, response, next) => {
    try {
      const [rows] = await pool.query('SELECT 1 AS connected');
      response.json({ success: true, message: 'Conexión con la base de datos correcta', database: rows[0].connected === 1 ? 'connected' : 'unknown' });
    } catch (error) { next(error); }
  });

  app.use('/api/reportes', auth.requireAuth, auth.protectWrites);
  const validReportId = (request, response, next) => /^[1-9]\d*$/.test(request.params.id)
    ? next() : response.status(400).json({ error: 'Identificador inválido.' });
  app.get('/api/reportes/:id/historial', validReportId, async (request, response, next) => {
    try {
      const data = await readHistory(pool, request.params.id, scope(request));
      if (data === null) return response.status(404).json({ error: 'Reporte no encontrado.' });
      response.json({ data });
    } catch (error) { next(error); }
  });
  app.patch('/api/reportes/:id/estado', validReportId, async (request, response, next) => {
    try { response.json({ success: true, data: await changeReport(pool, request.params.id, request.auth, request.body) }); }
    catch (error) { next(error); }
  });
  app.delete('/api/reportes/:id', auth.requireAdmin, validReportId, async (request, response, next) => {
    try { response.json({ success: true, data: await changeReport(pool, request.params.id, request.auth, request.body, { deleting: true }) }); }
    catch (error) { next(error); }
  });
  app.get('/api/reportes/:id/coincidencias', async (request, response, next) => {
    const id = request.params.id;
    if (!/^[1-9]\d*$/.test(id)) return response.status(400).json({ message: 'Identificador inválido' });
    try {
      const matches = await readDuplicates(pool, id, scope(request));
      if (matches === null) return response.status(404).json({ message: 'Reporte no encontrado' });
      response.json({ data: matches });
    } catch (error) { next(error); }
  });
  app.get(['/api/reportes', '/api/reportes/:id'], async (request, response, next) => {
    const id = request.params.id;
    if (id && !/^[1-9]\d*$/.test(id)) return response.status(400).json({ message: 'Identificador inválido' });
    try {
      const reports = await readReports(pool, id, scope(request));
      if (id && !reports.length) return response.status(404).json({ message: 'Reporte no encontrado' });
      response.json({ data: id ? reports[0] : reports });
    } catch (error) { next(error); }
  });
  app.get('/api/mapa-calor', auth.requireAuth, async (request, response, next) => {
    try { response.json({ data: await readHeatmap(pool, scope(request)) }); }
    catch (error) { next(error); }
  });
  app.get('/api/rendimiento', auth.requireAuth, async (request, response, next) => {
    try { response.json({ data: await readPerformance(pool, scope(request)) }); }
    catch (error) { next(error); }
  });
  app.get('/api/municipios', auth.requireAuth, auth.requireAdmin, async (request, response, next) => {
    try {
      const [rows] = await pool.query('SELECT id_municipio, nombre, clave_corta FROM Municipio ORDER BY nombre ASC');
      response.json(rows);
    } catch (error) { next(error); }
  });
  app.use('/api', (request, response) => response.status(404).json({ success: false, error: 'Ruta no encontrada.' }));

  // Proteger también el acceso directo al HTML; la API valida la sesión por separado.
  app.use(async (request, response, next) => {
    try {
      const pathname = path.posix.normalize(decodeURIComponent(request.path)).toLowerCase();
      if (!pathname.startsWith('/pages/') || !pathname.endsWith('.html')) return next();
      if (pathname === '/pages/acerca.html' && request.query.origen !== 'panel') return next();
      response.set('Cache-Control', 'no-store');
      if (pathname === '/pages/registro.html' && publicRegistrationOpen()) return next();
      const user = await auth.loadUser(request);
      if (!user) return response.redirect('/index.html' + (pathname === '/pages/registro.html' ? '?next=registro' : ''));
      if (pathname === '/pages/registro.html' && user.role !== 'administrador') return response.status(403).send('Solo un administrador puede registrar nuevas cuentas.');
      next();
    } catch (error) { next(error); }
  });
  app.use(express.static(path.join(__dirname, '../aplicacion_web')));
  app.use((error, request, response, next) => {
    if (response.headersSent) return next(error);
    const status = error instanceof URIError || error.type === 'entity.parse.failed' ? 400 : error.type === 'entity.too.large' ? 413 : error.status || 500;
    if (status >= 500) console.error('Error en API RIETI:', error.code || error.name);
    const message = error.type === 'entity.parse.failed' || error instanceof URIError ? 'Solicitud inválida.' : status >= 500 ? 'No fue posible completar la solicitud. Intenta nuevamente.'
      : status === 413 ? 'La solicitud es demasiado grande.' : status === 400 && !error.status ? 'Solicitud inválida.' : error.message;
    response.status(status).json({ success: false, error: message });
  });
  return app;
}

module.exports = { createApplication };
