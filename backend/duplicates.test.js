const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readDuplicates } = require('./duplicates');
const target = { id_reporte: 7, latitud: 19.2826, longitud: -99.6557, direccion: 'Calle principal 123', descripcion: 'Menores venden dulces afuera mercado' };
const candidate = { id_reporte: 8, folio: 'RIETI-0008', latitud: 19.2827, longitud: -99.6558, direccion: 'Otro domicilio', descripcion: 'Descripción distinta', sameWorkType: 1, daysApart: 2 };
async function run(targets, candidates) {
  const calls = [];
  const result = await readDuplicates({ execute: async (sql, args) => { calls.push({ sql, args }); return [calls.length === 1 ? targets : candidates]; } }, '7');
  return { result, calls };
}
test('Coincidencia cercana, parametrizada, solo lectura y sin duplicar por múltiples ubicaciones', async () => {
  const { result, calls } = await run([target], [candidate, candidate]);
  assert.equal(result.length, 1);
  assert.equal(result[0].folio, 'RIETI-0008');
  assert.match(result[0].reasons[0], /Ubicación a \d+ metros/);
  assert.ok(result[0].reasons.includes('Mismo tipo de trabajo'));
  assert.ok(calls.every(call => call.sql.startsWith('SELECT') && call.args[0] === '7'));
  assert.match(calls[1].sql, /r.id_reporte <> original.id_reporte/);
  assert.match(calls[1].sql, /INTERVAL 7 DAY/);
  assert.match(calls[1].sql, /r.id_municipio = original.id_municipio/);
  assert.match(calls[0].sql, /WHERE r\.active = 1 AND r\.id_reporte = \?/);
  assert.match(calls[1].sql, /original\.active = 1 AND r\.active = 1/);
});
test('Proximidad sola, ubicaciones lejanas y coordenadas ausentes no generan coincidencia', async () => {
  assert.deepEqual((await run([target], [{ ...candidate, sameWorkType: 0 }])).result, []);
  assert.deepEqual((await run([target], [{ ...candidate, latitud: 20 }])).result, []);
  assert.deepEqual((await run([{ ...target, latitud: null, direccion: null }], [{ ...candidate, latitud: null, direccion: null }])).result, []);
});
test('Dirección normalizada como respaldo y descripciones similares', async () => {
  const { result } = await run([{ ...target, latitud: null }], [{ ...candidate, latitud: null, direccion: 'CALLE PRINCIPAL, 123', sameWorkType: 0, descripcion: 'Menores venden dulces afuera del mercado' }]);
  assert.equal(result.length, 1);
  assert.ok(result[0].reasons.includes('Misma dirección'));
  assert.ok(result[0].reasons.includes('Descripciones similares'));
});
test('No reemplaza coordenadas contradictorias con una dirección igual', async () => {
  assert.deepEqual((await run([target], [{ ...candidate, latitud: 20, direccion: target.direccion }])).result, []);
});
test('Reporte inexistente y límite de cinco candidatos únicos', async () => {
  const missing = await run([], []);
  assert.equal(missing.result, null);
  assert.equal(missing.calls.length, 1);
  assert.equal((await run([target], Array.from({ length: 10 }, (_, i) => ({ ...candidate, id_reporte: i + 20 })))).result.length, 5);
});
