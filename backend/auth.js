const bcrypt = require('bcryptjs');
const { randomBytes, createHash } = require('node:crypto');
const { rateLimit } = require('express-rate-limit');
const { isAllowedOrigin } = require('./cors-options');

const accounts = Object.freeze({
  administrador: { table: 'Administrador', id: 'id_admin', email: 'email', active: '' },
  procurador: { table: 'Procurador', id: 'id_procurador', email: 'correo', active: ' AND activo = 1' },
});
const dummyHash = bcrypt.hash(randomBytes(32).toString('hex'), 10);
const SESSION_COOKIE = 'rieti.sid';
const passwordVersion = hash => createHash('sha256').update(hash).digest('hex');
const fail = (status, message) => Object.assign(new Error(message), { status });
const publicUser = row => ({ id: row.id, role: row.role, name: row.name, email: row.email, municipalityId: row.municipalityId });

async function authenticate(pool, body) {
  const { user, pwrd, role } = body || {};
  if (typeof user !== 'string' || !user.trim() || user.length > 254
    || typeof pwrd !== 'string' || !pwrd || bcrypt.truncates(pwrd)
    || typeof role !== 'string' || !Object.hasOwn(accounts, role)) throw fail(400, 'Ingresa usuario, contraseña y tipo de cuenta válidos.');
  const account = accounts[role];
  const [rows] = await pool.execute(`SELECT ${account.id} AS id, id_municipio AS municipalityId,
    nombre AS name, ${account.email} AS email, contrasena AS passwordHash
    FROM ${account.table} WHERE (${account.email} = ? OR nombre = ?)${account.active} LIMIT 2`, [user.trim(), user.trim()]);
  const row = rows.length === 1 ? rows[0] : null;
  const hash = row && typeof row.passwordHash === 'string' && /^\$2[aby]\$/.test(row.passwordHash) ? row.passwordHash : await dummyHash;
  const valid = await bcrypt.compare(pwrd, hash);
  if (!row || hash !== row.passwordHash || !valid) throw fail(401, 'Usuario o contraseña inválidos.');
  return { user: publicUser({ ...row, role }), passwordVersion: passwordVersion(row.passwordHash) };
}

function registrationValues(body) {
  const { nombre, email, contrasena, id_municipio } = body || {};
  const role = body?.role === undefined ? 'administrador' : body.role;
  if (typeof role !== 'string' || !Object.hasOwn(accounts, role)) throw fail(400, 'Selecciona un tipo de cuenta válido.');
  const nameLimit = role === 'procurador' ? 150 : 50;
  const emailLimit = role === 'procurador' ? 254 : 50;
  const municipalityId = typeof id_municipio === 'number' || (typeof id_municipio === 'string' && /^\d+$/.test(id_municipio)) ? Number(id_municipio) : NaN;
  if (typeof nombre !== 'string' || !nombre.trim() || [...nombre.trim()].length > nameLimit
    || typeof email !== 'string' || email.trim().length > emailLimit || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    || typeof contrasena !== 'string' || contrasena.length < 8 || bcrypt.truncates(contrasena)
    || !Number.isSafeInteger(municipalityId) || municipalityId < 1) {
    throw fail(400, `Revisa los datos: nombre de hasta ${nameLimit} y correo de hasta ${emailLimit} caracteres, municipio válido y contraseña de al menos 8 caracteres y hasta 72 bytes.`);
  }
  return { name: nombre.trim(), email: email.trim().toLowerCase(), password: contrasena, municipalityId, role };
}

async function registerAccount(pool, body) {
  const values = registrationValues(body);
  const account = accounts[values.role];
  // Administrador no tiene índices únicos en RDS. Serializar altas para que dos
  // solicitudes simultáneas no evadan la comprobación de correo/nombre repetidos.
  const connection = await pool.getConnection();
  let locked = false, broken = false;
  try {
    const [[lock]] = await connection.execute("SELECT GET_LOCK(CONCAT('rieti-admin-', LEFT(SHA2(DATABASE(), 256), 32)), 5) AS acquired");
    if (Number(lock.acquired) !== 1) throw fail(503, 'El registro está ocupado. Intenta nuevamente.');
    locked = true;
    const [municipalities] = await connection.execute('SELECT id_municipio FROM Municipio WHERE id_municipio = ?', [values.municipalityId]);
    if (!municipalities.length) throw fail(400, 'El municipio seleccionado no existe.');
    const [duplicates] = await connection.execute(`SELECT ${account.id} FROM ${account.table} WHERE ${account.email} = ? OR nombre = ? LIMIT 1`, [values.email, values.name]);
    if (duplicates.length) throw fail(409, 'El correo o nombre de usuario ya existe.');
    const passwordHash = await bcrypt.hash(values.password, 10);
    const [result] = await connection.execute(`INSERT INTO ${account.table} (id_municipio, nombre, ${account.email}, contrasena${values.role === 'procurador' ? ', activo' : ''}) VALUES (?, ?, ?, ?${values.role === 'procurador' ? ', 1' : ''})`, [values.municipalityId, values.name, values.email, passwordHash]);
    return result.insertId;
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw fail(409, 'El correo o nombre de usuario ya existe.');
    throw error;
  } finally {
    if (locked) {
      try { await connection.execute("SELECT RELEASE_LOCK(CONCAT('rieti-admin-', LEFT(SHA2(DATABASE(), 256), 32)))"); }
      catch { broken = true; connection.destroy(); }
    }
    if (!broken) connection.release();
  }
}

const registerAdministrator = (pool, body) => registerAccount(pool, { ...body, role: 'administrador' });

function createAuth({ pool, loginLimit = 15, publicRegistrationOpen = () => false }) {
  async function loadUser(request) {
    if (request.auth) return request.auth;
    const identity = request.session?.identity;
    if (!identity) return null;
    const discard = async () => {
      await new Promise((resolve, reject) => request.session.destroy(error => error ? reject(error) : resolve()));
      return null;
    };
    if (typeof identity.role !== 'string' || !Object.hasOwn(accounts, identity.role) || !Number.isSafeInteger(identity.id)
      || identity.id < 1 || !Number.isFinite(identity.expiresAt) || identity.expiresAt <= Date.now()) return discard();
    const account = accounts[identity.role];
    const [rows] = await pool.execute(`SELECT ${account.id} AS id, id_municipio AS municipalityId,
      nombre AS name, ${account.email} AS email, contrasena AS passwordHash FROM ${account.table}
      WHERE ${account.id} = ?${account.active}`, [identity.id]);
    if (!rows.length || !Number.isSafeInteger(rows[0].municipalityId) || rows[0].municipalityId < 1
      || typeof rows[0].passwordHash !== 'string' || identity.passwordVersion !== passwordVersion(rows[0].passwordHash)) return discard();
    request.auth = publicUser({ ...rows[0], role: identity.role });
    return request.auth;
  }
  async function requireAuth(request, response, next) {
    try {
      if (!await loadUser(request)) return response.status(401).json({ success: false, error: 'Inicia sesión para continuar.' });
      next();
    } catch (error) { next(error); }
  }
  function requireAdmin(request, response, next) {
    if (request.auth.role !== 'administrador') return response.status(403).json({ success: false, error: 'Esta acción requiere una cuenta de administrador.' });
    next();
  }
  function protectWrites(request, response, next) {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return next();
    const origin = request.get('origin');
    const sameOrigin = `${request.protocol}://${request.get('host')}`;
    if (origin && origin !== sameOrigin && !isAllowedOrigin(origin, process.env.CORS_ORIGIN)) return response.status(403).json({ success: false, error: 'Origen no autorizado.' });
    if (!request.is('application/json')) return response.status(415).json({ success: false, error: 'La solicitud debe enviarse como JSON.' });
    next();
  }
  const loginLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: loginLimit, skipSuccessfulRequests: true, standardHeaders: 'draft-7', legacyHeaders: false,
    message: { success: false, error: 'Demasiados intentos. Espera unos minutos antes de volver a iniciar sesión.' } });
  const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false,
    message: { success: false, error: 'Demasiados registros. Intenta más tarde.' } });
  function mount(app) {
    app.use('/api/auth', protectWrites);
    app.get('/api/auth/registration', (request, response) => response.json({ publicRegistrationEnabled: publicRegistrationOpen() }));
    app.post('/api/auth/login', loginLimiter, async (request, response, next) => {
      try {
        const authentication = await authenticate(pool, request.body);
        const user = authentication.user;
        await new Promise((resolve, reject) => request.session.regenerate(error => error ? reject(error) : resolve()));
        const remember = request.body.remember === true;
        const duration = (remember ? 7 * 24 : 8) * 60 * 60 * 1000;
        request.session.identity = { id: user.id, role: user.role, passwordVersion: authentication.passwordVersion, expiresAt: Date.now() + duration };
        request.session.cookie.maxAge = remember ? duration : null;
        await new Promise((resolve, reject) => request.session.save(error => error ? reject(error) : resolve()));
        response.json({ success: true, user });
      } catch (error) { next(error); }
    });
    app.get('/api/auth/session', requireAuth, (request, response) => response.json({ success: true, user: request.auth, expiresAt: request.session.identity.expiresAt }));
    app.post('/api/auth/logout', (request, response, next) => {
      request.session.destroy(error => {
        if (error) return next(error);
        response.clearCookie(SESSION_COOKIE, { path: '/', httpOnly: true, sameSite: 'lax' });
        response.json({ success: true });
      });
    });
    app.get('/api/auth/accounts', requireAuth, requireAdmin, async (request, response, next) => {
      try {
        const [rows] = await pool.execute(`SELECT id_admin AS id, nombre AS name, email,
          id_municipio AS municipalityId, 'administrador' AS role FROM Administrador
          UNION ALL SELECT id_procurador, nombre, correo, id_municipio, 'procurador'
          FROM Procurador WHERE activo = 1 ORDER BY role, name, id`);
        response.json({ data: rows });
      } catch (error) { next(error); }
    });
    app.post('/api/auth/password', requireAuth, requireAdmin, registerLimiter, async (request, response, next) => {
      try {
        const { role, id, password } = request.body || {};
        if (typeof role !== 'string' || !Object.hasOwn(accounts, role) || !Number.isSafeInteger(id) || id < 1
          || typeof password !== 'string' || password.length < 8 || bcrypt.truncates(password)) throw fail(400, 'Selecciona una cuenta y una contraseña de al menos 8 caracteres y hasta 72 bytes.');
        const account = accounts[role];
        const [rows] = await pool.execute(`SELECT ${account.id} AS id FROM ${account.table} WHERE ${account.id} = ?${account.active}`, [id]);
        if (!rows.length) throw fail(404, 'Cuenta no encontrada.');
        const hash = await bcrypt.hash(password, 10);
        const [result] = await pool.execute(`UPDATE ${account.table} SET contrasena = ? WHERE ${account.id} = ?${account.active}`, [hash, id]);
        if (!result.affectedRows) throw fail(404, 'Cuenta no encontrada.');
        const reauthenticate = request.auth.role === role && request.auth.id === id;
        if (reauthenticate) {
          await new Promise((resolve, reject) => request.session.destroy(error => error ? reject(error) : resolve()));
          response.clearCookie(SESSION_COOKIE, { path: '/', httpOnly: true, sameSite: 'lax' });
        }
        response.json({ success: true, reauthenticate, message: 'Contraseña restablecida. Las sesiones anteriores de esa cuenta dejan de ser válidas.' });
      } catch (error) { next(error); }
    });
    const authorizeRegistration = (request, response, next) => {
      if (publicRegistrationOpen() && (request.body?.role === undefined || request.body.role === 'administrador')) return next();
      requireAuth(request, response, error => error ? next(error) : requireAdmin(request, response, next));
    };
    app.post('/api/auth/register', authorizeRegistration, registerLimiter, async (request, response, next) => {
      try {
        const id = await registerAccount(pool, request.body);
        const role = request.body.role === undefined ? 'administrador' : request.body.role;
        response.status(201).json({ success: true, role, message: `${role === 'administrador' ? 'Administrador' : 'Procurador'} registrado correctamente.`, [accounts[role].id]: id });
      } catch (error) { next(error); }
    });
  }
  return { mount, requireAuth, requireAdmin, loadUser, protectWrites };
}

module.exports = { createAuth, authenticate, registerAccount, registerAdministrator, registrationValues, SESSION_COOKIE };
