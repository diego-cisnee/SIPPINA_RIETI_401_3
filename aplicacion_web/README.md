# Prototipo de dashboard web

Este proyecto se construirá por etapas como un prototipo navegable en HTML y CSS.
Los datos serán ficticios hasta que se conecten la base de datos, la API y la app móvil.

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
| Cambiar estado y asignar autoridad | Formularios y confirmación simulada | Aprobado por continuación |
| Seguimiento de reporte | Información, origen y acciones rápidas | Aprobado por continuación |
| Estadísticas / Reportes | Tabla ampliada, filtros y orden ajustado | Aprobado por continuación |
| Estadísticas / Gráficos | Cuatro gráficas, resúmenes y filtros | Aprobado por continuación |
| Estadísticas / Rendimiento | Autoridades, indicadores y búsqueda automática | Pendiente |
| Perfil de administrador | Propuesta de prueba, solo consulta | Pendiente; sujeto a cambios o eliminación |
| Cerrar sesión | Confirmación y regreso al login, simulados | Pendiente de revisión |
| Eliminar reporte | Aviso, casilla obligatoria y confirmación simulada | Pendiente de revisión |
| Preparación para API/base de datos | Pendiente | Pendiente |
| Revisión responsive y accesibilidad | Pendiente | Pendiente |

## Estructura

- `index.html`: pantalla de inicio de sesión y punto de entrada.
- `css/styles.css`: variables visuales y estilos compartidos.
- `js/app.js`: interacciones locales, como visualizar la contraseña.
- `js/session.js`: confirmación compartida de cierre; cancelar conserva la pantalla y confirmar vuelve al login sin autenticación real.
- `js/delete-report.js`: confirmación de eliminación por folio, con casilla que habilita el botón rojo. No elimina datos.
- `pages/dashboard.html`: pantalla principal con resumen de reportes.
- `pages/reportes.html`: filtros, métricas y listado general de reportes.
- `pages/reporte.html`: seguimiento del folio seleccionado y ruta de origen.
- `pages/estadisticas.html`: primera pestaña de estadísticas, listado ampliado de reportes.
- `pages/graficos.html`: gráficas por estatus, mapa pendiente, municipio y tendencia mensual.
- `pages/rendimiento.html`: indicadores no disponibles por ausencia de asignaciones y fechas de resolución.
- `pages/perfil.html`: perfil experimental del administrador, accesible desde el bloque del usuario.
- `css/profile.css`: estilos aislados de la propuesta de perfil.
- `js/performance-data.js`: colección vacía; se retiró la muestra ficticia.
- `js/performance.js`: estado no disponible para indicadores sin base de cálculo.
- `css/performance.css`: presentación de Rendimiento, aislada de los estilos de las gráficas.
- `js/charts.js`: cálculos, filtros y resúmenes escritos sobre los reportes consultados de la API.
- `css/charts.css`: presentación adaptable de las gráficas y su diálogo de resumen.
- `js/report-data.js`: consultas GET de reportes, catálogo real de filtros y renderizado seguro.
- `js/report-detail.js`: carga del detalle, ruta, avisos y opción de impresión.
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
el seguimiento consulta `/api/reportes/:id` usando `id_reporte`. No hay escrituras
a MySQL. Las acciones de modificación siguen simuladas y el mapa queda pendiente.

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

Los últimos 30 días incluyen hoy en America/Mexico_City; fechas inválidas o futuras no cuentan como recientes. Prioridades desconocidas aparecen como Sin especificar. Ver todo el estado conserva el filtro de prioridad. Las coordenadas exactamente sobre límites compartidos conservan el criterio de ray casting y primer polígono coincidente; acordar política antes de usos de precisión.

Prueba del navegador: `node work/test-heatmap.cjs` con Playwright disponible mediante NODE_PATH. Usa datos controlados solo en pruebas y verifica API, duplicados, prioridades, enlaces, catálogo parcial/grises, filtros, vacío, error y móvil. El backend tiene pruebas SELECT en `npm test`.
