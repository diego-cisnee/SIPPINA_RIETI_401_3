const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
class Node {
  constructor() { this.handlers = {}; this.dataset = {}; this.open = false; this.hidden = false; this.checked = false; this.disabled = false; this.textContent = ''; }
  addEventListener(name, fn) { (this.handlers[name] ||= []).push(fn); }
  fire(name) { const event = { preventDefault() { this.prevented = true; } }; (this.handlers[name] || []).forEach(fn => fn(event)); return event; }
  focus() { this.focused = true; }
  showModal() { this.open = true; }
  close() { this.open = false; this.fire('close'); }
  reportValidity() { return this.valid !== false; }
}
const selectors = ['#delete-report-form', '#delete-acknowledgement', '[data-confirm-delete]', '[data-cancel-delete]', '[data-finish-delete]', '[data-delete-result]', '#delete-report-title', '#delete-report-description', '[data-delete-folio]'];
const nodes = Object.fromEntries(selectors.map(s => [s, new Node()]));
const dialog = new Node();
dialog.querySelector = s => nodes[s];
const menus = [Object.assign(new Node(), { open: true })];
const summary = new Node();
const contexts = [new Node(), new Node(), new Node()];
contexts[0].dataset.reportId = 'RIETI-NAU-2026-0001';
contexts[1].dataset.reportId = 'RIETI-COA-2026-0004';
contexts[2].hidden = true;
contexts.forEach((row, i) => { row.querySelector = () => i === 0 ? summary : null; });
const buttons = contexts.map(context => { const button = new Node(); button.closest = () => context; return button; });
const document = { querySelector: () => dialog, querySelectorAll: s => s === '[data-delete-report]' ? buttons : menus };
const source = fs.readFileSync('js/delete-report.js', 'utf8');
vm.runInNewContext(source, { document });
const form = nodes['#delete-report-form'], checkbox = nodes['#delete-acknowledgement'], confirm = nodes['[data-confirm-delete]'], cancel = nodes['[data-cancel-delete]'], result = nodes['[data-delete-result]'];
buttons[2].fire('click');
assert.equal(dialog.open, false);
buttons[0].fire('click');
assert.equal(dialog.open, true);
assert.equal(confirm.disabled, true);
assert.equal(checkbox.checked, false);
assert.equal(nodes['[data-delete-folio]'].textContent, contexts[0].dataset.reportId);
assert.equal(menus[0].open, false);
assert.equal(cancel.focused, true);
form.fire('submit');
assert.equal(result.hidden, true);
checkbox.checked = true;
checkbox.fire('change');
assert.equal(confirm.disabled, false);
checkbox.checked = false;
checkbox.fire('change');
assert.equal(confirm.disabled, true);
checkbox.checked = true;
checkbox.fire('change');
cancel.fire('click');
assert.equal(dialog.open, false);
assert.equal(checkbox.checked, false);
assert.equal(confirm.disabled, true);
assert.equal(summary.focused, true);
buttons[1].fire('click');
assert.equal(nodes['[data-delete-folio]'].textContent, contexts[1].dataset.reportId);
assert.equal(confirm.disabled, true);
checkbox.checked = true;
checkbox.fire('change');
assert.equal(dialog.fire('cancel').prevented, true);
assert.equal(dialog.open, false);
assert.equal(buttons[1].focused, true);
buttons[1].fire('click');
checkbox.checked = true;
checkbox.fire('change');
form.valid = false;
form.fire('submit');
assert.equal(result.hidden, true);
form.valid = true;
form.fire('submit');
assert.equal(form.hidden, true);
assert.equal(result.hidden, false);
assert.equal(nodes['#delete-report-title'].textContent, 'Eliminación simulada');
assert.match(nodes['#delete-report-description'].textContent, /RIETI-COA-2026-0004/);
assert.match(nodes['#delete-report-description'].textContent, /No se ha eliminado/);
assert.equal(nodes['[data-finish-delete]'].focused, true);
form.fire('submit'); // Los dobles envíos no cambian la confirmación.
nodes['[data-finish-delete]'].fire('click');
assert.equal(dialog.open, false);
assert.equal(form.hidden, false);
assert.equal(result.hidden, true);
buttons[0].fire('click');
assert.equal(checkbox.checked, false);
assert.equal(confirm.disabled, true);
assert.equal(nodes['#delete-report-title'].textContent, '¿Eliminar este reporte?');
vm.runInNewContext(source, { document: { querySelector: () => null } });
for (const [page, count] of [['dashboard', 5], ['reportes', 10], ['estadisticas', 11], ['reporte', 1]]) {
  const html = fs.readFileSync(`pages/${page}.html`, 'utf8');
  assert.equal((html.match(/data-delete-report /g) || []).length, count, page);
  assert.equal((html.match(/id="delete-report-dialog"/g) || []).length, 1);
  assert.match(html, /data-confirm-delete disabled/);
  assert.match(html, /data-cancel-delete autofocus/);
  assert.match(html, /type="checkbox"[^>]*required/);
  assert.match(html, /Esta acción no puede deshacerse/);
  assert.match(html, /src="\.\.\/js\/delete-report.js" defer/);
  assert.ok(!/aria-disabled="true">Eliminar|quick-actions__danger" disabled/.test(html));
}
const css = fs.readFileSync('css/styles.css', 'utf8');
assert.match(css, /button\.dialog-danger \{ background: #c52b20/);
assert.match(css, /button\.dialog-danger:disabled \{ background: #edf0f3/);
console.log('OK: folio, casilla, habilitar/deshabilitar, cancelar, Escape, reapertura, simulación, foco y cuatro pantallas.');
