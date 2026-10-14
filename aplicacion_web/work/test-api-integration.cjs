// Ejecutar con NODE_PATH apuntando a la dependencia Playwright instalada.
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const fixture = [
 { id_reporte: 12, folio: 'RIETI-2026-0012', id: '12', status: 'Registrado', priority: null, reporter: '<img src=x onerror=alert(1)>', municipality: 'Municipio nuevo', reportedAt: '08/10/2026 12:00', date: '2026-10-08', workType: 'Tipo real', workTypeId: 'Tipo real', observations: 'Caso real de prueba', evidence: null },
 { id_reporte: 3, folio: null, id: '3', status: 'Concluido', priority: 'Media', municipality: 'Otro municipio', reportedAt: '01/09/2026 10:00', date: '2026-09-01' },
];
(async () => {
 const server = http.createServer((req, res) => {
  const file = path.join(root, new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => { if (error) res.writeHead(404).end(); else { res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html'); res.end(data); } });
 });
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 let browser;
 try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage();
  const errors = [], methods = [];
  page.on('pageerror', error => errors.push(error.message));
  let mode = 'normal';
  let duplicateMode = 'matches';
  await page.route('http://127.0.0.1:3000/api/reportes**', async route => {
   methods.push(route.request().method());
   if (new URL(route.request().url()).pathname.endsWith('/coincidencias')) {
    if (duplicateMode === 'error') return route.fulfill({ status: 500, json: { message: 'Error' } });
    return route.fulfill({ json: { data: duplicateMode === 'empty' ? [] : [{ id: '3', folio: 'RIETI-0003 <prueba>', reasons: ['Ubicación a 70 metros', 'Mismo tipo de trabajo'] }] } });
   }
   if (mode === 'error') return route.fulfill({ status: 500, json: { message: 'Error' } });
   const id = new URL(route.request().url()).pathname.split('/')[3];
   const data = mode === 'empty' ? [] : id ? fixture.find(row => row.id === id) : fixture;
   await route.fulfill({ status: id && !data ? 404 : 200, json: { data } });
  });
  const base = `http://127.0.0.1:${server.address().port}/pages/`;
  const ready = async file => { await page.goto(base + file); await page.evaluate(() => window.RIETI_READY); await page.waitForTimeout(50); };
  for (const file of ['dashboard.html', 'reportes.html', 'estadisticas.html']) {
   await ready(file);
   assert.equal(await page.locator('[data-report-row]').count(), 2);
   assert.equal(await page.locator('[data-report-row]').first().locator('td').first().textContent(), 'RIETI-2026-0012');
   assert.equal(await page.locator('[data-report-row]').nth(1).locator('td').first().textContent(), 'No disponible');
   assert.equal(await page.locator('[data-report-row]').first().getAttribute('data-report-id'), '12');
   assert.equal(await page.locator('[data-field="reports-total"]').first().textContent(), '2');
   assert.equal(await page.locator('[data-field="reports-pending"]').textContent(), '1');
   assert.equal(await page.locator('[data-field="reports-resolved"]').textContent(), '1');
   assert.equal(await page.locator('tbody img').count(), 0);
   await page.locator('[data-report-row]').first().locator('summary').scrollIntoViewIfNeeded();
   await page.waitForTimeout(150);
   await page.locator('[data-report-row]').first().locator('summary').click();
   await page.waitForTimeout(100);
   await page.locator('[data-report-action="status"]').first().click({timeout:3000});
   assert.equal(await page.locator('#status-dialog [data-dialog-report-id]').textContent(), 'RIETI-2026-0012');
   assert.equal(await page.locator('[data-current-priority]').textContent(), 'No disponible');
   await page.locator('#status-dialog [data-close-dialog]').click();
   await page.locator('[data-report-row]').first().locator('summary').scrollIntoViewIfNeeded();
   await page.waitForTimeout(150);
   await page.locator('[data-report-row]').first().locator('summary').click();
   await page.locator('[data-delete-report]').first().click();
   assert.equal(await page.locator('[data-delete-folio]').textContent(), 'RIETI-2026-0012');
   await page.locator('[data-cancel-delete]').click();
  }
  await page.selectOption('[data-filter="municipality"]', 'Otro municipio');
  await page.locator('#report-filters').evaluate(form => form.requestSubmit());
  assert.equal(await page.locator('[data-report-row]:visible').count(), 1);
  assert.equal(await page.locator('[data-field="reports-total"]').textContent(), '1');
  await ready('reporte.html?id=12&from=estadisticas');
  assert.equal(await page.locator('[data-detail="folio"]').first().textContent(), 'RIETI-2026-0012');
  assert.equal(await page.locator('[data-detail="updatedAt"]').textContent(), 'No disponible');
  assert.equal(await page.locator('[data-detail="authority"]').textContent(), 'No disponible');
  assert.equal(await page.locator('[data-back-link]').getAttribute('href'), 'estadisticas.html');
  assert.equal(await page.locator('[data-heatmap-link]').getAttribute('href'), 'mapa-calor.html?reporte=12');
  await page.waitForFunction(() => document.querySelector('[data-duplicate-notice]').getAttribute('aria-busy') === 'false');
  assert.match(await page.locator('[data-duplicate-list]').textContent(), /RIETI-0003 <prueba>/);
  assert.equal(await page.locator('[data-duplicate-list] a').getAttribute('href'), 'reporte.html?id=3&from=estadisticas');
  await page.locator('[data-duplicate-list] a').click();
  await page.evaluate(() => window.RIETI_READY);
  assert.equal(new URL(page.url()).searchParams.get('id'), '3');
  assert.equal(await page.locator('[data-report-context]').getAttribute('data-report-id'), '3');
  duplicateMode = 'empty';
  await ready('reporte.html?id=12');
  await page.waitForFunction(() => document.querySelector('[data-duplicate-notice]').getAttribute('aria-busy') === 'false');
  assert.match(await page.locator('[data-duplicate-status]').textContent(), /No se encontraron coincidencias/);
  assert.equal(await page.locator('[data-duplicate-list]').isVisible(), false);
  assert.equal(await page.locator('[data-duplicate-notice]').isVisible(), false);
  duplicateMode = 'error';
  await ready('reporte.html?id=12');
  await page.waitForFunction(() => document.querySelector('[data-duplicate-notice]').getAttribute('aria-busy') === 'false');
  assert.equal(await page.locator('[data-duplicate-notice]').isVisible(), false);
  assert.equal(await page.locator('[data-report-context]').isVisible(), true);
  duplicateMode = 'matches';
  await ready('reporte.html?id=12');
  await page.locator('[data-duplicate-list]').waitFor({ state: 'visible' });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: '/tmp/duplicate-report-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: '/tmp/duplicate-report-desktop.png', fullPage: true });
  await ready('reporte.html?id=99');
  assert.equal(await page.locator('[data-report-context]').isVisible(), false);
  assert.equal(await page.locator('[data-report-error]').isVisible(), true);
  await ready('graficos.html');
  assert.match(await page.locator('#chart-feedback').textContent(), /2 de 2/);
  assert.equal(await page.locator('#card-heat').count(), 0);
  await page.locator('[data-chart="status"]').click();
  assert.match(await page.locator('#chart-summary-values').textContent(), /Concluido/);
  await ready('rendimiento.html');
  assert.match(await page.locator('#performance-rows').textContent(), /No disponible/);
  mode = 'empty';
  await ready('reportes.html');
  assert.equal(await page.locator('[data-report-row]').count(), 0);
  assert.equal(await page.locator('[data-empty-row]').isVisible(), true);
  mode = 'error';
  for (const file of ['dashboard.html', 'reportes.html', 'estadisticas.html', 'graficos.html', 'rendimiento.html']) {
   await ready(file);
   assert.equal(await page.locator('[data-report-row]').count(), 0);
  }
  assert.deepEqual(errors, []);
  assert.ok(methods.every(method => method === 'GET'));
  console.log('Integración: tablas, métricas, filtros, detalle, diálogos, gráficas, vacíos, errores y solo GET verificados.');
 } finally { await browser?.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
