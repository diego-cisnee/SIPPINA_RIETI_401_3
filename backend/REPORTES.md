# Acciones de reportes e historial

Implementado el 18 de octubre de 2026 sobre el esquema existente. No requiere
migraciones. Las pruebas de escritura usan una base aislada; en RDS solo se
consultaron estructura, disparadores, longitudes y datos para comprobar lecturas.
No se cambiaron reportes ni se insertaron historiales reales durante el desarrollo.

## Permisos y API

Todas las rutas exigen sesión. El municipio y el autor provienen de `request.auth`;
no se aceptan identificadores de autor ni municipio enviados por el navegador.

- `GET /api/reportes` y `GET /api/reportes/:id` incluyen `version` (opaca) y
  `updatedAt` (último movimiento o null). Solo devuelven `active = 1`.
- `PATCH /api/reportes/:id/estado` recibe `{version, status, comments?, priority?}`.
  Admin: cualquier reporte, estado y prioridad. Procurador activo: exclusivamente
  reportes de su municipio, estado y comentarios; enviar `priority` devuelve 403.
- `DELETE /api/reportes/:id` recibe JSON `{version}`. Solo administrador. Guarda
  historial y cambia exclusivamente `active` a 0. No ejecuta DELETE SQL.
- `GET /api/reportes/:id/historial` devuelve `{data: [...]}`, más reciente primero.
  Cada entrada incluye estado/prioridad anterior y siguiente, fecha, comentarios y
  autor `{id, role, name}`. No hay una ruta pública para consultar bajas o restaurarlas.

Se aceptan los ocho estados de `chk_reporte_estatus` y prioridades Baja, Media y
Alta. Comentarios opcionales, hasta 2000 caracteres. Se permite un movimiento
solo de comentario; un envío sin cambio y sin comentario devuelve 400.
JSON obligatorio y protección de origen en las escrituras. CORS admite PATCH y DELETE.

## Consistencia y concurrencia

1. Validar datos y permisos del rol.
2. Iniciar transacción en una conexión del pool y bloquear el reporte activo con
   `SELECT ... FOR UPDATE`, incluyendo el municipio si el autor es procurador.
3. Consultar la versión después de obtener el bloqueo. Incluye una huella de todos
   los campos del reporte y el último ID de historial; detecta también comentarios
   y cambios que vuelven al estado anterior. El primer SELECT no bloqueante de la
   transacción ocurre después del bloqueo para no reutilizar una vista anterior.
4. Si difiere de la versión del formulario, devolver 409 sin guardar. Un reintento
   de una operación confirmada tampoco genera otro historial. Esto es rechazo de
   versiones antiguas, no una garantía de repetir la misma respuesta HTTP.
5. Copiar los valores anteriores a `Reporte_Historial`. Su `estatus` y `prioridad`
   son los anteriores; `fecha` es la original. `modificacion_fecha` usa el reloj de
   MySQL. Escribir exactamente un autor: `id_administrador` o `id_procurador`.
   Los comentarios no reemplazan `Reporte.descripcion`. La baja se identifica con
   el comentario de sistema `Eliminación lógica del reporte (active=0).`.
6. Actualizar el estado/prioridad o active y confirmar ambas escrituras juntas.
   Cualquier fallo revierte la transacción y libera o descarta la conexión.

La API de historial reconstruye el estado siguiente con la copia anterior del
movimiento posterior, o el estado actual para el último movimiento. Esto respeta
el diseño existente sin agregar columnas para estado anterior/nuevo. No inventa
movimientos retroactivos para reportes que no tenían historial. Cambios efectuados
por otros servicios directamente en Reporte no generan historial en esta API.

El esquema actual permite TEXT para `Reporte.imagen_url` y VARCHAR(255) en su
historial. Una evidencia de más de 255 caracteres rechaza la operación completa;
no se trunca ni se guarda una copia incompleta. Los reportes activos consultados
no superaban ese límite. Antes de admitir evidencias mayores, igualar los tipos
mediante una migración revisada. No se aplicó ningún ALTER.

Las llaves existentes de historial conservan `ON DELETE SET NULL` para procurador
y `ON DELETE CASCADE` para reporte; no se modificaron. La baja lógica evita activar
el borrado en cascada del reporte. Una eliminación física por otro servicio puede
seguir afectando el historial según esas reglas de la base.

## Interfaz

Dashboard, Gestión, Estadísticas y detalle utilizan la misma acción persistente.
El formulario conserva estado, prioridad y comentario ante errores; un conflicto
ofrece recargar. No muestra éxito hasta recibir confirmación del servidor. Al cerrar
la confirmación consulta nuevamente la página para actualizar filas, indicadores,
mapa e historial. La baja solicita confirmación con casilla y retira el reporte tras
la respuesta; desde el detalle vuelve al listado de origen.

El detalle muestra historial, autores, cambios, comentarios y última actualización,
con estados de carga, vacío y error con reintento. Los textos se insertan con
`textContent`. Las cuentas sin historial no muestran datos de muestra.

Ante una pérdida de conexión, el cliente no puede afirmar si el servidor confirmó
el cambio: pide recargar y comprobar antes de reenviar. La versión evita duplicarlo
si la primera operación llegó a confirmarse.

## Verificación

- `npm test` en backend: autenticación y acciones; incluye concurrencia, reversión
  de historial/actualización/commit, validaciones, roles y baja lógica.
- `node ../aplicacion_web/work/test-report-actions.cjs`: Chrome con Express real y
  base transaccional aislada. Usa Playwright disponible mediante NODE_PATH.
- `npm run test:auth-browser`: regresión de login, registro y administración.

Reiniciar el backend local o EC2 para cargar las rutas nuevas. No hay cambios
aplicados a EC2 ni modificaciones de HTTPS en esta implementación.

## Tiempo de resolución en Rendimiento

Se mide desde `Reporte.fecha` hasta `Reporte_Historial.modificacion_fecha` del
último cambio a Concluido. El historial contiene el estado anterior: para un reporte
actualmente concluido, su última copia con un estado distinto de Concluido es la
entrada a ese estado, pues todas las copias posteriores ya eran Concluido. Por eso
los comentarios y cambios de prioridad posteriores no prolongan la resolución.
Si la última copia candidata tiene un estado anterior desconocido, se excluye por
falta de evidencia suficiente. No se usa la fecha de la última edición como sustituto.

Solo participan reportes activos actualmente concluidos. Una reapertura los retira
del cálculo hasta concluir otra vez; entonces se mide desde el registro original
hasta la nueva conclusión. No se suman únicamente intervalos de atención. Los
casos sin historial de transición, sin fecha, con fecha anterior al registro o con
fecha futura quedan fuera del promedio, aunque siguen contando como concluidos
para las tasas. No se generan fechas retroactivas ni nuevas columnas.

La duración se calcula en segundos con el reloj de MySQL; `averageDays` divide su
suma entre `measuredResolved` y 86400. El promedio global usa esas mismas sumas,
ponderando por reportes y sin promediar promedios municipales. La interfaz muestra
días con hasta dos decimales y la cobertura de casos medibles; cero es un tiempo
válido. Una duración positiva que redondearía a cero se muestra como <0.01 días.
El CSV incluye el promedio numérico sin redondear y el número de concluidos con
fecha registrada. Sin casos medibles se muestra No disponible.

`performance.js` usa una consulta SELECT con CTE y parámetros escapados por
mysql2, manteniendo el filtro municipal dentro del conjunto de reportes y del
resultado. No consulta información de ciudadanos.

Verificación adicional: `node --env-file-if-exists=.env work/verify-resolution-readonly.cjs`
desde backend comprueba el SQL en MySQL usando exclusivamente SELECT. Las CTE
de casos aislados solo existen durante la consulta; no se almacenan en tablas.
Cubre comentarios, reaperturas, segunda conclusión, bajas, fechas inválidas, ceros,
fracciones de día y reutilización con distintos municipios. La prueba de navegador
`work/test-performance-averages.cjs` comprueba tabla, cobertura, promedio ponderado,
filtros y CSV. No se escribieron datos de reportes en RDS para implementar el cálculo.

### Fecha para la tendencia de conclusiones

El listado y el detalle incluyen `resolvedAt` (`YYYY-MM-DD` o `null`).
Proviene de la última copia del historial con estado anterior diferente de
Concluido, solo cuando el reporte actual está Concluido y la fecha es válida
entre el registro y el momento actual. Se usa el calendario de MySQL, sin
atribuir una zona horaria al DATETIME ni sustituirlo por `updatedAt`.
