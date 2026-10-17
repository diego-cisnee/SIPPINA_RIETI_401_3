const mysql = require('mysql2/promise');
const fs = require('node:fs');

const sslCaFile = process.env.DB_SSL_CA_FILE;

if (process.env.NODE_ENV === 'production' && !sslCaFile) {
  throw new Error('Falta configurar DB_SSL_CA_FILE en producción.');
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  ssl: sslCaFile
    ? {
        ca: fs.readFileSync(sslCaFile),
        rejectUnauthorized: true,
        verifyIdentity: true
      }
    : undefined,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000
});

module.exports = pool;
