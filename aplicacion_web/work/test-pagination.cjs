const { useAuthenticatedFixture } = require('./auth-fixture.cjs');
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const records = Array.from({ length: 51 }, (_, i) => ({
 id_reporte: i + 1, folio: `RIETI-${String(i + 1).padStart(4, '0')}`,
 status: i % 2 ? 'Concluido' : 'Registrado', priority: 'Baja',
 municipality: i < 25 ? 'Municipio A' : 'Municipio B',
 date: '2026-10-17', reportedAt: '17/10/2026 12:00',
}));
(async () => {
 const server = http.createServer((req, res) => {
  const file = path.join(root, new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (error, data) => {
   if (error) return res.writeHead(404).end();
   res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.png') ? 'image/png' : 'text/html');
   res.end(data);
  });
 });
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 let browser;
 try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ reducedMotion: 'reduce', acceptDownloads: true });
  await useAuthenticatedFixture(page);
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  let count = 51, failure = false;
  await page.route('**/api/reportes', route => {
   requests.push(route.request().method());
   return route.fulfill({ status: failure ? 500 : 200, json: { data: records.slice(0, count) } });
  });
  const url = `http://127.0.0.1:${server.address().port}/pages/reportes.html`;
  const nav = page.locator('#report-pagination');
  const next = nav.getByRole('button', { name: 'Página siguiente', exact: true, includeHidden: true });
  const previous = nav.getByRole('button', { name: 'Página anterior', exact: true, includeHidden: true });
  const visibleRows = page.locator('[data-report-row]:visible');
  const visibleIds = () => visibleRows.evaluateAll(rows => rows.map(row => Number(row.dataset.reportId)));
  const current = () => nav.locator('[aria-current="page"]').textContent();
  const ready = async () => {
   await page.goto(url);
   await page.evaluate(() => window.RIETI_READY);
   await page.waitForFunction(() => window.RIETI_API_ERROR || document.querySelector('#report-pagination [aria-current]') || document.querySelector('#filter-feedback')?.textContent === 'Mostrando 0 reportes');
  };
  for (count of [0, 1, 10, 11, 20, 21, 51]) {
   await ready();
   assert.equal(await visibleRows.count(), Math.min(count, 10), `${count}: ${await page.locator('#filter-feedback').textContent()} · ${await page.evaluate(() => window.RIETI_API_ERROR)}`);
   await nav.waitFor({ state: count > 10 ? 'visible' : 'hidden' });
   assert.equal(await page.locator('[data-empty-row]').isVisible(), count === 0);
   if (!count) continue;
   assert.equal(await current(), '1');
   assert.equal(await previous.isDisabled(), true);
   assert.equal(await next.isDisabled(), count <= 10);
   if(count<=10)assert.equal(await nav.locator('button:not(:disabled)').count(),0);
   const seen = [];
   while (true) {
    seen.push(...await visibleIds());
    if (await next.isDisabled()) break;
    await next.click();
   }
   assert.deepEqual(seen, records.slice(0, count).map(row => row.id_reporte), `${count}: sin saltos ni duplicados`);
   assert.equal(await current(), String(Math.ceil(count / 10)));
  }
  count = 51;
  await ready();
  const requestsBefore = requests.length;
  await next.click();
  assert.deepEqual(await visibleIds(), records.slice(10, 20).map(row => row.id_reporte));
  await next.focus(); await page.keyboard.press('Enter');
  assert.equal(await current(), '3');
  assert.match(await page.locator('#filter-feedback').textContent(), /21–30 de 51/);
  assert.equal(await nav.locator('[aria-current="page"]').evaluate(button => button === document.activeElement), true);
  await nav.getByRole('button', { name: 'Ir a la página 6', exact: true }).click();
  assert.deepEqual(await visibleIds(), [51]);
  await previous.click();
  assert.deepEqual(await visibleIds(), records.slice(40, 50).map(row => row.id_reporte));
  await page.selectOption('[data-filter="municipality"]', 'Municipio A');
  assert.equal(await current(), '1');
  assert.match(await page.locator('#filter-feedback').textContent(), /1–10 de 25/);
  assert.equal(await page.locator('[data-field="reports-total"]').textContent(), '51', 'El total general no cambia al paginar o filtrar');
  await nav.getByRole('button', { name: 'Ir a la página 3', exact: true }).click();
  assert.deepEqual(await visibleIds(), [21, 22, 23, 24, 25]);
  await page.selectOption('[data-filter="status"]', 'Concluido');
  assert.equal(await current(), '1');
  assert.match(await page.locator('#filter-feedback').textContent(), /1–10 de 12/);
  await next.click(); assert.deepEqual(await visibleIds(), [22, 24]);
  await page.fill('[data-filter="start-date"]', '2027-01-01');
  assert.equal(await visibleRows.count(), 0);
  assert.equal(await nav.isVisible(), false);
  assert.equal(await page.locator('[data-empty-row]').isVisible(), true);
  await page.locator('#clear-report-filters').click();
  assert.equal(await current(), '1');
  assert.deepEqual(await visibleIds(), records.slice(0, 10).map(row => row.id_reporte));
  const row = visibleRows.first();
  await row.locator('summary').click();
  await next.click();
  assert.equal(await page.locator('.row-menu[open]').count(), 0);
  await visibleRows.first().locator('summary').click();
  await visibleRows.first().locator('[data-report-action="status"]').click();
  assert.equal(await page.locator('#status-dialog [data-dialog-report-id]').textContent(), 'RIETI-0011');
  await page.locator('#status-dialog [data-close-dialog]').click();
  assert.equal(requests.length, requestsBefore, 'Paginar y filtrar no vuelven a consultar la API');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-action="download-reports"]').click();
  const download = await downloadPromise;
  const csv = fs.readFileSync(await download.path(), 'utf8');
  assert.equal(csv.trim().split('\n').length, 52, 'El CSV incluye todos los reportes consultados');
  for (const width of [1440, 768, 375, 320]) {
   await page.setViewportSize({ width, height: 1000 });
   await nav.getByRole('button', { name: 'Ir a la página 1', exact: true }).click();
   await next.click();
   assert.equal(await current(), '2');
   assert.equal(await visibleRows.count(), 10);
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow ${width}`);
   if (width === 1440 || width === 375) await nav.screenshot({ path: `/tmp/rieti-pagination-${width}.png` });
  }
  await visibleRows.first().locator('td').first().click();
  assert.equal(new URL(page.url()).searchParams.get('id'), '11');
  failure = true; await ready();
  assert.equal(await nav.isVisible(), false);
  assert.equal(await visibleRows.count(), 0);
  assert.deepEqual(errors, []);
  assert.ok(requests.every(method => method === 'GET'));
  console.log('OK: 10 por página, límites 0/1/10/11/20/21/51, navegación/clic/teclado, filtros, conteos, CSV completo, vacío/error y móvil.');
 } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
