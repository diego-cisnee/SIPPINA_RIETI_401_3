const { useAuthenticatedFixture } = require('./auth-fixture.cjs');
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
// Contrato de chk_reporte_estatus verificado en RDS (sin conectarse a AWS en pruebas).
const rdsStatuses = ['Registrado', 'En_revision', 'En_seguimiento', 'Canalizado', 'Concluido', 'Archivado', 'Cancelado', 'Reincidente'];
const statusLabels = ['Registrado', 'En revisión', 'En seguimiento', 'Canalizado', 'Concluido', 'Archivado', 'Cancelado', 'Reincidente'];
const statusFixture = rdsStatuses.map((status, i) => ({ id_reporte: 200 + i, id: String(200 + i), folio: `RIETI-ESTADO-${i + 1}`, status, priority: 'Baja', municipality: 'Municipio de prueba', date: '2026-10-17', reportedAt: '17/10/2026 12:00' }));
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
  await useAuthenticatedFixture(page);
  const errors = [], methods = [];
  page.on('pageerror', error => errors.push(error.message));
  let mode = 'normal';
  let reverseStatuses = false;
  let duplicateMode = 'matches';
  await page.route('**/api/reportes**', async route => {
   methods.push(route.request().method());
   if (new URL(route.request().url()).pathname.endsWith('/coincidencias')) {
    if (duplicateMode === 'error') return route.fulfill({ status: 500, json: { message: 'Error' } });
    return route.fulfill({ json: { data: duplicateMode === 'empty' ? [] : [{ id: '3', folio: 'RIETI-0003 <prueba>', reasons: ['Ubicación a 70 metros', 'Mismo tipo de trabajo'] }] } });
   }
   if (mode === 'error') return route.fulfill({ status: 500, json: { message: 'Error' } });
   const id = new URL(route.request().url()).pathname.split('/')[3];
   const records = mode === 'statuses' ? (reverseStatuses ? [...statusFixture].reverse() : statusFixture) : fixture;
   const data = mode === 'empty' ? [] : id ? records.find(row => row.id === id) : records;
   await route.fulfill({ status: id && !data ? 404 : 200, json: { data } });
  });
  const base = `http://127.0.0.1:${server.address().port}/pages/`;
  const ready = async file => { await page.goto(base + file); await page.evaluate(() => window.RIETI_READY); await page.waitForTimeout(50); };
  for (const file of ['dashboard.html', 'reportes.html']) {
   await ready(file);
   assert.equal(await page.locator('[data-report-row]').count(), 2);
   assert.equal(await page.locator('#authority-dialog, [data-report-action="authority"]').count(), 0);
   assert.equal(await page.locator('[data-report-row]').first().locator('td').first().textContent(), 'RIETI-2026-0012');
   assert.equal(await page.locator('[data-report-row]').nth(1).locator('td').first().textContent(), 'No disponible');
   assert.equal(await page.locator('[data-report-row]').first().getAttribute('data-report-id'), '12');
   assert.equal(await page.locator('[data-field="reports-total"]').first().textContent(), '2');
   assert.equal(await page.locator('[data-field="reports-pending"]').textContent(), '1');
   assert.equal(await page.locator('[data-field="reports-resolved"]').textContent(), '1');
   assert.equal(await page.locator('[data-field="reports-other"]').textContent(), '0');
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
   if (file !== 'dashboard.html') {
    const clear = page.locator('#clear-report-filters');
    const visibleRows = page.locator('[data-report-row]:visible');
    const requestsBefore = methods.length;
    for (const [filter, value] of file === 'reportes.html'
     ? [['municipality', 'Otro municipio'], ['status', 'Concluido'], ['priority', 'Media']]
     : [['municipality', 'Otro municipio'], ['work-type', 'Tipo real']]) {
     await page.selectOption(`[data-filter="${filter}"]`, value);
     assert.equal(await visibleRows.count(), 1, `${file}: ${filter} debe filtrar sin enviar`);
     if (file === 'estadisticas.html') {
      assert.equal(await page.locator('[data-field="reports-total"]').textContent(), '1');
      assert.equal(await page.locator('[data-list-count]').textContent(), '(1)');
     }
     await clear.click();
     assert.equal(await visibleRows.count(), 2);
    }
    // fill emite input; comprobar el resultado antes de salir del campo.
    await page.fill('[data-filter="start-date"]', '2026-10-08');
    assert.equal(await visibleRows.count(), 1);
    await page.fill('[data-filter="end-date"]', '2026-10-08');
    assert.equal(await visibleRows.count(), 1, 'Fechas inclusivas');
    await page.fill('[data-filter="end-date"]', '2026-10-01');
    assert.match(await page.locator('#filter-feedback').textContent(), /fecha fin.*últimos resultados/);
    assert.equal(await visibleRows.count(), 1);
    assert.equal(await page.locator('[data-filter="end-date"]').evaluate(input => input.validity.valid), false);
    await clear.click();
    assert.equal(await visibleRows.count(), 2, 'Limpiar recupera un rango inválido');
    assert.equal(await page.locator('[data-filter="end-date"]').evaluate(input => input.validity.valid), true);
    await page.fill('[data-filter="end-date"]', '2026-09-01');
    assert.equal(await visibleRows.count(), 1);
    await clear.click();
    await page.selectOption('[data-filter="municipality"]', 'Otro municipio');
    await page.fill('[data-filter="start-date"]', '2026-10-01');
    assert.equal(await visibleRows.count(), 0, 'Combina los filtros automáticamente');
    assert.equal(await page.locator('[data-empty-row]').isVisible(), true);
    await clear.click();
    assert.equal(await visibleRows.count(), 2);
    assert.equal(await page.locator('[data-empty-row]').isVisible(), false);
    assert.equal(methods.length, requestsBefore, 'Filtrar no vuelve a consultar la API');
    for (const width of [1440, 768, 375, 320]) {
     await page.setViewportSize({ width, height: 1000 });
     assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${file}: overflow en ${width}px`);
     assert.equal(await clear.isVisible(), true);
     await page.selectOption('[data-filter="municipality"]', 'Otro municipio');
     assert.equal(await visibleRows.count(), 1);
     await clear.click();
     assert.equal(await visibleRows.count(), 2);
     if (width === 1440 || width === 375) await page.screenshot({ path: `/tmp/rieti-filters-${file}-${width}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 1280, height: 900 });
   }
  }
  await page.selectOption('[data-filter="municipality"]', 'Otro municipio');
  assert.equal(await page.locator('[data-report-row]:visible').count(), 1);
  await ready('reporte.html?id=12&from=estadisticas');
  assert.equal(await page.locator('[data-detail="folio"]').first().textContent(), 'RIETI-2026-0012');
  assert.equal(await page.locator('[data-detail="updatedAt"]').textContent(), 'No disponible');
  assert.equal(await page.locator('[data-detail="authority"]').textContent(), 'No disponible');
  assert.equal(await page.locator('[data-back-link]').getAttribute('href'), 'reportes.html');
  assert.equal(await page.locator('[data-heatmap-link]').getAttribute('href'), 'mapa-calor.html?reporte=12');
  await page.waitForFunction(() => document.querySelector('[data-duplicate-notice]').getAttribute('aria-busy') === 'false');
  assert.match(await page.locator('[data-duplicate-list]').textContent(), /RIETI-0003 <prueba>/);
  assert.equal(await page.locator('[data-duplicate-list] a').getAttribute('href'), 'reporte.html?id=3&from=estadisticas');
  await page.locator('[data-duplicate-list] a').click();
  await page.waitForURL('**/reporte.html?id=3&from=estadisticas');
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
  await ready('dashboard.html');
  const dashboardDonut = await page.locator('.status-donut').evaluate(node=>node.outerHTML);
  await ready('graficos.html');
  assert.equal(await page.locator('#chart-status .status-donut').evaluate(node=>node.outerHTML),dashboardDonut,'Dona idéntica con IDs fuera de orden');
  assert.match(await page.locator('#chart-feedback').textContent(), /2 de 2/);
  assert.equal(await page.locator('#card-heat').count(), 0);
  await page.locator('[data-chart="status"]').click();
  assert.match(await page.locator('#chart-summary-values').textContent(), /Concluido/);
  mode = 'statuses';
  for (const file of ['dashboard.html', 'reportes.html']) {
   await ready(file);
   assert.equal(await page.locator('[data-field="reports-total"]').first().textContent(), '8');
   assert.equal(await page.locator('[data-field="reports-pending"]').textContent(), '1');
   assert.equal(await page.locator('[data-field="reports-progress"]').textContent(), '3');
   assert.equal(await page.locator('[data-field="reports-resolved"]').textContent(), '1');
   assert.equal(await page.locator('[data-field="reports-other"]').textContent(), '3','Archivado, Cancelado y Reincidente');
   assert.deepEqual(await page.locator('#status-form select[name="status"] option').evaluateAll(options => options.map(option => option.value)), rdsStatuses);
  }
  await ready('reportes.html');
  assert.deepEqual(await page.locator('[data-filter="status"] option').evaluateAll(options => options.map(option => option.value)), ['', ...rdsStatuses]);
  for (const [i, status] of rdsStatuses.entries()) {
   await page.selectOption('[data-filter="status"]', status);
   const row = page.locator('[data-report-row]:visible');
   assert.equal(await row.count(), 1);
   assert.equal(await row.getAttribute('data-status'), status);
   assert.equal(await row.locator('.status').textContent(), statusLabels[i]);
   if (status === 'Cancelado' || status === 'Reincidente') assert.equal(await row.locator('.status').evaluate(node=>getComputedStyle(node).backgroundColor),status==='Cancelado'?'rgb(82, 109, 130)':'rgb(177, 198, 216)');
   await row.locator('summary').click();
   await row.locator('[data-report-action="status"]').click();
   assert.equal(await page.locator('#status-form select[name="status"]').inputValue(), status);
   assert.equal(await page.locator('[data-current-status]').textContent(), statusLabels[i]);
   await page.locator('#status-dialog [data-close-dialog]').click();
  }
  await page.locator('#clear-report-filters').click();
  await ready('reporte.html?id=201');
  assert.equal(await page.locator('[data-detail="status"]').textContent(), 'En revisión');
  assert.deepEqual(await page.locator('#status-form select[name="status"] option').evaluateAll(options => options.map(option => option.value)), rdsStatuses);
  await page.locator('[data-report-action="status"]').click();
  assert.equal(await page.locator('#status-form select[name="status"]').inputValue(), 'En_revision');
  await page.selectOption('#status-form select[name="status"]', 'En_seguimiento');
  // Este archivo prueba lecturas; los guardados reales se verifican en test-report-actions.cjs.
  await page.locator('#status-dialog [data-close-dialog]').click();
  await ready('graficos.html');
  await page.locator('[data-chart="status"]').click();
  assert.deepEqual(await page.locator('#chart-summary-values dt').allTextContents(), statusLabels);
  assert.deepEqual(await page.locator('#chart-summary-values dd').allTextContents(), rdsStatuses.map(() => '1 (12.5%)'));
  await page.locator('#close-chart-summary').click();
  const segmentColors = await page.locator('#chart-status circle[stroke-width="46"]').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).stroke));
  assert.equal(new Set(segmentColors).size, 8);
  const fullDonut = await page.locator('#chart-status .status-donut').evaluate(node=>node.outerHTML);
  await ready('dashboard.html');
  assert.equal(await page.locator('.status-donut').evaluate(node=>node.outerHTML),fullDonut,'Misma distribución y colores para los ocho estados');
  await ready('graficos.html');
  const expectedStateColors = {Cancelado:'rgb(82, 109, 130)',Reincidente:'rgb(177, 198, 216)'};
  for(const [status,color] of Object.entries(expectedStateColors)) assert.equal(await page.locator(`.status-donut circle[data-status="${status}"]`).evaluate(node=>getComputedStyle(node).stroke),color);
  reverseStatuses=true;
  await ready('dashboard.html');
  for(const [status,color] of Object.entries(expectedStateColors)) assert.equal(await page.locator(`.status-donut circle[data-status="${status}"]`).evaluate(node=>getComputedStyle(node).stroke),color,'El orden de la consulta no cambia el color del estado');
  const reversedDashboard = await page.locator('.status-donut').evaluate(node=>node.outerHTML);
  await ready('graficos.html');
  assert.equal(await page.locator('#chart-status .status-donut').evaluate(node=>node.outerHTML),reversedDashboard,'Dona idéntica con consulta invertida');
  for(const [status,color] of Object.entries(expectedStateColors)) assert.equal(await page.locator(`.status-donut circle[data-status="${status}"]`).evaluate(node=>getComputedStyle(node).stroke),color);
  reverseStatuses=false;await ready('graficos.html');
  for (const width of [1440, 375, 320]) {
   await page.setViewportSize({ width, height: 1000 });
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `ocho estados en ${width}px`);
   if (width !== 320) await page.screenshot({ path: `/tmp/rieti-eight-statuses-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  mode = 'empty';
  await ready('reportes.html');
  assert.equal(await page.locator('[data-report-row]').count(), 0);
  assert.equal(await page.locator('[data-field="reports-other"]').textContent(), '0');
  assert.equal(await page.locator('[data-empty-row]').isVisible(), true);
  await page.locator('#clear-report-filters').click();
  assert.equal(await page.locator('[data-empty-row]').isVisible(), true);
  mode = 'error';
  for (const file of ['dashboard.html', 'reportes.html', 'graficos.html']) {
   await ready(file);
   assert.equal(await page.locator('[data-report-row]').count(), 0);
   if (file === 'reportes.html' || file === 'graficos.html') {
    const feedback = page.locator(file === 'graficos.html' ? '#chart-feedback' : '#filter-feedback');
    const errorMessage = await feedback.textContent();
    await page.locator(file === 'graficos.html' ? '#clear-chart-filters' : '#clear-report-filters').click();
    assert.equal(await feedback.textContent(), errorMessage, 'Limpiar conserva el aviso de API no disponible');
   }
  }
  assert.deepEqual(errors, []);
  assert.ok(methods.every(method => method === 'GET'));
  console.log('Integración: tablas, métricas, filtros, detalle, diálogos, gráficas, vacíos, errores y solo GET verificados.');
 } finally { await browser?.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
