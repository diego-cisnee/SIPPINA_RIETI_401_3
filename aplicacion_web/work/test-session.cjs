const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
class Node {
  constructor() { this.handlers = {}; this.open = false; this.focused = false; this.disabled = false; this.shows = 0; }
  addEventListener(name, handler) { (this.handlers[name] ||= []).push(handler); }
  fire(name, extras = {}) { const event = { preventDefault() { this.prevented = true; }, ...extras }; (this.handlers[name] || []).forEach(handler => handler(event)); return event; }
  focus() { this.focused = true; }
  showModal() { this.open = true; this.shows++; }
  close() { this.open = false; this.fire('close'); }
}
const trigger = new Node(), dialog = new Node(), cancel = new Node(), confirm = new Node();
dialog.querySelector = selector => selector === '[data-cancel-logout]' ? cancel : confirm;
const window = new Node();
const destinations = [];
window.location = { replace: url => destinations.push(url) };
const document = { querySelector: selector => selector === '#logout-dialog' ? dialog : trigger };
const source = fs.readFileSync('js/session.js', 'utf8');
vm.runInNewContext(source, { document, window });
assert.equal(dialog.open, false);
confirm.fire('click');
assert.equal(destinations.length, 0); // No se puede confirmar antes de abrir el aviso.
trigger.fire('click');
assert.equal(dialog.open, true);
assert.equal(cancel.focused, true);
trigger.fire('click');
assert.equal(dialog.shows, 1);
cancel.fire('click');
assert.equal(dialog.open, false);
assert.equal(trigger.focused, true);
assert.equal(destinations.length, 0);
trigger.fire('click');
assert.equal(dialog.fire('cancel').prevented, true);
assert.equal(dialog.open, false);
assert.equal(destinations.length, 0);
trigger.fire('click');
confirm.fire('click');
assert.deepEqual(destinations, ['../index.html']);
assert.equal(confirm.disabled, true);
confirm.fire('click');
assert.equal(destinations.length, 1);
window.fire('pageshow', { persisted: true });
assert.equal(dialog.open, false);
assert.equal(confirm.disabled, false);
trigger.fire('click');
assert.equal(dialog.open, true);
vm.runInNewContext(source, { document: { querySelector: () => null }, window });
const pages = ['dashboard', 'reportes', 'reporte', 'estadisticas', 'graficos', 'rendimiento', 'perfil'];
for (const page of pages) {
  const html = fs.readFileSync(`pages/${page}.html`, 'utf8');
  assert.equal((html.match(/data-action="logout"/g) || []).length, 1);
  assert.match(html, /<button type="button" class="sidebar-nav__item sidebar-nav__logout" data-action="logout" aria-haspopup="dialog" aria-controls="logout-dialog">/);
  assert.equal((html.match(/id="logout-dialog"/g) || []).length, 1);
  assert.match(html, /aria-labelledby="logout-title" aria-describedby="logout-description"/);
  assert.match(html, /data-cancel-logout autofocus/);
  assert.match(html, /data-confirm-logout/);
  assert.equal((html.match(/src="\.\.\/js\/session.js"/g) || []).length, 1);
  assert.ok(!html.includes('sidebar-nav__logout is-disabled'));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `IDs únicos en ${page}`);
}
const css = fs.readFileSync('css/styles.css', 'utf8');
assert.match(css, /button\.sidebar-nav__logout \{ display: flex; grid-column: 1 \/ -1;/);
assert.ok(fs.existsSync('index.html'));
console.log('OK: confirmación en siete pantallas, cancelar, Escape, foco, login, doble clic, caché y acceso móvil.');
