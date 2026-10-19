const pool = require('./db');
const { createApplication } = require('./application');
const app = createApplication({ pool });
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, '127.0.0.1', () => {
  console.log(`API RIETI disponible en http://127.0.0.1:${port}`);
});
server.on('error', error => {
  console.error('No fue posible iniciar la API:', error.message);
  process.exitCode = 1;
});
function closeServer(signal) {
  console.log(`${signal}: cerrando API RIETI...`);
  server.close(async () => { await pool.end(); process.exit(0); });
}
process.on('SIGINT', () => closeServer('SIGINT'));
process.on('SIGTERM', () => closeServer('SIGTERM'));
