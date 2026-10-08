const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/chart-statistics.js'), 'utf8'), context);
const stats = context.window.RIETI_STATISTICS;
const plain = value => JSON.parse(JSON.stringify(value));
const reports = [
 { workType: 'Construcción', address: 'Zona A', priority: 'Alta', status: 'Resuelto', date: '2026-10-01', registeredAt: '2026-10-01T12:00:00Z', resolvedAt: '2026-10-03T00:00:00Z' },
 { workType: 'Construcción', address: 'Zona B', priority: 'Alta', status: 'Concluido', date: '2026-10-02', registeredAt: '2026-10-02T12:00:00Z', resolvedAt: '2026-10-03T00:00:00Z' },
 { workType: 'Comercio', municipality: 'Municipio', priority: 'Baja', status: 'Pendiente', date: '2026-10-01', resolvedAt: '2026-10-04' },
 { priority: 'Alta', status: 'Resuelto', date: '2026-02-30', resolvedAt: '2026-10-04' },
 { priority: 'Alta', status: 'Resuelto', date: '2026-10-04', resolvedAt: '2026-10-03' },
 { priority: 'Alta', status: 'Cancelado', date: '2026-10-01', resolvedAt: '2026-10-03' },
 { priority: 'Alta', status: 'Resuelto', date: '2026-10-01' },
];
assert.deepEqual(plain(stats.counts(reports.slice(0, 3), 'workType')), [['Construcción', 2], ['Comercio', 1]]);
assert.deepEqual(plain(stats.counts([{}], 'address', 'municipality')), [['Sin especificar', 1]]);
assert.equal(stats.counts(reports, 'address', 'municipality').reduce((sum, [, count]) => sum + count, 0), reports.length);
const averages = stats.averages(reports);
assert.equal(averages.find(r => r.priority === 'Alta').hours, 24);
assert.equal(averages.find(r => r.priority === 'Alta').count, 2);
assert.equal(averages.find(r => r.priority === 'Baja').hours, null);
assert.ok(stats.averages([]).every(r => r.hours === null));
assert.equal(stats.date('2026-02-30'), null);
assert.equal(stats.date('No disponible'), null);
assert.equal(stats.date(null), null);
assert.equal(stats.registered({ date: '2026-10-01', reportedAt: '01/10/2026 25:00' }), null);
const daily = stats.trend(reports.slice(0, 3), 'day', { weekStart: '2026-09-28' });
assert.equal(daily.length, 7);
assert.equal(daily[0].date, '2026-09-28');
assert.deepEqual(plain(daily.filter(row => row.registered || row.resolved)), [
 { date: '2026-10-01', registered: 2, resolved: 0 },
 { date: '2026-10-02', registered: 1, resolved: 0 },
 { date: '2026-10-03', registered: 0, resolved: 2 },
]);
const weekly = stats.trend(reports.slice(0, 3), 'week', { year: 2026, month: 10 });
assert.equal(weekly.length, 4);
assert.equal(weekly[0].registered, 3);
assert.equal(weekly[0].resolved, 2);
assert.equal(weekly[3].endDate, '2026-10-31');
const monthly = stats.trend(reports.slice(0, 3), 'month', { year: 2026 });
assert.equal(monthly.length, 12);
assert.equal(monthly[0].date, '2026-01-01');
assert.equal(monthly[11].date, '2026-12-01');
assert.deepEqual(plain(monthly[9]), { date: '2026-10-01', registered: 3, resolved: 2 });
assert.equal(stats.trend([], 'month', { year: 2026 }).length, 12);
assert.equal(stats.trend([], 'week', { year: 2024, month: 2 })[3].endDate, '2024-02-29');
assert.equal(stats.trend([], 'week', { year: 2026, month: 2 })[3].endDate, '2026-02-28');
const endOfMonth = [28, 29, 30, 31].map(day => ({ date: `2026-10-${day}` }));
assert.equal(stats.trend(endOfMonth, 'week', { year: 2026, month: 10 })[3].registered, 4);
assert.equal(stats.trend(endOfMonth, 'month', { year: 2025 }).reduce((sum, row) => sum + row.registered, 0), 0);
const crossingYear = stats.trend([{ date: '2027-01-01' }], 'day', { weekStart: '2026-12-28' });
assert.equal(crossingYear.length, 7);
assert.equal(crossingYear[6].date, '2027-01-03');
assert.equal(crossingYear[4].registered, 1);
const localStart = new Date(2026, 9, 1, 12);
assert.equal(stats.averages([{ priority: 'Baja', status: 'Resuelto', date: '2026-10-01', reportedAt: '01/10/2026 12:00', resolvedAt: new Date(+localStart + 3600000).toISOString() }])[0].hours, 1);
console.log('OK: conteos, prioridades, promedios, fechas reales de resolución, pendientes/cancelados, nulos, fechas inválidas, duración negativa y agrupación día/semana/mes.');
