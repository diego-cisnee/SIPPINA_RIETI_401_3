// Express real y base transaccional aislada: jamás conecta a RDS ni modifica reportes reales.
process.env.NODE_ENV='test';
const path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');const root=path.resolve(__dirname,'../../backend');
const bcrypt=require(path.join(root,'node_modules/bcryptjs'));
const session=require(path.join(root,'node_modules/express-session'));
const {createApplication}=require(path.join(root,'application'));
const {ReportPool}=require(path.join(root,'test-support/report-pool'));
(async()=>{
 const pool=new ReportPool(await bcrypt.hash('Clave-aislada-2026',4));
 const server=createApplication({pool,sessionSecret:'isolated-reports-browser-secret-more-than-thirty-two-characters',sessionStore:new session.MemoryStore(),publicAdminRegistrationUntil:''}).listen(0,'127.0.0.1');
 await new Promise((resolve,reject)=>server.once('listening',resolve).once('error',reject));
 const origin='http://127.0.0.1:'+server.address().port;
 let browser;
 try {
  browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({reducedMotion:'reduce'});const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(base=>{window.RIETI_API_BASE=base;},origin);
  await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  async function login(target,role='administrador'){
   await target.goto(origin+'/index.html');await target.selectOption('#role',role);
   await target.fill('#email',role==='administrador'?'admin@example.test':'proc@example.test');await target.fill('#password','Clave-aislada-2026');
   await target.click('#btn-login');await target.waitForURL('**/pages/dashboard.html');await target.evaluate(()=>window.RIETI_READY);
  }
  const ready=async(target,url)=>{await target.goto(origin+'/pages/'+url);await target.evaluate(()=>window.RIETI_READY);await target.locator('[data-report-row], [data-report-context]').first().waitFor({state:'visible'});};
  async function openStatus(target,id=1){
   const row=target.locator(`[data-report-row][data-report-id="${id}"]`);
   if(await row.count()){
    await row.locator('summary').scrollIntoViewIfNeeded();
    await target.waitForTimeout(150); // Dejar terminar el scroll que cierra menús de estadísticas.
    await row.locator('summary').click();await row.locator('[data-report-action="status"]').click();
   }
   else await target.locator('[data-report-action="status"]').click();
   await target.locator('#status-dialog').waitFor({state:'visible'});
  }
  async function submit(target,status,comments=''){
   await target.selectOption('#status-form [name="status"]',status);await target.fill('#status-form [name="comments"]',comments);
   await target.locator('#status-form [type="submit"]').click();
  }
  async function finish(target){
   await target.locator('#update-confirmation').waitFor({state:'visible'});
   await Promise.all([target.waitForEvent('load'),target.locator('#update-confirmation [data-close-dialog]').click()]);
   await target.evaluate(()=>window.RIETI_READY);
  }
  await login(page);
  assert.equal(await page.locator('[data-field="reports-total"]').first().textContent(),'2');
  // Dashboard guarda estado/prioridad/comentarios y refresca los indicadores al confirmar.
  await openStatus(page);await page.selectOption('#status-form [name="priority"]','Alta');
  await submit(page,'En_revision','Visita <img src=x onerror=alert(1)>\nSegunda línea');await finish(page);
  assert.equal(pool.reports[0].estatus,'En_revision');assert.equal(pool.histories.length,1);
  assert.equal(await page.locator('[data-field="reports-progress"]').textContent(),'1');
  await ready(page,'reporte.html?id=1');await page.waitForFunction(()=>document.querySelector('[data-report-history]').getAttribute('aria-busy')==='false');
  assert.match(await page.locator('[data-report-history]').textContent(),/Visita <img/);assert.equal(await page.locator('[data-report-history] img').count(),0);
  assert.match(await page.locator('[data-detail="updatedAt"]').textContent(),/18\/10\/2026/);
  assert.equal(await page.locator('#attachments-title, .evidence-spaces').count(),0);
  assert.doesNotMatch(await page.locator('main').textContent(),/Reporte consultado desde el servidor|Consulta de lectura/);
  assert.equal(await page.locator('[data-history-entry]').count(),1);
  await page.click('[data-history-filter="priority"]');assert.equal(await page.locator('[data-history-entry]').count(),1);
  await page.click('[data-history-filter="all"]');
  await page.route('**/api/reportes/1/historial',route=>route.fulfill({status:503,json:{error:'Error aislado'}}));
  await page.reload();await page.evaluate(()=>window.RIETI_HISTORY_READY);
  await page.locator('[data-history-retry]').waitFor({state:'visible'});
  await page.unroute('**/api/reportes/1/historial');await page.click('[data-history-retry]');
  await page.waitForFunction(()=>document.querySelector('[data-report-history]').getAttribute('aria-busy')==='false');
  assert.equal(await page.locator('[data-history-entry]').count(),1);
  // Error del servidor conserva lo escrito y no confirma cambios.
  pool.failAt='update';await openStatus(page);await submit(page,'Concluido','Conservar este comentario');
  await page.locator('#status-form [role="alert"]').waitFor({state:'visible'});
  assert.equal(await page.locator('#status-form [name="comments"]').inputValue(),'Conservar este comentario');
  assert.equal(await page.locator('#update-confirmation').isVisible(),false);assert.equal(pool.histories.length,1);
  pool.failAt=null;await page.locator('#status-dialog [data-close-dialog]').click();
  // Dos vistas abiertas: la segunda conserva el formulario y muestra el conflicto.
  const other=await context.newPage();other.on('pageerror',e=>errors.push(e.message));await ready(other,'reportes.html');
  await openStatus(other);await submit(other,'En_seguimiento','Cambio concurrente');await finish(other);assert.equal(pool.histories.length,2);
  await openStatus(page);await submit(page,'Concluido','No sobrescribir');
  await page.waitForFunction(()=>document.querySelector('#status-form [role="alert"]').textContent.includes('cambió'));
  assert.equal(await page.locator('#status-form [name="comments"]').inputValue(),'No sobrescribir');assert.equal(pool.histories.length,2);
  await page.locator('#status-dialog [data-close-dialog]').click();await other.close();
  // Gestión utiliza la misma acción real.
  await ready(page,'reportes.html');await openStatus(page);await submit(page,'Canalizado','Canalización administrativa');await finish(page);
  assert.equal(pool.histories.length,3);
  await page.locator('[data-filter="municipality"]').waitFor({state:'visible'});
  assert.equal(await page.locator('[data-filter="municipality"]').isVisible(),true,'Admin conserva Municipio');
  // El procurador solo ve su reporte; actualiza sin enviar prioridad ni mostrar eliminación.
  const procContext=await browser.newContext({reducedMotion:'reduce'});await procContext.addInitScript(base=>{window.RIETI_API_BASE=base;},origin);
  await procContext.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  const proc=await procContext.newPage();proc.on('pageerror',e=>errors.push(e.message));await login(proc,'procurador');
  assert.equal(await proc.locator('[data-report-row]').count(),1);assert.equal(await proc.locator('[data-delete-report]:visible').count(),0);
  assert.equal(await proc.locator('[data-field="reports-other"]').textContent(),'0','Dashboard del procurador');
  await ready(proc,'reportes.html');
  assert.equal(await proc.locator('[data-field="reports-other"]').textContent(),'0','Gestión del procurador');
  assert.equal(await proc.locator('[data-filter="municipality"]').isVisible(),false,'Procurador sin filtro Municipio');
  for(const filter of ['status','priority','start-date','end-date'])assert.equal(await proc.locator(`[data-filter="${filter}"]`).isVisible(),true);
  await ready(proc,'reporte.html?id=1');await openStatus(proc);
  assert.equal(await proc.locator('#status-form [name="priority"]').isVisible(),false);
  await submit(proc,'Concluido','Seguimiento del procurador');await finish(proc);
  await proc.waitForFunction(()=>document.querySelector('[data-report-history]').getAttribute('aria-busy')==='false');
  assert.equal(pool.histories.at(-1).id_procurador,2);assert.equal(pool.histories.at(-1).id_administrador,null);
  assert.equal(pool.reports[0].prioridad,'Alta');assert.match(await proc.locator('[data-report-history]').textContent(),/Procurador aislado/);
  await openStatus(proc);await submit(proc,'Concluido','Documentación recibida');await finish(proc);
  pool.histories[0].modificacion_fecha='17/10/2026 13:00:00'; // Solo la base aislada: comprobar agrupación de dos fechas.
  await proc.reload();await proc.evaluate(()=>window.RIETI_HISTORY_READY);
  assert.equal(await proc.locator('.history-date').count(),2);
  for(const [filter,expected] of [['status',4],['priority',1],['comment',5],['all',5]]){
   await proc.click(`[data-history-filter="${filter}"]`);assert.equal(await proc.locator('[data-history-entry]').count(),expected);
   assert.equal(await proc.locator(`[data-history-filter="${filter}"]`).getAttribute('aria-pressed'),'true');
  }
  for(const width of [1440,390,320]){
   await proc.setViewportSize({width,height:950});assert.equal(await proc.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Historial a '+width+'px');
   if(width!==320){
    await proc.locator('.history-panel').screenshot({path:`/tmp/rieti-history-${width}.png`});
    await proc.screenshot({path:`/tmp/rieti-detail-${width}.png`,fullPage:true});
   }
  }
  await procContext.close();
  await ready(page,'reporte.html?id=2');await page.evaluate(()=>window.RIETI_HISTORY_READY);
  assert.equal(await page.locator('[data-history-entry]').count(),0);assert.match(await page.locator('[data-history-message]').textContent(),/todavía no tiene movimientos/);
  // Una baja fallida conserva el reporte; después la baja real lo retira del listado.
  await ready(page,'reportes.html');let row=page.locator('[data-report-row][data-report-id="1"]');
  await row.locator('summary').click();await row.locator('[data-delete-report]').click();
  await page.check('#delete-acknowledgement');pool.failAt='insert';await page.click('[data-confirm-delete]');
  await page.locator('#delete-report-form [role="alert"]').waitFor({state:'visible'});assert.equal(pool.reports[0].active,1);
  pool.failAt=null;await Promise.all([page.waitForEvent('load'),page.click('[data-confirm-delete]')]);await page.evaluate(()=>window.RIETI_READY);
  assert.equal(pool.reports[0].active,0);assert.equal(await page.locator('[data-report-row]').count(),1);assert.equal(pool.histories.length,6);
  assert.deepEqual(errors,[]);
  console.log('OK: Dashboard, Gestión y detalle; guardados, historial, autores, errores sin pérdida, conflicto entre vistas, permisos, baja lógica y responsive. Cero escrituras en RDS.');
 } finally {await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
