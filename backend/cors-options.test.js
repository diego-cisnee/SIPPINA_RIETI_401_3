const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isAllowedOrigin } = require('./cors-options');
test('Permite localhost y loopback en distintos puertos con CORS_ORIGIN configurado', () => {
 for (const origin of ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://127.0.0.1:4173', 'http://localhost:8080', 'http://[::1]:5500', undefined]) {
  assert.equal(isAllowedOrigin(origin, 'http://127.0.0.1:5500'), true);
 }
});
test('No admite orígenes externos salvo configuración explícita ni archivos con origen null', () => {
 for (const origin of ['http://localhost.example:5500', 'https://example.com', 'null', 'file:///tmp/test.html', 'http://localhost:5500/path']) assert.equal(isAllowedOrigin(origin), false);
 assert.equal(isAllowedOrigin('https://rieti.example', 'https://rieti.example'), true);
});
