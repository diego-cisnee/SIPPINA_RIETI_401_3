// Verifica la fuente de datos del mapa sin navegador, Lambda ni acceso a RDS.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../js/mapa.js'), 'utf8');

async function run(location, apiBase, response) {
 const handlers = {}, mapHandlers = {}, requests = [], markers = [], errors = [];
 const context = {
  location, AbortSignal, setTimeout,
  window: { RIETI_API_BASE: apiBase, RIETI_STATUS_LABEL: status => status === 'En_revision' ? 'En revisión' : status },
  console: { error: (...args) => errors.push(args) },
  document: {
   addEventListener: (event, handler) => { handlers[event] = handler; },
   getElementById: () => ({ addEventListener() {} }),
   createElement: () => ({ textContent: '', get innerHTML() { return this.textContent; } }),
  },
  fetch: async (url, options) => { requests.push({ url, options }); return response; },
  maplibregl: {
   Map: class { addControl() {} on(event, handler) { mapHandlers[event] = handler; } },
   NavigationControl: class {},
   Popup: class { setHTML(html) { this.html = html; return this; } },
   Marker: class {
    constructor(options) { this.color = options.color; }
    setLngLat(coordinates) { this.coordinates = coordinates; return this; }
    setPopup(popup) { this.popup = popup.html; return this; }
    addTo() { markers.push(this); return this; }
   },
  },
 };
 vm.runInNewContext(source, context);
 handlers.DOMContentLoaded();
 await mapHandlers.load();
 return { requests, markers, errors };
}

(async () => {
 const response = { ok: true, json: async () => ({ data: { puntos: [
  { id: 7, folio: 'RIETI-0007', latitud: '19.2', longitud: '-99.6', estatus: 'En_revision', prioridad: 'Alta', direccion: 'Ubicación del reporte' },
  { id: 8, latitud: null, longitud: null },
 ] } }) };
 const scenarios = [
  [{ hostname: '127.0.0.1', port: '4173', origin: 'http://127.0.0.1:4173' }, undefined, 'http://127.0.0.1:3000/api/mapa-calor'],
  [{ hostname: '127.0.0.1', port: '3000', origin: 'http://127.0.0.1:3000' }, undefined, 'http://127.0.0.1:3000/api/mapa-calor'],
  [{ hostname: 'rieti.example', port: '', origin: 'https://rieti.example' }, undefined, 'https://rieti.example/api/mapa-calor'],
  [{ hostname: 'rieti.example', port: '', origin: 'https://rieti.example' }, 'https://api.example/', 'https://api.example/api/mapa-calor'],
 ];
 for (const [location, apiBase, expectedURL] of scenarios) {
  const result = await run(location, apiBase, response);
  assert.equal(result.requests.length, 1);
  assert.equal(result.requests[0].url, expectedURL);
  assert.equal(result.requests[0].options.cache, 'no-store');
  assert.equal(result.markers.length, 1);
  assert.equal(result.markers[0].color, '#f97316');
  assert.deepEqual(Array.from(result.markers[0].coordinates), [-99.6, 19.2]);
  assert.match(result.markers[0].popup, /RIETI-0007/);
  assert.match(result.markers[0].popup, /En revisión/);
  assert.deepEqual(result.errors, []);
 }
 const [location] = scenarios[0];
 const empty = await run(location, undefined, { ok: true, json: async () => ({ data: { puntos: [] } }) });
 assert.equal(empty.markers.length, 0);
 assert.deepEqual(empty.errors, []);
 for (const response of [{ ok: false }, { ok: true, json: async () => ({ data: [] }) }]) {
  const result = await run(location, undefined, response);
  assert.equal(result.markers.length, 0);
  assert.equal(result.errors.length, 1);
  assert.equal(result.requests.length, 1, 'No consulta otra fuente al fallar la API');
 }
 console.log('OK: mapa del dashboard usa la API filtrada, respeta el origen/configuración y maneja vacíos/errores sin consultar Lambda.');
})().catch(error => { console.error(error); process.exitCode = 1; });
