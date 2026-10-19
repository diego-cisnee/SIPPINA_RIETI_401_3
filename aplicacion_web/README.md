# Prototipo de dashboard web

Este proyecto se construirá por etapas como un prototipo navegable en HTML y CSS.
Reportes, mapas y rendimiento consultan datos reales de la API. Login y administración
de cuentas utilizan Express. Las acciones rápidas guardan estado, comentarios,
historial y bajas lógicas con los permisos de la sesión.

## Forma de trabajo

1. El usuario comparte una pantalla, referencia o descripción del flujo.
2. Se implementa un bloque pequeño y verificable.
3. Se presenta el resultado para revisión.
4. Solo después de la aprobación se continúa con el siguiente bloque.

## Estado del proyecto

| Etapa | Estado | Aprobación |
| --- | --- | --- |
| Estructura inicial | Preparada | Aprobada por continuación |
| Sistema visual | Implementado según referencias | Aprobado por continuación |
| Login | Implementado | Aprobado por continuación |
| Dashboard principal | Implementado | Aprobado por continuación |
| Gestión de reportes | Implementada | Aprobada por continuación |
| Cambiar estado | Guardado transaccional e historial; autoridad automática por municipio | Asignación manual retirada el 18/10/2026 |
| Seguimiento de reporte | Información, origen y acciones rápidas | Aprobado por continuación |
| Estadísticas / Reportes | Tabla ampliada, filtros y orden ajustado | Aprobado por continuación |
| Estadísticas / Gráficos | Cuatro gráficas, resúmenes y filtros | Aprobado por continuación |
| Estadísticas / Rendimiento | Consulta real por municipio, procurador actual, filtros y CSV; tiempos calculados desde el historial | Implementado el 18/10/2026 |
| Perfil de administrador | Propuesta de prueba, solo consulta | Pendiente; sujeto a cambios o eliminación |
| Cerrar sesión | Invalida la sesión en Express antes de volver al login | Implementado el 18/10/2026 |
| Eliminar reporte | Baja lógica de administrador, con confirmación e historial | Pendiente de revisión |
| Preparación para API/base de datos | Pendiente | Pendiente |
| Revisión responsive y accesibilidad | Pendiente | Pendiente |

## Estructura

- `index.html`: pantalla de inicio de sesión y punto de entrada.
- `css/styles.css`: variables visuales y estilos compartidos.
- `js/app.js`: interacciones locales, como visualizar la contraseña.
- `js/api.js`: origen común y peticiones con cookie de sesión.
- `js/auth.js`: valida la sesión, presenta identidad y controla acceso a páginas privadas.
- `js/login.js`: login de administrador o procurador contra Express.
- `js/registro.js` y `js/password-reset.js`: registro y restablecimiento, solo con sesión de administrador.
- `js/session.js`: confirmación compartida y cierre real de sesión en Express.
- `js/delete-report.js`: confirmación de eliminación por folio, con casilla que habilita el botón rojo. Guarda historial y cambia active a 0; conserva el registro.
- `pages/dashboard.html`: pantalla principal con resumen de reportes.
- `pages/reportes.html`: filtros, métricas y listado general de reportes.
- `pages/reporte.html`: seguimiento del folio seleccionado y ruta de origen.
- `pages/estadisticas.html`: primera pestaña de estadísticas, listado ampliado de reportes.
- `pages/graficos.html`: gráficas por estatus, mapa pendiente, municipio y tendencia mensual.
- `pages/rendimiento.html`: resultados de reportes activos por municipio y procurador actual; tiempo de resolución según el último cambio a Concluido.
- `pages/perfil.html`: datos de la cuenta autenticada y acceso de administradores a Administrar cuentas.
- `pages/acerca.html`: propósito, contexto académico, equipo creador y contacto pendiente. Desde el menú lateral (`?origen=panel`) conserva la navegación del sistema; desde el inicio de sesión muestra la presentación pública con acceso al login. El parámetro solo controla la presentación.
- `css/about.css`: presentación adaptable de la página Acerca de RIETI.
- `css/profile.css`: estilos aislados de la propuesta de perfil.
- `js/performance-data.js`: consulta GET de `/api/rendimiento`, sin datos ficticios.
- `js/performance.js`: tabla, métricas ponderadas, búsqueda accesible y exportación CSV de los municipios filtrados.
- `css/performance.css`: presentación de Rendimiento, aislada de los estilos de las gráficas.
- `js/charts.js`: cálculos, filtros y resúmenes escritos sobre los reportes consultados de la API.
- `css/charts.css`: presentación adaptable de las gráficas y su diálogo de resumen.
- `js/report-data.js`: consultas GET de reportes, catálogo real de filtros y renderizado seguro.
- `js/report-detail.js`: carga del detalle, ruta, avisos y opción de impresión.
- `js/report-history.js`: línea de tiempo real agrupada por fecha, autores, cambios y filtros.
- `pages/`: aquí se agregarán las siguientes pantallas HTML.
- `assets/`: imágenes, iconos y otros recursos visuales aprobados.
- `docs/decisions.md`: registro de decisiones y aprobaciones.

## Convenciones para la integración futura

Los cambios de perfil son experimentales. El respaldo anterior a estas pruebas se conserva sin modificar en `outputs/RIETI-respaldo-antes-de-cambios-2026-09-03.zip`.

- Los elementos que recibirán datos tendrán atributos `data-field`.
- Las colecciones repetibles tendrán atributos `data-list`.
- Las acciones futuras tendrán atributos `data-action`.
- Los comentarios `INTEGRACIÓN FUTURA` indicarán los puntos destinados a JavaScript, API o base de datos.

## Integración de lectura

Iniciar la API con `npm start` desde `backend` y servir esta carpeta en
`http://127.0.0.1:4173`. Las vistas consultan `http://127.0.0.1:3000/api/reportes`;
el seguimiento consulta `/api/reportes/:id` usando `id_reporte`. Las consultas de reportes no modifican MySQL; las altas de cuentas y el
restablecimiento de contraseñas sí guardan sus cambios. Las acciones de modificación siguen simuladas y el mapa queda pendiente.

En Gestión de reportes, Estadísticas / Reportes y Gráficos, los filtros se aplican
al escribir o seleccionar un valor, sin pulsar buscar. `Limpiar filtros` restaura
la consulta completa y elimina los avisos de fechas inválidas. Un rango invertido
muestra un aviso y conserva los últimos resultados hasta corregirlo o limpiarlo.
En Gráficos también restaura el período inicial de tendencia; `Limpiar período`
restaura solo ese período (agrupación mensual y fecha más reciente de los datos).
Rendimiento consulta `/api/rendimiento` y filtra por municipio al escribir.
La autoridad es el procurador activo actual del municipio. Las tasas usan los
reportes activos de los municipios filtrados; la tasa global se calcula con los
totales, sin promediar porcentajes municipales. Exportar descarga los municipios
filtrados. Los tiempos se calculan entre registro y último cambio a Concluido usando el
historial. Solo participan concluidos con fecha válida; se muestra la cobertura y
el promedio global se pondera por reportes. Sin fecha registrada, se muestra “No disponible”.
Sin procurador se indica “Sin procurador registrado”; una multiplicidad de activos
se muestra como conflicto. El cambio de procurador no altera autores históricos.

Los estados de reportes corresponden a la restricción `chk_reporte_estatus` de
RDS: `Registrado`, `En_revision`, `En_seguimiento`, `Canalizado`, `Concluido`,
`Archivado`, `Cancelado` y `Reincidente`. El catálogo compartido en
`js/report-data.js` alimenta el filtro de estados y los formularios. Las etiquetas
En revisión y En seguimiento conservan sus valores con guion bajo en los controles,
los datos y el CSV. Indicadores: Registrados = Registrado; En atención = En_revision,
En_seguimiento y Canalizado; Concluidos = Concluido. Archivado, Cancelado y Reincidente
cuentan en el total y la distribución, sin sumarse a esos tres indicadores.
Las acciones de cambio de estado siguen simuladas; esta alineación no escribe en RDS.

La API devuelve exclusivamente reportes con `active = 1`; las métricas, filtros y
exportación usan esa misma consulta. No existe una opción para mostrar inactivos.
El mapa del dashboard usa `/api/mapa-calor`, igual que el mapa de calor, para
respetar el filtro del backend; dejó de consultar la Lambda independiente.
`node work/test-dashboard-map.cjs` verifica esa fuente sin navegador ni acceso a RDS.

Gestión de reportes muestra 10 reportes por página, conservando el orden de la API.
Previo, Siguiente y los números navegan por los resultados filtrados; aplicar o
limpiar filtros vuelve a la primera página. Los indicadores generales conservan
su total y el CSV sigue exportando todos los reportes consultados, no solo la página
visible. La paginación es local sobre la respuesta de reportes activos; no agrega
consultas, escrituras ni acceso a inactivos.

Prueba vigente: `work/test-api-integration.cjs` usa Playwright instalado, un servidor
local y respuestas controladas para verificar todas las vistas, filtros, navegación,
diálogos, errores, vacíos y solicitudes exclusivamente GET. Ejecutar con
`node work/test-api-integration.cjs` (configurar `NODE_PATH` si la dependencia es externa).
Los archivos de pruebas anteriores reflejan las muestras del prototipo y ya no validan
el contrato de datos de esta integración.

## Estadísticas / Mapa de calor

Abrir `/pages/mapa-calor.html` con el backend iniciado (`npm start` en backend). La página consulta exclusivamente GET `/api/mapa-calor`, con el mismo criterio de `window.RIETI_API_BASE` de las demás vistas. No contiene muestras ni credenciales. Reiniciar el backend después de incorporar la ruta nueva.

- `js/heatmap/page.js`: carga, error y ciclo de vida.
- `js/heatmap/data.js`: carga API y asignación espacial por polígonos, respetando huecos y partes separadas. Sin asignaciones nuevas al cambiar filtros.
- `js/heatmap/config.js`: radio fijo 20 px, escala verde-rojo del calor, azul municipal y colores de prioridad.
- `js/heatmap/controls.js`, `information.js`, `statistics.js`: filtros y conteos sobre la selección.
- `assets/heatmap/data/municipios.geojson`: 125 geometrías originales INEGI. Fuente y metadatos en `fuente.json`. EPSG:6365 ITRF2008, sin transformación de datum; cartografía diciembre de 2025, descargada el 9 de octubre de 2026. Límites geoestadísticos, sin certificación legal ni precisión topográfica.
- Leaflet 1.9.4 y Leaflet.heat 0.2.0 fijados, con licencias en vendor. El recorte utiliza `_redraw`; verificarlo antes de actualizar.

La API entrega el catálogo de Municipio (`clave` = clave INEGI). El selector lo restringe a municipios con reportes ubicados dentro de sus polígonos mediante coordenadas. No usa id_municipio de Reporte para excluir puntos: ese vínculo puede diferir de su ubicación geográfica. La fila estatal 15000 no es un municipio. Solo las claves del catálogo que corresponden a polígonos aparecen en el selector; el resto de polígonos permanece gris y no es seleccionable. Los puntos fuera del estado o con coordenadas inválidas se excluyen; los de municipios no registrados se omiten y se informa su cantidad.

Cada punto conserva su pareja de coordenadas de Ubicacion_Reporte, folio y prioridad de Reporte. Hover muestra folio y prioridad; clic abre una ventana con enlace al seguimiento, cuyo Volver regresa al mapa. Cuando un reporte tiene varias ubicaciones, se dibujan todas, pero el total, prioridades y recientes cuentan folios únicos por selección; cada municipio cuenta el folio una vez. El calor depende de las ubicaciones, radio y zoom, y no es un conteo absoluto.

Los últimos 30 días incluyen hoy en America/Mexico_City; fechas inválidas o futuras no cuentan como recientes. Prioridades desconocidas aparecen como Sin especificar. Ver todo el estado conserva el filtro de prioridad. Limpiar filtros elimina la selección de municipio y prioridad y muestra todo el estado, conservando las opciones de visualización. Las coordenadas exactamente sobre límites compartidos conservan el criterio de ray casting y primer polígono coincidente; acordar política antes de usos de precisión.

Prueba del navegador: `node work/test-heatmap.cjs` con Playwright disponible mediante NODE_PATH. Usa datos controlados solo en pruebas y verifica API, duplicados, prioridades, enlaces, catálogo parcial/grises, filtros, vacío, error y móvil. El backend tiene pruebas SELECT en `npm test`.

### Verificar Rendimiento con datos reales

Con el backend iniciado y conectado a RDS, ejecutar desde esta carpeta:
`node work/test-performance.cjs`. Requiere Chrome y Playwright resoluble mediante
`NODE_PATH`, igual que las otras pruebas de navegador. Para otro origen local,
definir `RIETI_TEST_BASE_URL`. Esta prueba consulta la API real, no genera registros
ni sustituye respuestas; verifica datos, filtros, métricas, CSV y errores de red.

## Autenticación · 18 de octubre de 2026

Ver `../backend/AUTENTICACION.md`. Login y registro ya no utilizan Lambdas.
Seleccionar el tipo de cuenta en el login. El administrador puede abrir Mi perfil →
Administrar cuentas para registrar administradores y procuradores o restablecer una contraseña.
El procurador recibe solo reportes, mapas y rendimiento de su municipio desde la
API y no ve controles administrativos. Cambiar estado, bajas e historial están integrados; ver backend/REPORTES.md. Las cuentas antiguas cuyo formato no sea bcrypt requieren que un
administrador restablezca su contraseña; no se modificaron automáticamente.

Las pruebas HTTP del backend usan datos aislados y no escriben en RDS.
`npm run test:auth-browser` desde backend (con Playwright resoluble mediante
NODE_PATH y Chrome instalado) comprueba los formularios y las sesiones con una base
local aislada, sin llamadas a Lambda ni a RDS.

La prueba de Rendimiento con API real requiere `RIETI_TEST_COOKIE` con una sesión
válida y privada. No guardar ni compartir esa cookie; la prueba solo realiza GET.

## Acciones e historial · 18 de octubre de 2026

Los acuerdos antiguos sobre acciones simuladas quedan sustituidos por la integración
persistente descrita en [REPORTES.md](../backend/REPORTES.md). Los cambios solo
se confirman después de la respuesta de Express; ante errores se conserva el formulario.
El detalle muestra los movimientos y la última actualización reales. No se hicieron
altas ni modificaciones de reportes reales para las pruebas.

El promedio de resolución excluye bajas, casos reabiertos y concluidos sin una
transición registrada; los comentarios posteriores al cierre no cambian su duración.
El CSV agrega el número de casos con fecha de resolución.

Rendimiento solo muestra municipios con al menos un reporte activo, en cualquier
estado. Los municipios sin reportes o con solo bajas quedan fuera de tabla,
sugerencias y exportación; se mantiene el alcance municipal del procurador.

El indicador de días promedio del Dashboard usa el total de duraciones y casos
medibles de `/api/rendimiento`, sin promediar promedios municipales. Admin incluye
todos los municipios y procurador solo su municipio. Muestra cobertura, falta de
fechas y errores de consulta sin bloquear el listado de reportes.

## Login a pantalla completa · 18/10/2026

El index usa assets/logo-rieti-completo.png, ocupa la ventana sin scroll en los
tamaños de escritorio, móvil y horizontal verificados, y ya no muestra recuperación
de contraseña. css/login.css mantiene estos ajustes aislados del dashboard.
Al abrir index se comprueba la sesión en Express; si es válida redirige al dashboard
o al registro administrativo si next=registro. No usa localStorage como identidad.
La sesión recordada conserva siete días; sin recordar mantiene la duración anterior.

## Detalle e historial · 18/10/2026

Se retiraron los avisos de consulta exitosa/de lectura y el apartado de fotografías.
El historial está en un panel de ancho completo debajo de la información del caso,
inspirado en la referencia local historial-reportes. Conserva la paleta azul y
los datos de Express: iniciales y rol del autor, fechas, valores anterior/nuevo y
comentarios. Los filtros son locales: toda la actividad, estado, prioridad y comentarios.
Un movimiento combinado aparece una sola vez; puede coincidir con varios filtros.
No se agregan eventos de creación ni movimientos de demostración.

## Tendencia de registros y conclusiones · 18/10/2026

La API de reportes entrega `resolvedAt` como día ISO de la última entrada a
Concluido registrada en el historial, con el mismo criterio de Rendimiento.
La tendencia cuenta registros por `date` y conclusiones por `resolvedAt`,
conservando las agrupaciones por día, semana y mes y los filtros existentes.
Los comentarios posteriores no cambian el día de conclusión; los reabiertos,
las bajas y las fechas desconocidas o inválidas no generan conclusiones.

## Exportación PDF de Gráficos · 19/10/2026

Exportar PDF descarga `graficas_rieti.pdf` con las gráficas visibles rasterizadas
como imágenes, los filtros aplicados y el período de tendencia. Conserva los
colores y datos de la vista. Las bibliotecas locales se cargan al exportar.
La opción permanece exclusiva para administradores y se deshabilita sin resultados
o ante errores de la API. Un fallo de generación permite reintentar.
