const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readReports } = require('./reports');
test('Consultas de solo lectura, detalle parametrizado y relaciones múltiples sin duplicar reportes', async () => {
 const calls = [];
 const pool = { execute: async (sql, args) => {
  calls.push([sql, args]);
  if (sql.includes('FROM Reporte')) return [[{ id_reporte: 7 }]];
  if (sql.includes('Demografico_Reporte')) return [[{ id_reporte: 7, tipo_trabajo: 'Comercio', edad: '8', numero_ninos: '1' }, { id_reporte: 7, tipo_trabajo: 'Agrícola', edad: '10', numero_ninos: '2' }]];
  return [[{ id_reporte: 7, direccion: 'Lugar', latitud: 0, longitud: 0 }]];
 }};
 const rows = await readReports(pool, '7');
 assert.equal(rows.length, 1);
 assert.equal(rows[0].id, '7');
 assert.equal(rows[0].workType, 'Comercio · Agrícola');
 assert.equal(rows[0].latitude, '0');
 assert.ok(calls.every(([sql]) => /^SELECT\b/.test(sql)));
 assert.match(calls[0][0], /WHERE r.id_reporte = \?/);
 assert.deepEqual(calls[0][1], ['7']);
 assert.ok(!calls[0][0].includes('contrasena'));
});
test('Listado vacío no consulta relaciones ni crea reportes', async () => {
 let count = 0;
 const rows = await readReports({ execute: async () => { count++; return [[]]; } });
 assert.deepEqual(rows, []);
 assert.equal(count, 1);
});
