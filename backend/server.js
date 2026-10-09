const express = require('express');
const cors = require('cors');
const pool = require('./db');
const path = require('node:path');
const { corsOptions } = require('./cors-options');

const app = express();
const port = Number(process.env.PORT || 3000);
const requiredDatabaseVariables = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD'
];

// Permite que el dashboard local envíe solicitudes a esta API.
app.use(cors(corsOptions(process.env.CORS_ORIGIN)));

// Convierte automáticamente los cuerpos JSON de las futuras peticiones.
app.use(express.json());

// Prueba básica: confirma que Node.js y Express están funcionando.
app.get('/test', (request, response) => {
  response.json({
    success: true,
    message: 'API RIETI funcionando'
  });
});

// Prueba de base de datos: consulta RDS sin crear ni modificar información.
app.get('/test-db', async (request, response) => {
  const missingVariables = requiredDatabaseVariables.filter(
    (variableName) => !process.env[variableName]
  );

  if (missingVariables.length > 0) {
    return response.status(503).json({
      success: false,
      message: 'Faltan datos de conexión en el archivo .env',
      missing: missingVariables
    });
  }

  try {
    const [rows] = await pool.query('SELECT 1 AS connected');

    response.json({
      success: true,
      message: 'Conexión con la base de datos correcta',
      database: rows[0].connected === 1 ? 'connected' : 'unknown'
    });
  } catch (error) {
    // El detalle queda en la terminal; no se exponen credenciales al navegador.
    console.error('Error de conexión con la base de datos:', error.message);

    response.status(500).json({
      success: false,
      message: 'No fue posible conectar con la base de datos'
    });
  }
});

const { readReports } = require('./reports');
app.get(['/api/reportes', '/api/reportes/:id'], async (request, response) => {
  const id = request.params.id;
  if (id && !/^[1-9]\d*$/.test(id)) return response.status(400).json({ message: 'Identificador inválido' });
  try {
    const reports = await readReports(pool, id);
    if (id && !reports.length) return response.status(404).json({ message: 'Reporte no encontrado' });
    response.json({ data: id ? reports[0] : reports });
  } catch (error) {
    console.error('Error al consultar reportes:', error.code);
    response.status(500).json({ message: 'No fue posible consultar los reportes' });
  }
});

const { readHeatmap } = require('./heatmap');
app.get('/api/mapa-calor', async (request, response) => {
  try { response.json({data: await readHeatmap(pool)}); }
  catch(error) {
    console.error('Error al consultar mapa:', error.code);
    response.status(500).json({message:'No fue posible consultar los datos del mapa.'});
  }
});

// Alternativa de mismo origen: abrir http://127.0.0.1:3000/pages/dashboard.html.
app.use(express.static(path.join(__dirname, '../aplicacion_web')));

const server = app.listen(port, '127.0.0.1', () => {
  console.log(`API RIETI disponible en http://127.0.0.1:${port}`);
});

server.on('error', (error) => {
  console.error('No fue posible iniciar la API:', error.message);
  process.exitCode = 1;
});

// Cierra correctamente el servidor y el pool al detener el proceso.
async function closeServer(signal) {
  console.log(`\n${signal}: cerrando API RIETI...`);

  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => closeServer('SIGINT'));
process.on('SIGTERM', () => closeServer('SIGTERM'));
