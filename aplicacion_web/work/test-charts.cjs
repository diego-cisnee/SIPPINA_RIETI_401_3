const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
class Node {
  constructor() { this.value = ''; this.hidden = false; this.handlers = {}; this.children = []; this.dataset = {}; }
  addEventListener(name, fn) { (this.handlers[name] ||= []).push(fn); }
  fire(name, event = {}) { (this.handlers[name] || []).forEach(fn => fn({ preventDefault() {}, target: this, ...event })); }
  setCustomValidity(message) { this.validationMessage = message; }
  replaceChildren() { this.children = []; }
  append(...nodes) { this.children.push(...nodes); }
  focus() { this.focused = true; }
  showModal() { this.open = true; }
  close() { this.open = false; this.fire('close'); }
}
const names = ['municipality', 'work-type', 'start-date', 'end-date'];
const controls = Object.fromEntries(names.map(name => [name, new Node()]));
const ids = ['chart-filters', 'chart-summary', 'chart-summary-title', 'chart-summary-text', 'chart-summary-values', 'close-chart-summary', 'clear-chart-filters', 'card-municipality', 'municipality-hidden-note', 'chart-feedback', 'chart-status', 'chart-heat', 'chart-municipality', 'chart-trend'];
const nodes = Object.fromEntries(ids.map(id => ['#' + id, new Node()]));
const form = nodes['#chart-filters'];
form.querySelector = selector => controls[selector.match(/="(.*?)"/)[1]];
form.reportValidity = () => !Object.values(controls).some(node => node.validationMessage);
form.reset = () => Object.values(controls).forEach(node => { node.value = ''; });
const buttons = ['status', 'heat', 'municipality', 'trend'].map(chart => Object.assign(new Node(), { dataset: { chart } }));
const context = { window: {}, document: { querySelector: selector => nodes[selector], querySelectorAll: () => buttons, createElement: () => new Node() } };
vm.runInNewContext(fs.readFileSync('js/report-data.js', 'utf8'), context);
vm.runInNewContext(fs.readFileSync('js/charts.js', 'utf8'), context);
assert.match(nodes['#chart-feedback'].textContent, /11 de 11/);
assert.equal(nodes['#card-municipality'].hidden, false);
for (const button of buttons) {
  button.fire('click');
  assert.equal(nodes['#chart-summary'].open, true);
  assert.ok(nodes['#chart-summary-values'].children.length);
  assert.ok(nodes['#chart-summary-text'].textContent.length > 40);
  nodes['#close-chart-summary'].fire('click');
  assert.equal(nodes['#chart-summary'].open, false);
  assert.equal(button.focused, true);
}
buttons[0].fire('click');
assert.deepEqual(nodes['#chart-summary-values'].children.filter((_, i) => i % 2).map(node => node.textContent), ['2 (18.2%)', '2 (18.2%)', '5 (45.5%)', '2 (18.2%)', '0 (0%)']);
nodes['#chart-summary'].fire('click');
assert.equal(nodes['#chart-summary'].open, false);
controls.municipality.value = 'Naucalpan de Juárez';
form.fire('change');
assert.match(nodes['#chart-feedback'].textContent, /3 de 11/);
assert.equal(nodes['#card-municipality'].hidden, true);
assert.equal(nodes['#municipality-hidden-note'].hidden, false);
buttons[0].fire('click');
assert.match(nodes['#chart-summary-text'].textContent, /3 reportes/);
assert.match(nodes['#chart-summary-text'].textContent, /Naucalpan/);
nodes['#clear-chart-filters'].fire('click');
assert.equal(nodes['#card-municipality'].hidden, false);
controls['start-date'].value = '2026-10-06';
controls['end-date'].value = '2026-10-06';
form.fire('submit');
assert.match(nodes['#chart-feedback'].textContent, /2 de 11/);
assert.equal(nodes['#card-municipality'].hidden, true);
controls['end-date'].value = '2026-01-01';
form.fire('change');
assert.ok(controls['end-date'].validationMessage);
assert.match(nodes['#chart-feedback'].textContent, /2 de 11/); // No se aplican rangos inválidos.
nodes['#clear-chart-filters'].fire('click');
assert.equal(controls['end-date'].validationMessage, '');
controls['work-type'].value = 'venta';
form.fire('change');
assert.equal(nodes['#card-municipality'].hidden, true);
buttons[0].fire('click');
assert.match(nodes['#chart-summary-text'].textContent, /Venta ambulante/);
controls['start-date'].value = '2027-01-01';
form.fire('change');
assert.match(nodes['#chart-feedback'].textContent, /0 de 11/);
for (const type of ['status', 'heat', 'trend']) assert.match(nodes['#chart-' + type].innerHTML, /No hay reportes/);
buttons[3].fire('click');
assert.match(nodes['#chart-summary-text'].textContent, /No hay reportes/);
nodes['#clear-chart-filters'].fire('click');
for (const type of ['status', 'heat', 'municipality', 'trend']) assert.ok(!/NaN|undefined|Infinity/.test(nodes['#chart-' + type].innerHTML));
const html = fs.readFileSync('pages/graficos.html', 'utf8');
assert.equal((html.match(/data-chart=/g) || []).length, 4);
assert.equal((html.match(/Presiona para ver más información/g) || []).length, 4);
assert.match(html, /href="estadisticas.html"/);
assert.match(html, /href="rendimiento.html">Rendimiento/);
assert.ok(html.indexOf('report-data.js') < html.indexOf('charts.js'));
console.log('OK: cuatro gráficas, resúmenes, filtros combinados, fechas inclusivas, rango inválido, ocultar/restaurar municipio, vacío y foco.');
