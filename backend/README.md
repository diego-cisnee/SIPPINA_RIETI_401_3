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

## Consulta de reportes

- `GET /api/reportes`: listado completo, ordenado por fecha e `id_reporte` descendentes.
- `GET /api/reportes/:id`: seguimiento por `id_reporte` numérico; 400 si es inválido y 404 si no existe.
- Respuesta: `{ "data": [...] }` en listado y `{ "data": {...} }` en detalle.

Todas las consultas nuevas son SELECT parametrizados. Las relaciones demográficas
 y de ubicación se consultan por separado para evitar duplicar reportes. No se
consultan contraseñas ni se crean rutas de escritura. Los campos inexistentes no
se inventan: el frontend muestra “No disponible”.

El frontend usa `http://127.0.0.1:3000` por defecto. Para otra dirección, definir
`window.RIETI_API_BASE` antes de cargar `report-data.js`. Servir `aplicacion_web`
en `http://127.0.0.1:4173` o ajustar `CORS_ORIGIN` al origen de la interfaz.
Ejecutar `npm test` para verificar las consultas sin acceder a AWS.
