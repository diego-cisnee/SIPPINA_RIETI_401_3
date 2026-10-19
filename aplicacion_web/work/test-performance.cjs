// Integración de solo lectura con la API real en ejecución. No crea datos ni sustituye respuestas.
// NODE_PATH debe permitir resolver Playwright. RIETI_TEST_BASE_URL es opcional (puerto 3000 por defecto).
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const base = (process.env.RIETI_TEST_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const cookie = process.env.RIETI_TEST_COOKIE || '';
const percent = (count, total) => total ? (count / total * 100).toLocaleString('es-MX', { maximumFractionDigits: 1 }) + '%' : '—';
const days = value => value === null ? 'No disponible' : value > 0 && value < 0.005 ? '<0.01 días' : value.toLocaleString('es-MX', {maximumFractionDigits:2}) + (value === 1 ? ' día' : ' días');

(async () => {
 const response = await fetch(base + '/api/rendimiento', { headers: cookie ? { Cookie: cookie } : {} });
 assert.equal(response.status, 200, 'Inicia el backend y configura RIETI_TEST_COOKIE con una sesión válida antes de ejecutar esta prueba.');
 const { data } = await response.json();
 assert.ok(Array.isArray(data));
 const browser = await chromium.launch({ headless: true, channel: 'chrome' });
 try {
  const page = await browser.newPage({ acceptDownloads: true });
  const [name, ...parts] = cookie.split(';')[0].split('=');
  if (name === 'rieti.sid' && parts.length) await page.context().addCookies([{ name, value: parts.join('='), url: base, httpOnly: true, sameSite: 'Lax', secure: new URL(base).protocol === 'https:' }]);
  await page.addInitScript(value => { window.RIETI_API_BASE = value; }, base);
  const errors = [], apiRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
   const request = route.request();
   if (!request.url().startsWith(base + '/') || request.method() !== 'GET') return route.abort();
   if (request.url().includes('/api/')) apiRequests.push(new URL(request.url()).pathname);
   return route.continue();
  });
  await page.goto(base + '/pages/rendimiento.html');
  await page.evaluate(() => window.RIETI_PERFORMANCE_READY);
  await page.waitForFunction(() => !document.body.hasAttribute('data-report-loading'));
  assert.equal(await page.locator('#performance-rows tr[data-municipality-id]').count(), data.length);
  const sum = key => data.reduce((total, row) => total + row[key], 0);
  assert.equal(await page.locator('[data-performance-metric="resolution"]').textContent(), percent(sum('resolved'), sum('total')));
  assert.equal(await page.locator('[data-performance-metric="progress"]').textContent(), percent(sum('progress'), sum('total')));
  assert.equal(await page.locator('[data-performance-metric="pending"]').textContent(), percent(sum('pending'), sum('total')));
  const measured = sum('measuredResolved');
  assert.equal(await page.locator('[data-performance-metric="average"]').textContent(), days(measured ? sum('resolutionSeconds') / measured / 86400 : null));
  for (const record of data) {
   const cells = await page.locator(`[data-municipality-id="${record.municipalityId}"]`).locator('th, td').allTextContents();
   assert.deepEqual(cells, [record.authority, record.municipality, record.total, record.pending, record.progress, record.resolved, days(record.averageDays), percent(record.resolved, record.total)].map(String));
  }
  if (data.length) {
   const record = data.find(row => row.total > 0) || data[0];
   const input = page.locator('#municipality-search');
   await input.fill(record.municipality.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase());
   await input.press('ArrowDown'); await input.press('Enter');
   assert.ok((await page.locator('#performance-rows').textContent()).includes(record.authority));
   await page.click('#clear-municipality');
   assert.equal(await page.locator('#performance-rows tr[data-municipality-id]').count(), data.length);
   await input.fill('\uE000');
   assert.equal(await page.locator('#performance-rows tr[data-municipality-id]').count(), 0);
   assert.equal(await page.locator('[data-action="download-performance"]').isDisabled(), true);
   await page.click('#clear-municipality');
   const downloadPromise = page.waitForEvent('download');
   await page.click('[data-action="download-performance"]');
   const download = await downloadPromise;
   assert.equal(download.suggestedFilename(), 'rendimiento_rieti.csv');
   const csv = await fs.readFile(await download.path(), 'utf8');
   assert.ok(csv.includes('"Autoridad","Municipio","Total reportes"'));
   assert.ok(csv.includes('"Tiempo promedio (días)","Concluidos con fecha registrada"'));
  }
  for (const width of [1440, 768, 390, 320]) {
   await page.setViewportSize({ width, height: 1000 });
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Desbordamiento a ${width}px`);
  }
  assert.ok(apiRequests.every(url => ['/api/rendimiento', '/api/auth/session'].includes(url)), 'No descargar datos personales de reportes para esta vista.');
  await page.route('**/api/rendimiento', route => route.abort());
  await page.reload(); await page.evaluate(() => window.RIETI_PERFORMANCE_READY);
  await page.waitForFunction(() => !document.body.hasAttribute('data-report-loading'));
  assert.equal(await page.locator('#municipality-search').isDisabled(), true);
  assert.equal(await page.locator('[data-action="download-performance"]').isDisabled(), true);
  assert.match(await page.locator('#performance-feedback').textContent(), /No fue posible/);
  assert.deepEqual(errors, []);
  console.log(`OK: ${data.length} municipios reales, tabla/métricas, búsqueda sin acentos, teclado, vacío, CSV, responsive y error de red. Solo GET.`);
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
