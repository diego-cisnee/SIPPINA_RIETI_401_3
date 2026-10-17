# Backend RIETI

El cambio de estado con historial, la asignación a procuradores y la baja lógica
están pendientes. Los acuerdos y requisitos para retomarlos están en [PENDIENTES.md](PENDIENTES.md).

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

- `GET /api/reportes`: listado de reportes con `Reporte.active = 1`, ordenado por fecha e `id_reporte` descendentes.
- `GET /api/reportes/:id`: seguimiento por `id_reporte` numérico; 400 si es inválido y 404 si no existe o está inactivo.
- Respuesta: `{ "data": [...] }` en listado y `{ "data": {...} }` en detalle.

Todas las consultas nuevas son SELECT parametrizados. Las relaciones demográficas
 y de ubicación se consultan por separado para evitar duplicar reportes. No se
consultan contraseñas ni se crean rutas de escritura. Los campos inexistentes no
se inventan: el frontend muestra “No disponible”.

El frontend usa `http://127.0.0.1:3000` por defecto. Para otra dirección, definir
`window.RIETI_API_BASE` antes de cargar `report-data.js`. Servir `aplicacion_web`
en `http://127.0.0.1:4173` o ajustar `CORS_ORIGIN` al origen de la interfaz.
Ejecutar `npm test` para verificar las consultas sin acceder a AWS.

## Mapa de calor

GET `/api/mapa-calor`: `{data:{municipios:[{id,clave,nombre}],puntos:[{id,folio,id_ubicacion,latitud,longitud,direccion,estatus,prioridad,fecha_registro,intensidad}]}}`. Catálogo completo de Municipio y ubicaciones de reportes con `active = 1`; el cliente restringe el selector por pertenencia geográfica de las coordenadas, exclusivamente SELECT. Coordenadas numéricas; ausentes permanecen null. La dirección y el estado se usan en el mapa del dashboard, que consulta esta misma ruta. No incluye datos de ciudadanos, correos ni contraseñas. Reiniciar el backend al incorporar estos cambios.

## Folio visible

Las consultas de reportes y mapa de calor incluyen `Reporte.folio`. El frontend
muestra ese texto en tablas, detalle, diálogos, exportación CSV y puntos del mapa.
`id_reporte` permanece como identificador interno para consultas, enlaces y
conteos. Si falta el folio, se muestra “No disponible”, sin generar uno artificial.

## Posibles duplicados

`GET /api/reportes/:id/coincidencias` devuelve `{data: [...]}` con hasta cinco
candidatos únicos, folio y motivos. Devuelve 400 para un ID inválido y 404 si el
reporte no existe o está inactivo. Tanto el reporte original como los candidatos deben tener `active = 1`. Son consultas SELECT parametrizadas; no requiere tablas nuevas.

El filtrado por `active` es obligatorio en el backend y no tiene parámetros para
incluir inactivos. No se agrega una vista de bajas ni se modifican valores en RDS.

Criterios iniciales: mismo municipio, registros dentro de ±7 días y ubicación a
100 metros o menos, más coincidencia de tipo de trabajo o similitud de descripción
(Jaccard ≥0.6, al menos tres términos relevantes por descripción). Cuando faltan
coordenadas comparables se admite una dirección normalizada idéntica de al menos
10 caracteres. Se comparan las ubicaciones individualmente. Los límites están en
`duplicates.js` y son orientativos: el aviso no confirma un duplicado. Los casos
sin ubicación suficiente o fuera de estos criterios pueden quedar sin detectar.

El detalle muestra los motivos y permite abrir el candidato por su ID interno,
conservando el folio visible. El aviso solo aparece al encontrar coincidencias; permanece oculto durante la
consulta, si no hay candidatos o si ocurre un error, sin bloquear el detalle. No guarda
revisiones, no fusiona y no elimina datos.
