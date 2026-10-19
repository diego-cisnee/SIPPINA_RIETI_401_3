# Backend RIETI

Login, sesiones y administración de cuentas ya se ejecutan en Express. Ver
[AUTENTICACION.md](AUTENTICACION.md) para configuración, cuentas existentes y despliegue.
`SESSION_SECRET` es obligatorio; el `.env.example` incluye las variables necesarias.

El cambio de estado, comentarios, historial y baja lógica ya están integrados.
Ver [REPORTES.md](REPORTES.md) para permisos, versiones, transacciones y pruebas.
La autoridad se obtiene automáticamente del procurador activo del municipio del
reporte; se retiró la asignación manual.

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
- `GET http://127.0.0.1:3000/test-db` (sesión de administrador): ejecuta `SELECT 1` para comprobar RDS sin modificar datos.

## Integración futura

Las rutas de autenticación, reportes, mapas y rendimiento ya están integradas.
Las acciones de cambio de estado, historial y baja lógica están implementadas; ver REPORTES.md.

## Consulta de reportes

- `GET /api/reportes`: listado de reportes con `Reporte.active = 1`, ordenado por fecha e `id_reporte` descendentes.
- `GET /api/reportes/:id`: seguimiento por `id_reporte` numérico; 400 si es inválido y 404 si no existe o está inactivo.
- Respuesta: `{ "data": [...] }` en listado y `{ "data": {...} }` en detalle.

Las consultas de reportes son SELECT parametrizados. Las relaciones demográficas
 y de ubicación se consultan por separado para evitar duplicar reportes. No se
consultan contraseñas ni se modifica la base desde estas rutas de reportes. Los campos inexistentes no
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
incluir inactivos. No se agrega una vista de bajas. La baja lógica modifica active únicamente al confirmar la acción administrativa.

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

## Procurador municipal y rendimiento · 18 de octubre de 2026

Listado y detalle incluyen `authority` y `authorityId`, derivados de
`Procurador.id_municipio = Reporte.id_municipio` y `Procurador.activo = 1`.
No se agregan columnas ni se guardan asignaciones en Reporte. Al cambiar el
procurador, cambia la autoridad actual mostrada; no se modifica el historial.
Si falta un procurador activo se muestra “Sin procurador registrado”. Si hay
varios activos en un municipio se indica el conflicto sin elegir uno ni duplicar
reportes.

`GET /api/rendimiento` devuelve `{data: [...]}` con una fila por municipio:
`municipalityId`, `municipality`, `authorityId`, `authority`, `authorityCount`,
`total`, `pending`, `progress`, `resolved`, `efficiency`, `averageDays`,
`measuredResolved` y `resolutionSeconds`.
Solo incluye municipios con al menos un reporte con `active = 1`, en cualquier
estado. Los municipios sin reportes activos no aparecen en la tabla, buscador ni CSV. `efficiency` es Concluido / total × 100, o null sin reportes.
Los otros estados siguen incluidos en el total. `averageDays` es el promedio de
días entre registro y último cambio a Concluido, únicamente entre concluidos con
transición y fecha válidas en el historial. `measuredResolved` cuenta esos casos y
`resolutionSeconds` suma sus duraciones sin redondear; permiten calcular un promedio
global ponderado. Sin casos medibles, `averageDays` es null. Comentarios o cambios
de prioridad posteriores no cambian la fecha de conclusión; si se reabre y concluye
de nuevo se usa la última conclusión. Son SELECT; no devuelve datos de ciudadanos.
Ver también REPORTES.md.
La sesión valida el rol; el procurador activo recibe únicamente los datos de su municipio.
