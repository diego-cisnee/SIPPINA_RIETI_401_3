const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
class Node {
  constructor() { this.value = ''; this.children = []; this.handlers = {}; this.attrs = {}; this.dataset = {}; this.hidden = false; }
  addEventListener(name, handler) { (this.handlers[name] ||= []).push(handler); }
  fire(name, event = {}) { (this.handlers[name] || []).forEach(fn => fn({ preventDefault() {}, target: this, ...event })); }
  setAttribute(name, value) { this.attrs[name] = value; }
  removeAttribute(name) { delete this.attrs[name]; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren() { this.children = []; }
  focus() { this.focused = true; this.fire('focus'); }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  scrollIntoView() {}
}
const ids = ['municipality-search', 'municipality-combobox', 'municipality-suggestions', 'performance-rows', 'performance-feedback', 'clear-municipality'];
const nodes = Object.fromEntries(ids.map(id => ['#' + id, new Node()]));
const metricNodes = ['average', 'resolution', 'progress', 'pending'].map(key => Object.assign(new Node(), { dataset: { performanceMetric: key } }));
const document = new Node();
document.querySelector = selector => nodes[selector];
document.querySelectorAll = () => metricNodes;
document.createElement = () => new Node();
const context = { window: {}, document };
vm.runInNewContext(fs.readFileSync('js/performance-data.js', 'utf8'), context);
const data = context.window.RIETI_AUTHORITY_PERFORMANCE;
assert.equal(new Set(data.map(row => row.municipality)).size, data.length);
assert.equal(new Set(data.map(row => row.id)).size, data.length);
assert.ok(data.every(row => row.pending >= 0 && row.progress >= 0 && row.resolutionDays.every(days => days >= 0)));
vm.runInNewContext(fs.readFileSync('js/performance.js', 'utf8'), context);
const input = nodes['#municipality-search'], list = nodes['#municipality-suggestions'], body = nodes['#performance-rows'];
const metric = key => metricNodes.find(node => node.dataset.performanceMetric === key).textContent;
const search = query => { input.value = query; input.fire('input'); };
const clear = () => nodes['#clear-municipality'].fire('click');
assert.equal(body.children.length, 9);
assert.match(nodes['#performance-feedback'].textContent, /39 reportes/);
assert.equal(metric('average'), '5.3'); // 80 días / 15 casos: promedio ponderado.
assert.equal(metric('resolution'), '38.5%');
assert.equal(metric('progress'), '28.2%');
assert.equal(metric('pending'), '33.3%');
assert.equal(list.hidden, true);
search('nau');
assert.equal(body.children.length, 1);
assert.equal(body.children[0].dataset.authorityId, 'demo-nau');
assert.equal(list.children[0].textContent, 'Naucalpan de Juárez');
assert.equal(input.attrs['aria-expanded'], 'true');
assert.equal(metric('resolution'), '37.5%');
assert.equal(metric('average'), '5');
input.fire('keydown', { key: 'ArrowDown' });
assert.equal(input.attrs['aria-activedescendant'], list.children[0].id);
input.fire('keydown', { key: 'Enter' });
assert.equal(input.value, 'Naucalpan de Juárez');
assert.equal(list.hidden, true);
search('NICOLAS');
assert.equal(body.children[0].dataset.authorityId, 'demo-nro');
list.children[0].fire('pointerdown');
list.children[0].fire('click');
assert.equal(input.value, 'Nicolás Romero');
assert.equal(list.hidden, true);
search('  villa   carbon ');
assert.equal(body.children[0].dataset.authorityId, 'demo-vdc');
search('tl');
assert.ok(list.children.length > 1);
input.fire('keydown', { key: 'ArrowUp' });
assert.equal(input.attrs['aria-activedescendant'], list.children.at(-1).id);
input.fire('keydown', { key: 'Escape' });
assert.equal(list.hidden, true);
assert.equal(input.attrs['aria-activedescendant'], undefined);
input.fire('focus');
input.fire('keydown', { key: 'Tab' });
assert.equal(list.hidden, true);
input.fire('focus');
input.fire('blur');
assert.equal(list.hidden, true);
search('nau');
document.fire('click', { target: new Node() });
assert.equal(list.hidden, true);
search('tulti');
assert.equal(body.children[0].dataset.authorityId, 'demo-tul');
assert.ok(metricNodes.every(node => node.textContent === '—')); // Sin divisiones por cero.
search('atiza');
assert.equal(metric('resolution'), '0%'); // Asignados pero aún ninguno finalizado.
assert.equal(metric('average'), '—');
search('municipio inexistente');
assert.equal(body.children[0].className, 'performance-empty');
assert.ok(metricNodes.every(node => node.textContent === '—'));
assert.equal(list.hidden, true);
assert.match(nodes['#performance-feedback'].textContent, /0 de 9/);
clear();
assert.equal(body.children.length, 9);
assert.equal(input.value, '');
assert.equal(list.hidden, true);
assert.equal(metric('resolution'), '38.5%');
const html = fs.readFileSync('pages/rendimiento.html', 'utf8');
assert.match(html, /role="combobox"/);
assert.match(html, /role="listbox"/);
assert.match(html, /aria-live="polite"/);
assert.equal((html.match(/<th scope="col">/g) || []).length, 8);
assert.ok(html.indexOf('performance-data.js') < html.indexOf('performance.js'));
for (const page of ['estadisticas', 'graficos']) assert.ok(fs.readFileSync(`pages/${page}.html`, 'utf8').includes('href="rendimiento.html"'));
console.log('OK: autoridad única, métricas ponderadas, filtro instantáneo, acentos, autocompletar con clic/teclado, cierres, cero, vacío y limpiar.');
