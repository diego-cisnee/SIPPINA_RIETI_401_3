// Datos exclusivos de prueba; no se incorporan al dashboard.
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const reports = [
 { id_reporte: 1, status: 'Resuelto', priority: 'Alta', workType: 'Construcción', workTypeId: 'Construcción', address: 'Zona A', municipality: 'Municipio A', date: '2026-10-01', registeredAt: '2026-10-01T12:00:00Z', resolvedAt: '2026-10-03T00:00:00Z' },
 { id_reporte: 2, status: 'Concluido', priority: 'Alta', workType: 'Construcción', workTypeId: 'Construcción', address: 'Zona A', municipality: 'Municipio A', date: '2026-10-02', registeredAt: '2026-10-02T12:00:00Z', resolvedAt: '2026-10-03T00:00:00Z' },
 { id_reporte: 3, status: 'Pendiente', priority: 'Baja', workType: '<img src=x>', workTypeId: '<img src=x>', municipality: 'Municipio B', date: '2026-10-01' },
 { id_reporte: 4, status: 'Cancelado', priority: null, workType: null, address: null, date: '2026-02-30' },
];
(async () => {
 const server = http.createServer((req, res) => {
  const file = path.join(root, new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (error, data) => {
   if (error) return res.writeHead(404).end();
   res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html'); res.end(data);
  });
 });
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 let browser;
 try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  let data = reports, failure = false;
  await page.route('http://127.0.0.1:3000/api/reportes', route => route.fulfill({ status: failure ? 500 : 200, json: { data } }));
  const ready = async () => { await page.goto(`http://127.0.0.1:${server.address().port}/pages/graficos.html`); await page.evaluate(() => window.RIETI_READY); await page.waitForFunction(() => document.querySelector('#chart-feedback').textContent.length > 0); };
  const summary = async key => {
   await page.locator(`[data-chart="${key}"]`).click();
   const values = await page.locator('#chart-summary-values').textContent();
   await page.locator('#close-chart-summary').click(); return values;
  };
  await ready();
  assert.match(await summary('category'), /Construcción2 reporte/);
  assert.match(await summary('priority'), /Alta2 reporte/);
  assert.match(await summary('municipality'), /Municipio A2 reporte/);
  assert.equal(await page.locator('[data-chart="municipality"]').count(), 1);
  assert.equal(await page.locator('#card-location').count(), 0);
  assert.match(await summary('resolution'), /Alta1 día · 2 reporte/);
  assert.match(await summary('resolution'), /BajaSin datos/);
  assert.equal(await page.locator('.chart-visual img').count(), 0);
  assert.match(await page.locator('#chart-category .horizontal-bar').first().getAttribute('title'), /Construcción: 2 reporte/);
  assert.match(await page.locator('#chart-priority title').allTextContents().then(values => values.join(' ')), /Alta: 2 reporte/);
  assert.match(await page.locator('#chart-resolution .horizontal-bar').nth(2).getAttribute('title'), /Alta: 1 día/);
  assert.equal(await page.locator('#chart-trend svg text[y="298"]').count(), 12);
  assert.equal(await page.locator('#chart-trend circle[data-series="registered"]').count(), 1);
  assert.equal(await page.locator('#chart-trend polyline[data-series="registered"]').count(), 0);
  await page.selectOption('#trend-grouping', 'day');
  assert.equal(await page.locator('#chart-trend svg text[y="298"]').count(), 7);
  assert.equal(await page.locator('#chart-trend circle[data-series="registered"]').count(), 2);
  assert.equal(await page.locator('#chart-trend circle[data-series="resolved"]').count(), 1);
  const linePoints = await page.locator('#chart-trend polyline[data-series="registered"]').getAttribute('points');
  assert.equal(linePoints.split(' ').length, 2);
  assert.match(await page.locator('#chart-trend svg text[x="850"][y="16"]').textContent(), /2026/);
  assert.match(await summary('trend'), /2026-10-03sin registros · 2 resueltos/);
  await page.selectOption('#trend-grouping', 'week');
  assert.match(await summary('trend'), /2026-10-01 al 2026-10-073 registrados/);
  assert.equal(await page.locator('#chart-trend svg text[y="298"]').count(), 4);
  assert.equal(await page.locator('#chart-trend circle[data-series="registered"]').count(), 1);
  await page.selectOption('#trend-month', '9');
  assert.equal(await page.locator('#chart-trend circle').count(), 0);
  assert.equal(await page.locator('#chart-trend polyline').count(), 0);
  assert.match(await page.locator('#chart-trend').textContent(), /No hay reportes para el período/);
  await page.selectOption('#trend-month', '10');
  await page.selectOption('[data-filter="work-type"]', 'Construcción');
  assert.match(await page.locator('#chart-feedback').textContent(), /2 de 4/);
  assert.match(await summary('category'), /Construcción2 reporte/);
  assert.match(await summary('priority'), /Baja0 reporte/);
  assert.match(await summary('municipality'), /Municipio A2 reporte/);
  assert.equal(await page.locator('[data-chart="municipality"]').count(), 1);
  assert.equal(await page.locator('#card-location').count(), 0);
  await page.fill('[data-filter="start-date"]', '2027-01-01');
  await page.locator('#chart-filters').evaluate(form => form.requestSubmit());
  assert.match(await page.locator('#chart-category').textContent(), /No hay reportes/);
  assert.equal(await page.locator('#chart-trend circle').count(), 0);
  assert.match(await page.locator('#chart-resolution').textContent(), /Sin datos/);
  await page.locator('#clear-chart-filters').click();
  for (const width of [1440, 768, 375, 320]) {
   await page.setViewportSize({ width, height: 1000 });
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow en ${width}px`);
   for (const key of ['category','priority','trend','municipality','resolution']) assert.equal(await page.locator(`#card-${key}`).isVisible(), true);
   if (width === 1440 || width === 375) await page.screenshot({ path: `/tmp/rieti-charts-${width}.png`, fullPage: true });
  }
  data = reports.map(({ resolvedAt, ...r }) => r); await ready();
  assert.match(await page.locator('#chart-trend').textContent(), /sin datos de fecha/);
  assert.ok(!/resueltos: \d/.test(await summary('trend')));
  data = Array.from({ length: 12 }, (_, i) => ({ id_reporte: i + 1, status: 'Pendiente', priority: 'Baja', date: '2026-10-01', municipality: 'Municipio ' + i })); await ready();
  assert.equal(await page.locator('#chart-municipality .horizontal-bar').count(), 10);
  assert.match(await page.locator('#chart-municipality').textContent(), /10 de 12 municipios/);
  data = []; await ready();
  assert.match(await page.locator('#chart-category').textContent(), /No hay reportes/);
  assert.equal(await page.locator('#chart-trend circle').count(), 0);
  assert.match(await page.locator('#chart-resolution').textContent(), /Sin datos/);
  failure = true; await ready();
  for (const key of ['category','priority','trend','municipality','resolution']) assert.match(await page.locator(`#chart-${key}`).textContent(), /Datos no disponibles/);
  assert.deepEqual(errors, []);
  console.log('OK: cinco gráficas, tooltips, resúmenes, filtros, día/semana/mes, fechas de resolución, vacío/error, etiquetas seguras y responsive 1440/768/375/320px.');
 } finally { await browser?.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
