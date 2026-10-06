const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
const port = Number(process.env.PORT || 3000);
const requiredDatabaseVariables = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD'
];

// Permite que el dashboard local envíe solicitudes a esta API.
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://127.0.0.1:4173'
}));

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

// Aquí se conectarán después las rutas de usuarios, reportes y estadísticas.

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
