const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
class Node {
  constructor() { this.handlers = {}; this.open = false; this.focused = false; this.disabled = false; this.shows = 0; this.pending = Promise.resolve(); }
  addEventListener(name, handler) { (this.handlers[name] ||= []).push(handler); }
  fire(name, extras = {}) { const event = { preventDefault() { this.prevented = true; }, ...extras }; this.pending = Promise.all([this.pending, ...(this.handlers[name] || []).map(handler => handler(event))]); return event; }
  focus() { this.focused = true; }
  showModal() { this.open = true; this.shows++; }
  close() { this.open = false; this.fire('close'); }
}
(async () => {
const trigger = new Node(), dialog = new Node(), cancel = new Node(), confirm = new Node(), message = new Node();
dialog.querySelector = selector => selector === '[data-cancel-logout]' ? cancel : selector === '#logout-description' ? message : confirm;
const destinations = [], requests = [], removed = [];
let available = false;
const location = { replace: url => destinations.push(url) };
const window = { RIETI_API: { request: async (...args) => { requests.push(args); return { ok: available }; } } };
const document = { querySelector: selector => selector === '#logout-dialog' ? dialog : trigger };
const source = fs.readFileSync('js/session.js', 'utf8');
vm.runInNewContext(source, { document, window, location, localStorage: { removeItem: key => removed.push(key) } });
confirm.fire('click'); await confirm.pending; assert.equal(requests.length, 0);
trigger.fire('click'); assert.equal(dialog.open, true); assert.equal(cancel.focused, true);
cancel.fire('click'); assert.equal(dialog.open, false); assert.equal(trigger.focused, true);
trigger.fire('click'); assert.equal(dialog.fire('cancel').prevented, true); assert.equal(dialog.open, false);
trigger.fire('click'); confirm.fire('click'); await confirm.pending;
assert.equal(destinations.length, 0); assert.equal(confirm.disabled, false); assert.match(message.textContent, /No fue posible/);
available = true; confirm.fire('click'); confirm.fire('click'); await confirm.pending;
assert.deepEqual(destinations, ['../index.html']); assert.deepEqual(removed, ['id_admin']); assert.equal(requests.length, 2);
assert.equal(requests[1][0], '/api/auth/logout'); assert.equal(requests[1][1].method, 'POST');
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
console.log('OK: cierre real, error/reintento, cancelar, Escape, foco, doble clic y marcado de siete pantallas.');
})().catch(error => { console.error(error); process.exitCode = 1; });
