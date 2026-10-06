# Backend RIETI

Esqueleto básico de Node.js y Express para conectar el dashboard y, más adelante,
la aplicación móvil con una base MySQL alojada en AWS RDS.

## Preparación

1. Copiar `.env.example` como `.env`.
2. Completar `.env` con el endpoint, puerto, base, usuario y contraseña de RDS.
3. Confirmar que el grupo de seguridad de RDS permite la conexión desde el equipo.
4. Ejecutar `npm start`.

El archivo `.env` está excluido de Git y nunca debe publicarse.
Node.js carga ese archivo mediante la opción nativa `--env-file-if-exists`, por lo
que no se necesita una dependencia adicional para leerlo.

El repositorio ya incluye un `.env` local vacío para completar en este equipo.
Git lo ignora; otros integrantes crearán el suyo a partir de `.env.example`.

## Pruebas disponibles

- `GET http://127.0.0.1:3000/test`: comprueba Node.js y Express.
- `GET http://127.0.0.1:3000/test-db`: ejecuta `SELECT 1` para comprobar RDS sin modificar datos.

## Integración futura

Las rutas de usuarios, reportes, autoridades y estadísticas se agregarán después
de comprobar la conexión y revisar las tablas existentes.
