// Solo para las pruebas de renderizado con respuestas controladas. La autenticación
// real y sus permisos se verifican por separado en backend/auth.test.js y test-auth.cjs.
async function useAuthenticatedFixture(page) {
  await page.addInitScript(() => { window.RIETI_API_BASE = location.origin; });
  await page.route('**/api/auth/session', route => route.fulfill({ json: {
    success: true, user: { id: 1, role: 'administrador', name: 'Administrador aislado', email: 'admin@example.test', municipalityId: 1 },
  } }));
}
module.exports = { useAuthenticatedFixture };
