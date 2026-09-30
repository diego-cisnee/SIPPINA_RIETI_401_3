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
- `pages/graficos.html`: gráficas por estatus, concentración GPS provisional, municipio y tendencia mensual.
- `pages/rendimiento.html`: rendimiento por autoridad municipal y filtro con autocompletado.
- `pages/perfil.html`: perfil experimental del administrador, accesible desde el bloque del usuario.
- `css/profile.css`: estilos aislados de la propuesta de perfil.
- `js/performance-data.js`: muestra independiente de nueve autoridades ficticias, una por municipio.
- `js/performance.js`: búsqueda instantánea, sugerencias y cálculo de indicadores.
- `css/performance.css`: presentación de Rendimiento, aislada de los estilos de las gráficas.
- `js/charts.js`: cálculos, filtros y resúmenes escritos sobre los datos ficticios compartidos.
- `css/charts.css`: presentación adaptable de las gráficas y su diálogo de resumen.
- `js/report-data.js`: datos ficticios y catálogo provisional de tipos de trabajo.
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
