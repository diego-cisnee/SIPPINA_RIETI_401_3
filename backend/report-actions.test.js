process.env.NODE_ENV='test';
const {test}=require('node:test');const assert=require('node:assert/strict');
const bcrypt=require('bcryptjs');const session=require('express-session');
const {createApplication}=require('./application');const {ReportPool}=require('./test-support/report-pool');
const {changeReport}=require('./report-actions');
const admin={role:'administrador',id:1,municipalityId:11};
const procurator={role:'procurador',id:2,municipalityId:22};
async function setup(t){
 const pool=new ReportPool(await bcrypt.hash('Clave-aislada-2026',4));
 const server=createApplication({pool,sessionSecret:'isolated-reports-secret-over-thirty-two-characters',sessionStore:new session.MemoryStore(),publicAdminRegistrationUntil:''}).listen(0,'127.0.0.1');
 await new Promise((resolve,reject)=>server.once('listening',resolve).once('error',reject));
 t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
 const base='http://127.0.0.1:'+server.address().port;
 const call=async(route,{cookie,body,...options}={})=>{
  const response=await fetch(base+route,{...options,headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(cookie?{cookie}:{}),...options.headers},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,data:await response.json()};
 };
 const login=async(role='administrador')=>{
  const response=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role,user:role==='administrador'?'admin@example.test':'proc@example.test',pwrd:'Clave-aislada-2026'})});
  assert.equal(response.status,200);const cookie=response.headers.get('set-cookie').split(';')[0];await response.json();return cookie;
 };
 return {pool,call,login,base};
}
test('Acciones exigen sesión, autor del servidor y alcance municipal; procurador no modifica prioridad ni elimina',async t=>{
 const {pool,call,login}=await setup(t);const version=pool.version(pool.reports[0]);
 for(const [route,method,body] of [['/api/reportes/1/historial','GET'],['/api/reportes/1/estado','PATCH',{version,status:'Concluido'}],['/api/reportes/1','DELETE',{version}]])assert.equal((await call(route,{method,body})).status,401);
 const cookie=await login('procurador');
 assert.equal((await call('/api/reportes/2/historial',{cookie})).status,404);
 assert.equal((await call('/api/reportes/2/estado',{cookie,method:'PATCH',body:{version,status:'Concluido'}})).status,404);
 assert.equal((await call('/api/reportes/1',{cookie,method:'DELETE',body:{version}})).status,403);
 assert.equal((await call('/api/reportes/1/estado',{cookie,method:'PATCH',body:{version,status:'Concluido',priority:'Alta'}})).status,403);
 assert.equal(pool.histories.length,0);
});
test('Cambio de admin conserva copia anterior completa, autor real y descripción, y se refleja al consultar',async t=>{
 const {pool,call,login}=await setup(t);const cookie=await login();const original={...pool.reports[0]};
 const body={version:pool.version(original),status:'En_revision',priority:'Alta',comments:'Visita\n<texto>'};
 assert.equal((await call('/api/reportes/1/estado',{cookie,method:'PATCH',body})).status,200);
 const history=pool.histories[0];
 for(const field of ['id_usuario','id_municipio','estatus','descripcion','fecha','prioridad','imagen_url','folio'])assert.equal(history[field],original[field]);
 assert.equal(history.id_administrador,1);assert.equal(history.id_procurador,null);assert.equal(history.comentarios,body.comments);
 assert.equal(pool.reports[0].id_administrador,999);assert.equal(pool.reports[0].descripcion,original.descripcion);
 const read=await call('/api/reportes/1',{cookie});assert.equal(read.data.data.status,'En_revision');assert.equal(read.data.data.priority,'Alta');assert.notEqual(read.data.data.version,body.version);
 assert.ok(read.data.data.updatedAt);
});
test('Historial enlaza estados y prioridades, conserva ambos autores y admite seguimiento por comentario',async t=>{
 const {pool,call,login}=await setup(t);const cookie=await login();
 await changeReport(pool,'1',admin,{version:pool.version(pool.reports[0]),status:'En_revision',priority:'Alta'});
 await changeReport(pool,'1',procurator,{version:pool.version(pool.reports[0]),status:'Concluido',comments:'Atendido'});
 await changeReport(pool,'1',procurator,{version:pool.version(pool.reports[0]),status:'Concluido',comments:'Documentación recibida'});
 const response=await call('/api/reportes/1/historial',{cookie});assert.equal(response.status,200);
 const entries=response.data.data;assert.equal(entries.length,3);
 assert.deepEqual(entries.map(e=>[e.previousStatus,e.status]),[['Concluido','Concluido'],['En_revision','Concluido'],['Registrado','En_revision']]);
 assert.equal(entries[0].actor.role,'procurador');assert.equal(entries[0].actor.id,2);assert.equal(entries[2].actor.role,'administrador');
 assert.equal(entries[1].previousPriority,'Alta');assert.equal(entries[1].priority,'Alta');assert.equal(pool.histories[1].id_administrador,null);
});
test('Concurrencia y reintentos con versión anterior no sobrescriben ni duplican historial',async t=>{
 const {pool}=await setup(t);const body={version:pool.version(pool.reports[0]),status:'En_revision'};
 const results=await Promise.allSettled([changeReport(pool,'1',admin,body),changeReport(pool,'1',procurator,{...body,status:'Concluido'})]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.status,409);assert.equal(pool.histories.length,1);
 await assert.rejects(changeReport(pool,'1',admin,body),{status:409});assert.equal(pool.histories.length,1);
});
for(const failAt of ['insert','update','commit'])test('Fallo en '+failAt+' revierte reporte e historial y libera conexión',async t=>{
 const {pool}=await setup(t);const original=structuredClone(pool.reports);pool.failAt=failAt;
 await assert.rejects(changeReport(pool,'1',admin,{version:pool.version(pool.reports[0]),status:'Concluido'}));
 assert.deepEqual(pool.reports,original);assert.equal(pool.histories.length,0);assert.equal(pool.released,1);
});
test('Baja lógica solo cambia active, conserva historial y excluye listado, detalle y nuevas acciones',async t=>{
 const {pool,call,login}=await setup(t);const cookie=await login();const original={...pool.reports[0]};const body={version:pool.version(original)};
 assert.equal((await call('/api/reportes/1',{cookie,method:'DELETE',body})).status,200);
 assert.deepEqual(pool.reports[0],{...original,active:0});assert.equal(pool.histories.length,1);assert.equal(pool.histories[0].id_administrador,1);
 assert.equal((await call('/api/reportes',{cookie})).data.data.length,1);
 for(const route of ['/api/reportes/1','/api/reportes/1/historial'])assert.equal((await call(route,{cookie})).status,404);
 assert.equal((await call('/api/reportes/1',{cookie,method:'DELETE',body})).status,404);assert.equal(pool.histories.length,1);
 assert.ok(pool.calls.every(c=>!/^DELETE\b/.test(c.sql)));
});
test('Validación y evidencia larga no alteran registros; un reporte sin historial responde vacío',async t=>{
 const {pool,call,login}=await setup(t);const cookie=await login();
 assert.deepEqual((await call('/api/reportes/1/historial',{cookie})).data.data,[]);
 const valid={version:pool.version(pool.reports[0]),status:'Concluido'};
 for(const change of [{version:''},{status:'Inventado'},{priority:'Urgente'},{comments:'a'.repeat(2001)},{id_administrador:12}]){
  assert.equal((await call('/api/reportes/1/estado',{cookie,method:'PATCH',body:{...valid,...change}})).status,400);
 }
 assert.equal((await call('/api/reportes/1/estado',{cookie,method:'PATCH',body:{...valid,status:'Registrado'}})).status,400);
 pool.reports[0].imagen_url='a'.repeat(256);
 await assert.rejects(changeReport(pool,'1',admin,{version:pool.version(pool.reports[0]),status:'Concluido'}),{status:409});assert.equal(pool.histories.length,0);
 pool.reports[0].imagen_url='a'.repeat(255);
 await changeReport(pool,'1',admin,{version:pool.version(pool.reports[0]),status:'Concluido'});assert.equal(pool.histories[0].imagen_url.length,255);
});
test('Rutas de escritura rechazan otros orígenes y solicitudes sin JSON',async t=>{
 const {call,login}=await setup(t);const cookie=await login();
 assert.equal((await call('/api/reportes/1/estado',{cookie,method:'PATCH',body:{},headers:{origin:'https://untrusted.example'}})).status,403);
 assert.equal((await call('/api/reportes/1',{cookie,method:'DELETE'})).status,415);
});
