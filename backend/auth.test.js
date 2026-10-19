// Pruebas aisladas: esta base en memoria nunca se conecta a RDS ni crea cuentas reales.
process.env.NODE_ENV = 'test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const { createApplication } = require('./application');
const { registerAdministrator } = require('./auth');
const secret = 'test-only-secret-with-more-than-thirty-two-characters';
const password = 'Clave-aislada-2026';
let server, base, pool, store;

const { IsolatedPool } = require('./test-support/isolated-pool');

async function request(url, { cookie, body, origin, ...options } = {}) {
  const headers = { ...options.headers };
  if (cookie) headers.cookie = cookie;
  if (origin) headers.origin = origin;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(base + url, { ...options, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
  return response;
}
async function login(role = 'administrador', cookie) {
  const response = await request('/api/auth/login', { method: 'POST', cookie, body: { role, user: role === 'administrador' ? 'admin@example.test' : 'proc@example.test', pwrd: password } });
  assert.equal(response.status, 200);
  const sessionCookie = response.headers.get('set-cookie').split(';')[0];
  return { response, cookie: sessionCookie, data: await response.json() };
}
before(async () => {
  pool = new IsolatedPool(await bcrypt.hash(password, 4)); store = new session.MemoryStore();
  server = createApplication({ pool, sessionSecret: secret, sessionStore: store, loginLimit: 100 }).listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => server.once('listening', resolve).once('error', reject));
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); store.clear(); });

test('Rutas privadas rechazan acceso anónimo y el HTML vuelve al login', async () => {
  for (const path of ['/api/auth/session','/api/reportes','/api/reportes/1','/api/reportes/1/coincidencias','/api/mapa-calor','/api/rendimiento','/api/municipios','/test-db']) assert.equal((await request(path)).status,401,path);
  const page = await request('/pages/dashboard.html'); assert.equal(page.status,302); assert.equal(page.headers.get('location'),'/index.html');
  assert.equal((await request('/api/auth/register',{method:'POST',body:{}})).status,401);
});
test('Registro público temporal permite alta y login, y el vencimiento vuelve a cerrar la página y el POST', async t => {
  const isolated = new IsolatedPool(await bcrypt.hash(password, 4));
  const deadline = Date.now() + 60000;
  const temporary = createApplication({pool:isolated,sessionSecret:secret,sessionStore:new session.MemoryStore(),publicAdminRegistrationUntil:new Date(deadline).toISOString()}).listen(0,'127.0.0.1');
  await new Promise((resolve,reject)=>temporary.once('listening',resolve).once('error',reject));
  const origin='http://127.0.0.1:'+temporary.address().port;
  const call=(route,options={})=>fetch(origin+route,{redirect:'manual',...options});
  const post=body=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  try {
    assert.equal((await (await call('/api/auth/registration')).json()).publicRegistrationEnabled,true);
    assert.equal((await call('/pages/registro.html')).status,200);
    assert.equal((await call('/api/auth/registration/municipios')).status,200);
    for(const route of ['/api/reportes','/api/auth/accounts','/api/municipios']) assert.equal((await call(route)).status,401);
    assert.equal((await call('/api/auth/password',post({}))).status,401);
    const body={nombre:'Alta pública aislada',email:'public@example.test',contrasena:'Clave-publica-2026',id_municipio:11};
    assert.equal((await call('/api/auth/register',post({...body,role:'procurador'}))).status,401);
    assert.equal((await call('/api/auth/register',post(body))).status,201);
    assert.equal(await bcrypt.compare(body.contrasena,isolated.admins.at(-1).passwordHash),true);
    assert.equal((await call('/api/auth/login',post({user:body.email,pwrd:body.contrasena,role:'administrador'}))).status,200);
    t.mock.method(Date,'now',()=>deadline+1);
    assert.equal((await (await call('/api/auth/registration')).json()).publicRegistrationEnabled,false);
    assert.equal((await call('/api/auth/registration/municipios')).status,403);
    assert.equal((await call('/pages/registro.html')).status,302);
    assert.equal((await call('/api/auth/register',post(body))).status,401);
  } finally {t.mock.restoreAll();temporary.closeAllConnections();await new Promise(resolve=>temporary.close(resolve));}
});
test('Login bcrypt, sesión HttpOnly, identidad segura y nombre de usuario compatibles', async () => {
  const { response, cookie, data } = await login();
  assert.match(response.headers.get('set-cookie'), /HttpOnly/); assert.match(response.headers.get('set-cookie'), /SameSite=Lax/);
  assert.equal(data.user.role,'administrador'); assert.equal(data.user.id,1); assert.ok(!JSON.stringify(data).includes('passwordHash'));
  const sessionResponse=await request('/api/auth/session',{cookie}); assert.equal(sessionResponse.status,200);
  assert.equal((await sessionResponse.json()).user.email,'admin@example.test');
  const byName=await request('/api/auth/login',{method:'POST',body:{role:'administrador',user:'Cuenta aislada',pwrd:password}}); assert.equal(byName.status,200);
  const missing=await request('/api/auth/login',{method:'POST',body:{role:'administrador',user:'ausente',pwrd:password}});
  const wrong=await request('/api/auth/login',{method:'POST',body:{role:'administrador',user:'admin@example.test',pwrd:'incorrecta'}});
  assert.equal(missing.status,401); assert.deepEqual(await missing.json(),await wrong.json());
  assert.equal((await request('/api/auth/login',{method:'POST',body:{role:'__proto__',user:'admin@example.test',pwrd:password}})).status,400);
});
test('Regenerar sesión elimina la anterior y logout impide reutilizar la cookie', async () => {
  const first=await login(); const second=await login('procurador',first.cookie);
  assert.notEqual(first.cookie,second.cookie);
  assert.equal((await request('/api/auth/session',{cookie:first.cookie})).status,401);
  assert.equal((await request('/api/auth/logout',{method:'POST',cookie:second.cookie,body:{}})).status,200);
  assert.equal((await request('/api/auth/session',{cookie:second.cookie})).status,401);
});
test('Procurador activo: municipio del servidor, acceso administrativo prohibido y baja revoca acceso', async () => {
  const {cookie}=await login('procurador');
  assert.equal((await request('/api/auth/register',{method:'POST',cookie,body:{}})).status,403);
  assert.equal((await request('/api/municipios',{cookie})).status,403);
  assert.equal((await request('/pages/registro.html',{cookie})).status,403);
  pool.calls=[];
  for(const path of ['/api/reportes?id_municipio=11&role=administrador','/api/reportes/99','/api/reportes/99/coincidencias','/api/mapa-calor','/api/rendimiento']) await request(path,{cookie});
  for(const call of pool.calls.filter(call=>call.sql.includes('FROM Reporte')||call.sql.includes('FROM Municipio m'))) {
    assert.match(call.sql,/id_municipio = \?/); assert.equal(call.args.at(-1),22);
  }
  pool.procurators[0].municipalityId=11; pool.calls=[];
  await request('/api/reportes?id_municipio=22',{cookie});
  assert.equal(pool.calls.find(call=>call.sql.includes('FROM Reporte')).args.at(-1),11);
  pool.procurators[0].municipalityId=22;
  pool.procurators[0].active=false;
  assert.equal((await request('/api/auth/session',{cookie})).status,401);
  pool.procurators[0].active=true;
  assert.equal((await request('/api/auth/session',{cookie})).status,401);
});
test('Registro autorizado persiste únicamente un hash bcrypt y mantiene la sesión del autor', async () => {
  const {cookie}=await login();
  const body={nombre:'Alta aislada',email:'alta@example.test',contrasena:'Nueva-clave-2026',id_municipio:11,role:'administrador'};
  const response=await request('/api/auth/register',{method:'POST',cookie,body}); assert.equal(response.status,201);
  const created=pool.admins.find(row=>row.email===body.email);
  assert.notEqual(created.passwordHash,body.contrasena); assert.equal(await bcrypt.compare(body.contrasena,created.passwordHash),true);
  assert.equal((await (await request('/api/auth/session',{cookie})).json()).user.id,1);
  const duplicate=await request('/api/auth/register',{method:'POST',cookie,body}); assert.equal(duplicate.status,409);
  const newLogin=await request('/api/auth/login',{method:'POST',body:{role:'administrador',user:body.email,pwrd:body.contrasena}}); assert.equal(newLogin.status,200);
});
test('Administrador registra procurador activo con bcrypt y municipio; el nuevo acceso conserva su rol restringido', async () => {
  const {cookie}=await login();
  const body={nombre:'Nuevo procurador aislado',email:'nuevo-proc@example.test',contrasena:'Clave-procurador-2026',id_municipio:22,role:'procurador'};
  const response=await request('/api/auth/register',{method:'POST',cookie,body});
  assert.equal(response.status,201);
  const result=await response.json();
  const created=pool.procurators.find(row=>row.email===body.email);
  assert.equal(result.id_procurador,created.id);assert.equal(result.role,'procurador');assert.equal(created.active,true);
  assert.equal(created.municipalityId,22);assert.equal(await bcrypt.compare(body.contrasena,created.passwordHash),true);
  assert.equal(pool.admins.some(row=>row.email===body.email),false);
  assert.equal((await request('/api/auth/register',{method:'POST',cookie,body})).status,409);
  const access=await request('/api/auth/login',{method:'POST',body:{role:'procurador',user:body.email,pwrd:body.contrasena}});
  assert.equal(access.status,200);assert.equal((await access.json()).user.municipalityId,22);
  const procCookie=access.headers.get('set-cookie').split(';')[0];
  assert.equal((await request('/api/auth/register',{method:'POST',cookie:procCookie,body:{...body,email:'no@example.test'}})).status,403);
  assert.equal((await (await request('/api/auth/session',{cookie})).json()).user.role,'administrador');
});
test('Validación: límites reales, municipio inexistente, bcrypt sin truncamiento y JSON inválido', async () => {
  const {cookie}=await login();
  const valid={nombre:'No persistir',email:'no@example.test',contrasena:'Clave-valida-2026',id_municipio:11};
  const before=pool.admins.length;
  for(const change of [{role:'otro'},{role:[]},{role:'procurador',nombre:'x'.repeat(151)},{role:'procurador',email:'x'.repeat(250)+'@x.test'},{nombre:'x'.repeat(51)},{email:'x'.repeat(45)+'@x.test'},{contrasena:'é'.repeat(37)},{contrasena:'corta'},{id_municipio:true},{id_municipio:999}]) {
    assert.equal((await request('/api/auth/register',{method:'POST',cookie,body:{...valid,...change}})).status,400);
  }
  assert.equal(pool.admins.length,before);
  assert.equal((await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'})).status,400);
  assert.equal((await request('/api/auth/logout',{method:'POST',cookie,origin:'https://untrusted.example',body:{}})).status,403);
  assert.equal((await request('/api/auth/logout',{method:'POST',cookie})).status,415);
});
test('Altas simultáneas no duplican correo aunque Administrador carezca de índice único', async () => {
  const body={nombre:'Concurrente aislada',email:'concurrente@example.test',contrasena:'Clave-concurrente',id_municipio:11};
  const results=await Promise.allSettled([registerAdministrator(pool,body),registerAdministrator(pool,body)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
  assert.equal(pool.admins.filter(row=>row.email===body.email).length,1);
});
test('El limitador detiene intentos repetidos', async () => {
  const limited=createApplication({pool,sessionSecret:secret,sessionStore:new session.MemoryStore(),loginLimit:2}).listen(0,'127.0.0.1');
  await new Promise((resolve,reject)=>limited.once('listening',resolve).once('error',reject));
  try {
    const url='http://127.0.0.1:'+limited.address().port+'/api/auth/login';
    const options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'administrador',user:'ausente',pwrd:password})};
    assert.equal((await fetch(url,options)).status,401); assert.equal((await fetch(url,options)).status,401);
    assert.equal((await fetch(url,options)).status,429);
  } finally {limited.closeAllConnections();await new Promise(resolve=>limited.close(resolve));}
});

test('Lista de cuentas solo para admin, sin hashes, y sesión expirada rechazada', async () => {
  const {cookie}=await login();
  const data=await (await request('/api/auth/accounts',{cookie})).json();
  assert.ok(data.data.some(row=>row.role==='procurador'));
  assert.ok(!JSON.stringify(data).includes('passwordHash'));
  assert.equal((await request('/api/auth/accounts')).status,401);
  const signature=require('cookie-signature');
  const sid=signature.unsign(decodeURIComponent(cookie.slice(cookie.indexOf('=')+1)).slice(2),secret);
  const value=await new Promise((resolve,reject)=>store.get(sid,(error,data)=>error?reject(error):resolve(data)));
  value.identity.expiresAt=Date.now()-1;
  await new Promise((resolve,reject)=>store.set(sid,value,error=>error?reject(error):resolve()));
  assert.equal((await request('/api/auth/session',{cookie})).status,401);
});
test('Restablecimiento autorizado convierte formato desconocido a bcrypt y revoca sesiones previas', async () => {
  const admin=await login(), procurator=await login('procurador');
  const unauthorized=await request('/api/auth/password',{method:'POST',cookie:procurator.cookie,body:{role:'administrador',id:1,password:'No-permitida-2026'}});
  assert.equal(unauthorized.status,403);
  pool.procurators[0].passwordHash='formato-desconocido-aislado';
  assert.equal((await request('/api/auth/login',{method:'POST',body:{role:'procurador',user:'proc@example.test',pwrd:password}})).status,401);
  const response=await request('/api/auth/password',{method:'POST',cookie:admin.cookie,body:{role:'procurador',id:2,password:'Restablecida-2026'}});
  assert.equal(response.status,200);assert.equal((await response.json()).reauthenticate,false);
  assert.equal(await bcrypt.compare('Restablecida-2026',pool.procurators[0].passwordHash),true);
  assert.equal((await request('/api/auth/session',{cookie:procurator.cookie})).status,401);
  assert.equal((await request('/api/auth/login',{method:'POST',body:{role:'procurador',user:'proc@example.test',pwrd:'Restablecida-2026'}})).status,200);
  const self=await request('/api/auth/password',{method:'POST',cookie:admin.cookie,body:{role:'administrador',id:1,password:'Admin-nueva-2026'}});
  assert.equal(self.status,200);assert.equal((await self.json()).reauthenticate,true);
  assert.equal((await request('/api/auth/session',{cookie:admin.cookie})).status,401);
});
test('Sesión persistente cifrada sobrevive un reinicio con el mismo secreto', async () => {
  const FileStore=require('session-file-store')(session);
  const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'rieti-session-test-'));
  const isolated=new IsolatedPool(await bcrypt.hash(password,4));
  let application;
  const launch=async()=>{
    application=createApplication({pool:isolated,sessionSecret:secret,sessionStore:new FileStore({path:directory,secret,reapInterval:-1,retries:0,logFn:()=>{}})}).listen(0,'127.0.0.1');
    await new Promise((resolve,reject)=>application.once('listening',resolve).once('error',reject));
    return 'http://127.0.0.1:'+application.address().port;
  };
  const close=async()=>{application.closeAllConnections();await new Promise(resolve=>application.close(resolve));application=null;};
  try {
    let origin=await launch();
    const response=await fetch(origin+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'administrador',user:'admin@example.test',pwrd:password,remember:true})});
    assert.equal(response.status,200);
    const cookie=response.headers.get('set-cookie').split(';')[0];
    await response.json();
    const files=await fs.readdir(directory);assert.ok(files.length>0);
    for(const file of files) assert.ok(!(await fs.readFile(path.join(directory,file),'utf8')).includes('identity'));
    await close();origin=await launch();
    // Consumir cada respuesta: Express termina el touch del archivo antes de
    // finalizarla; cerrar solo al recibir cabeceras deja escrituras pendientes.
    for (const [route, options, status] of [
      ['/api/auth/session', {headers:{cookie}}, 200],
      ['/api/auth/logout', {method:'POST',headers:{cookie,'Content-Type':'application/json'},body:'{}'}, 200],
      ['/api/auth/session', {headers:{cookie}}, 401],
    ]) {
      const result=await fetch(origin+route,options);
      assert.equal(result.status,status);await result.json();
    }
  } finally {if(application)await close();await fs.rm(directory,{recursive:true,force:true});}
});

test('Cookie segura cuando el proxy local informa HTTPS en producción', async () => {
  const isolated=new IsolatedPool(await bcrypt.hash(password,4));
  process.env.NODE_ENV='production';
  let app;
  try { app=createApplication({pool:isolated,sessionSecret:secret,sessionStore:new session.MemoryStore()}); }
  finally { process.env.NODE_ENV='test'; }
  const local=app.listen(0,'127.0.0.1');
  await new Promise((resolve,reject)=>local.once('listening',resolve).once('error',reject));
  try {
    const response=await fetch('http://127.0.0.1:'+local.address().port+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-Proto':'https'},body:JSON.stringify({role:'administrador',user:'admin@example.test',pwrd:password})});
    assert.equal(response.status,200);assert.match(response.headers.get('set-cookie'),/; Secure/);
  } finally {local.closeAllConnections();await new Promise(resolve=>local.close(resolve));}
});
