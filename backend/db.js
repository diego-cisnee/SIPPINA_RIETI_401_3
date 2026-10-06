const mysql = require('mysql2/promise');

/*
 * CONEXIÓN FUTURA CON AWS RDS
 * Los valores reales se leen desde `backend/.env`, archivo que Git ignora.
 * No se deben escribir contraseñas directamente dentro de este archivo.
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // El pool reutiliza conexiones cuando el dashboard o la app hagan peticiones.
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  // Evita que una prueba permanezca esperando indefinidamente.
  connectTimeout: 10000
});

module.exports = pool;

