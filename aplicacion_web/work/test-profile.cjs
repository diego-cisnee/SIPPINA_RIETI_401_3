const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const pages = ['dashboard', 'reportes', 'reporte', 'estadisticas', 'graficos', 'rendimiento', 'perfil'];
for (const page of pages) {
  const html = fs.readFileSync(`pages/${page}.html`, 'utf8');
  const profileLink = html.match(/<a class="user-summary user-summary--profile"[^>]*>[\s\S]*?<\/a>/g);
  assert.equal(profileLink?.length, 1, `Acceso único en ${page}`);
  assert.match(profileLink[0], /href="perfil.html"/);
  assert.match(profileLink[0], /aria-label="[^"]+"/);
  assert.match(profileLink[0], /data-field="user-name">RIETI Admin/);
  assert.ok(!profileLink[0].includes('<button'));
  if (page === 'perfil') assert.match(profileLink[0], /aria-current="page"/);
}
const html = fs.readFileSync('pages/perfil.html', 'utf8');
for (const field of ['profile-full-name', 'profile-contact-email', 'profile-phone', 'profile-organization']) {
  assert.ok(html.includes(`data-field="${field}"`), `Campo ${field}`);
}
assert.match(html, /Versión de prueba/);
assert.ok(!html.includes('profile-department'));
assert.ok(!/profile-account-title|profile-permissions-title|profile-identity/.test(html));
assert.equal((html.match(/<section /g) || []).length, 1);
assert.match(html, /solo de consulta/);
assert.match(html, /administrador@example.com/);
assert.ok(!/<form|type="password"/.test(html));
assert.deepEqual([...html.matchAll(/<script src="([^"]+)"/g)].map(match => match[1]), ['../js/session.js']);
assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
for (const [, url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
  if (!url.startsWith('#')) assert.ok(fs.existsSync(path.resolve('pages', url)), `Destino ${url}`);
}
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length);
const css = fs.readFileSync('css/styles.css', 'utf8');
assert.match(css, /\.user-summary--profile:focus-visible/);
assert.match(css, /\.user-summary--profile \{ display: grid; grid-column: 1 \/ -1; grid-row: 2;/);
console.log('OK: acceso al perfil en siete pantallas, datos ficticios, destinos locales, consulta, foco y acceso móvil.');
