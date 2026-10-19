// Solo renderizado de promedios con datos aislados. SQL real: verify-resolution-readonly.cjs.
const {useAuthenticatedFixture}=require('./auth-fixture.cjs');
const {chromium}=require('playwright');const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const fsp=require('node:fs/promises');const root=path.resolve(__dirname,'..'),day=86400;
const baseRow={authorityId:1,authorityCount:1,authority:'Procurador aislado',pending:0,progress:0,efficiency:100};
const data=[
 {...baseRow,municipalityId:1,municipality:'Municipio A',total:9,progress:1,resolved:8,measuredResolved:2,resolutionSeconds:6*day,averageDays:3},
 {...baseRow,municipalityId:2,municipality:'Municipio B',total:4,resolved:4,measuredResolved:4,resolutionSeconds:5.5*day,averageDays:1.375},
 {...baseRow,municipalityId:3,municipality:'Municipio sin fecha',total:1,resolved:1,measuredResolved:0,resolutionSeconds:0,averageDays:null},
];
(async()=>{
 const server=http.createServer((req,res)=>{
  const file=path.join(root,new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  fs.readFile(file,(error,buffer)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(buffer);});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try {
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({acceptDownloads:true});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));await useAuthenticatedFixture(page);
  let records=data;
  await page.route('**/api/rendimiento',route=>route.fulfill({json:{data:records}}));
  const ready=async()=>{await page.goto(`http://127.0.0.1:${server.address().port}/pages/rendimiento.html`);await page.evaluate(()=>window.RIETI_PERFORMANCE_READY);await page.waitForFunction(()=>!document.body.hasAttribute('data-report-loading'));};
  await ready();
  assert.equal(await page.locator('[data-performance-metric="average"]').textContent(),'1.92 días','Promedio ponderado por reportes con fecha, no promedio de municipios');
  assert.equal(await page.locator('[data-performance-average-note]').textContent(),'6 de 13 concluidos con fecha registrada');
  assert.equal(await page.locator('[data-municipality-id="1"] td').nth(5).textContent(),'3 días');
  assert.equal(await page.locator('[data-municipality-id="2"] td').nth(5).textContent(),'1.38 días');
  assert.equal(await page.locator('[data-municipality-id="3"] td').nth(5).textContent(),'No disponible');
  await page.fill('#municipality-search','Municipio B');assert.equal(await page.locator('[data-performance-metric="average"]').textContent(),'1.38 días');
  await page.fill('#municipality-search','sin fecha');assert.equal(await page.locator('[data-performance-metric="average"]').textContent(),'No disponible');
  await page.click('#clear-municipality');
  const downloadPromise=page.waitForEvent('download');await page.click('[data-action="download-performance"]');const download=await downloadPromise;const csv=await fsp.readFile(await download.path(),'utf8');
  assert.match(csv,/Tiempo promedio \(días\)/);assert.match(csv,/"1\.375","4"/);assert.match(csv,/"No disponible","0"/);
  await page.fill('#municipality-search','No existe');assert.equal(await page.locator('[data-performance-metric="average"]').textContent(),'No disponible');
  // El dashboard usa TODOS los municipios de la sesión y pondera por reporte.
  await page.route('**/api/reportes',route=>route.fulfill({json:{data:[]}}));
  await page.route('**/api/mapa-calor',route=>route.fulfill({json:{data:{municipios:[],puntos:[]}}}));
  const dashboard=async()=>{
   await page.goto(`http://127.0.0.1:${server.address().port}/pages/dashboard.html`);
   await page.evaluate(()=>window.RIETI_DASHBOARD_METRICS_READY);
   await page.evaluate(()=>window.RIETI_READY);
  };
  await dashboard();
  assert.equal(await page.locator('[data-field="average-resolution-days"]').textContent(),'1.92 días');
  assert.equal(await page.locator('.kpi-stack small').count(),0);
  for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Dashboard a '+width+'px');}
  records=[data[2]];await dashboard();assert.equal(await page.locator('[data-field="average-resolution-days"]').textContent(),'No disponible');
  records=[];await dashboard();assert.equal(await page.locator('[data-field="average-resolution-days"]').textContent(),'No disponible');
  await page.route('**/api/rendimiento',route=>route.fulfill({status:503,json:{error:'Error aislado'}}));
  await dashboard();assert.equal(await page.locator('[data-field="average-resolution-days"]').textContent(),'No disponible');
  await page.unroute('**/api/rendimiento');
  await page.route('**/api/rendimiento',route=>route.fulfill({json:{data:records}}));
  records=[{...data[0],total:1,progress:0,resolved:1,measuredResolved:1,resolutionSeconds:0,averageDays:0},
   {...data[1],total:1,resolved:1,measuredResolved:1,resolutionSeconds:300,averageDays:300/day}];
  await ready();assert.equal(await page.locator('[data-municipality-id="1"] td').nth(5).textContent(),'0 días');assert.equal(await page.locator('[data-municipality-id="2"] td').nth(5).textContent(),'<0.01 días');
  for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Desbordamiento a '+width+'px');}
  assert.deepEqual(errors,[]);
  console.log('OK: días por municipio, promedio ponderado, cobertura, filtros, CSV, cero días, fracciones pequeñas y responsive. Sin escrituras en RDS.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
