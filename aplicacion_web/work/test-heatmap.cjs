const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://localhost').pathname);fs.readFile(file,(err,data)=>{if(err)return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')||file.endsWith('.geojson')?'application/json':'text/html');res.end(data);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const geo=JSON.parse(fs.readFileSync(path.join(root,'assets/heatmap/data/municipios.geojson')));
 const f=geo.features.find(f=>f.properties.cvegeo==='15106');const [lng,lat]=f.geometry.coordinates[0][0][0];
 const fixture={municipios:geo.features.map(f=>({clave:f.properties.cvegeo,nombre:f.properties.nomgeo})),puntos:[{id:7,latitud:19.2826,longitud:-99.6557,prioridad:'Alta',fecha_registro:'2026-10-09'},{id:7,latitud:19.2827,longitud:-99.6558,prioridad:'Alta',fecha_registro:'2026-10-09'},{id:8,latitud:null,longitud:null},{id:9,latitud:0,longitud:0}]};
 let mode='normal';await page.route('**/api/mapa-calor',r=>mode==='error'?r.fulfill({status:500,json:{message:'Error'}}):r.fulfill({json:{data:mode==='empty'?{municipios:[],puntos:[]}:fixture}}));
 const url=`http://127.0.0.1:${server.address().port}/pages/mapa-calor.html`;
 await page.goto(url);await page.waitForFunction(()=>window.mapaCalor);
 assert.equal(await page.locator('#municipio option').count(),2);assert.equal(await page.locator('#total').textContent(),'1');assert.match(await page.locator('#status').textContent(),/2 excluidos/);
 const state=await page.evaluate(()=>{let gray=0,dots=[];window.mapaCalor.map.eachLayer(l=>{if(l.feature&&l.options.fillColor==='#d1d5db')gray++;if(l.options.pane==='dots'&&l.options.fillColor)dots.push({color:l.options.fillColor,text:l.getTooltip().getContent().textContent,href:l.getPopup().getContent().querySelector('a').getAttribute('href')});});return {gray,dots};});
 assert.equal(state.gray,124);assert.equal(state.dots.length,2);assert.equal(state.dots[0].text,'Folio 7 · Alta');assert.equal(state.dots[0].href,'reporte.html?id=7&from=mapa-calor');assert.equal(state.dots[0].color,'#e58027');
 await page.selectOption('#priority-filter','Urgente');assert.equal(await page.locator('#total').textContent(),'0');await page.selectOption('#priority-filter','');
 const count=await page.evaluate(()=>Object.keys(window.mapaCalor.map._layers).length);for(let i=0;i<3;i++){await page.selectOption('#mode','municipal');await page.selectOption('#mode','heat');await page.uncheck('#points');await page.check('#points');}assert.equal(await page.evaluate(()=>Object.keys(window.mapaCalor.map._layers).length),count);
 await page.selectOption('#municipio','15106');assert.equal(await page.locator('#selection-name').textContent(),'Toluca');await page.click('#reset');
 await page.screenshot({path:'/tmp/heatmap-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.screenshot({path:'/tmp/heatmap-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 mode='empty';await page.reload();await page.waitForFunction(()=>window.mapaCalor);assert.equal(await page.locator('#total').textContent(),'0');
 mode='error';await page.reload();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('No fue posible'));assert.equal(await page.locator('#map-controls').evaluate(node=>node.disabled),true);
 assert.deepEqual(errors,[]);console.log('OK: API, prioridades, folio/enlace, reportes únicos, municipios grises, filtros, capas, vacíos, errores y móvil.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
