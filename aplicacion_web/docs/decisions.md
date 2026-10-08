# Registro de decisiones y aprobaciones

## Bloque 0 — Inicio del proyecto

- Objetivo: crear un dashboard web navegable como prototipo.
- Tecnología actual: HTML y CSS sin dependencias externas.
- Datos: ficticios durante la fase de prototipo.
- Integraciones futuras: JavaScript, API, base de datos y app móvil.
- Método: revisión y aprobación del usuario al terminar cada bloque.
- Estado: aprobado por continuación al Bloque 1.

## Bloque 1 — Login y dashboard

- Referencias: capturas proporcionadas por el usuario.
- Login: correo electrónico, contraseña y acceso simulado al dashboard.
- Dashboard: métricas, gráfico de estados, mapa de calor temporal y reportes recientes.
- Interacción habilitada: acceso desde el login, “Ver todos” y apertura de un reporte.
- Alcance diferido: pantallas de todos los reportes y del reporte individual.
- Estado: aprobado con ajustes solicitados.

## Ajuste 1.1 — Acciones del login

- El icono de ojo permite mostrar y ocultar la contraseña.
- “¿Olvidaste tu contraseña?” abre un aviso temporal sin abandonar el prototipo.
- La futura página de recuperación todavía no se implementa.
- Estado: aprobado por continuación al Bloque 2.

## Bloque 2 — Gestión de reportes

- Acceso habilitado desde el menú lateral y “Ver todos” del dashboard.
- Filtros disponibles: municipio, estado, prioridad, fecha inicial y fecha final.
- Los filtros trabajan temporalmente con los datos ficticios de la tabla.
- Cada renglón completo abre el aviso del futuro detalle del reporte.
- El menú de tres puntos despliega “Cambiar estado”, “Asignar autoridad” y “Eliminar”.
- Las tres acciones permanecen sin funcionalidad hasta su siguiente bloque.
- “Actualizar” y “Exportar CSV” muestran avisos temporales.
- Estado: aprobado con mejoras solicitadas.

## Ajuste 2.1 — Menús y filas del dashboard

- Los menús de tres puntos se cierran al hacer clic fuera o presionar Escape.
- Los renglones del dashboard abren el aviso del reporte desde cualquier zona no interactiva.
- El dashboard incorpora las mismas opciones: cambiar estado, asignar autoridad y eliminar.
- Las opciones siguen sin ejecutar cambios en los datos.
- Estado: aprobado por continuación al Bloque 3.

## Bloque 3 — Cambiar estado y asignar autoridad

- Ambos formularios se abren desde los tres puntos en dashboard y gestión.
- Estado: muestra folio, estado y prioridad actuales; permite seleccionar nuevos valores y añadir comentarios.
- Se corrigió la etiqueta duplicada de la referencia a “Nueva prioridad”.
- Autoridad: solo incluye “Por definir”, sin catálogo real.
- Cancelar descarta los valores escritos; Escape también cierra el formulario.
- Actualizar muestra una confirmación con el resumen de la solicitud simulada.
- No se guardan datos, no se modifica la tabla ni se contacta una API.
- Eliminar continúa desactivado.
- Verificación: prueba local del controlador, validación y confirmación superada.
- Estado: aprobado por continuación al Bloque 4.

## Bloque 4 — Seguimiento de reporte

- Acceso real desde cada renglón del dashboard y gestión, con folio y origen en la URL.
- La ruta y Volver distinguen Dashboard de Gestión de reportes.
- Resumen: estado, prioridad, fecha de reporte y última actualización.
- Contenido: denunciante, ubicación, coordenadas, detalles del caso, evidencias, administrador, autoridad y comentarios.
- Los folios y datos principales coinciden con sus renglones; los datos adicionales son ficticios.
- Ver en mapa y descargar adjuntos muestran avisos sin servicios externos ni descargas.
- Acciones rápidas reutilizan los formularios de estado y autoridad y su confirmación simulada.
- Eliminar permanece desactivado; Imprimir abre el diálogo de impresión del navegador.
- No se guardan cambios en una base de datos.
- Verificación local: 11 folios, ambos orígenes, folios inválidos y formularios compartidos.
- Estado: aprobado por continuación al Bloque 5.

## Bloque 5 — Estadísticas / Reportes

- Primera pestaña implementada; Gráficos y Rendimiento permanecen pendientes.
- Columnas: folio, denunciante, municipio, tipo de trabajo, observaciones, autoridad, estatus, prioridad y fecha.
- Textos largos con elipsis visuales, información completa en seguimiento.
- Catálogo provisional: venta ambulante, limpieza de parabrisas, comercio, trabajo agrícola, construcción y trabajo doméstico.
- Catálogo compartido con el seguimiento para evitar valores distintos del mismo reporte.
- Filtros por municipio, tipo de trabajo y fechas; métricas calculadas sobre los 11 registros ficticios disponibles.
- Autoridades sin asignar hasta definir el catálogo real.
- Menú de acciones compartido; Actualizar y Exportar CSV conservan avisos temporales.
- Acceso al seguimiento con ruta de regreso a Estadísticas.
- Verificación local de catálogo, columnas, filtros, métricas, origen y formularios.
- Estado: implementado, pendiente de aprobación.

### Ajuste visual — Folio del aviso de eliminación

- Se amplía el folio hasta 1.6rem, con tamaño adaptable en móvil. No cambian los demás textos ni el comportamiento.

### Ajuste — Orden de columnas de Estadísticas

- Orden solicitado: folio, tipo de trabajo, observaciones, municipio, autoridad, estatus, prioridad, fecha y denunciante.
- El menú de tres puntos permanece al extremo derecho; los demás apartados y comportamientos no cambian.
- Estado: ajuste implementado, pendiente de aprobación.

## Bloque 6 — Estadísticas / Gráficos

- El bloque de Reportes y su orden de columnas quedan aprobados por continuación.
- Referencias: capturas de Gráficos compartidas por el usuario.
- Cuatro gráficas: distribución por estatus, mapa de concentración provisional, reportes por municipio y tendencia mensual.
- Todas permiten abrir un resumen escrito mediante clic, Enter o espacio, con aviso visible de interacción.
- Los resúmenes incluyen cantidades, porcentajes cuando corresponden y contexto de los filtros aplicados.
- Los cálculos reutilizan los 11 reportes ficticios del catálogo compartido, sin inventar totales independientes.
- Filtros por municipio, tipo de trabajo y fechas; aplicación al cambiar un valor o presionar buscar. Limpiar restaura la muestra completa.
- Cualquier filtro activo oculta Reportes por municipio y muestra una explicación. Sin filtros, reaparece.
- Fechas inclusivas, validación de rango y estados sin resultados.
- El mapa muestra concentración sobre coordenadas de muestra; no incorpora límites municipales oficiales. Su cartografía real queda pendiente.
- Gráficas SVG sin dependencias; puntos de integración futura comentados en JavaScript y HTML.
- Actualizar y Exportar mantienen avisos; Rendimiento continúa pendiente.
- Verificación local: cálculos, filtros combinados, resumen, cierre/foco, rangos inválidos, resultados vacíos y regresiones anteriores.
- Estado: implementado, pendiente de aprobación. No se publica ni se conecta a servicios externos en este bloque.

### Ajuste 6.1 — Texto de gráficas sin negritas

- Títulos y textos de las gráficas con peso normal.
- Se elimina el contorno heredado de los iconos en las etiquetas SVG, que engrosaba números y letras.
- No cambian los datos, filtros, resúmenes ni el resto de la interfaz.

### Ajuste 6.2 — Restaurar formato exterior

- Los títulos recuperan la negrita original y se retira el cambio general de peso del contenedor.
- Las gráficas conservan sus etiquetas sin negritas ni contorno; no se altera su contenido ni funcionamiento.

## Bloque 7 — Estadísticas / Rendimiento

- Gráficos y sus ajustes quedan aprobados por continuación. No se modifican sus gráficas ni estilos; solo se habilita la pestaña Rendimiento.
- Nueva vista según la referencia: autoridad, municipio, total asignados, pendientes, en proceso, finalizados, tiempo promedio y eficiencia.
- Una autoridad ficticia por municipio, con nueve municipios de muestra. El catálogo de asignación de reportes permanece sin cambios.
- Datos agregados independientes para esta pantalla, identificados como ficticios. No representan asignaciones de los 11 reportes del catálogo anterior.
- Filtro automático desde la primera letra, con coincidencias parciales y tolerancia a acentos, mayúsculas y espacios.
- Autocompletado con sugerencias seleccionables por clic o flechas y Enter; Escape, Tab y clic exterior cierran la lista. Limpiar restaura todas las autoridades.
- Tarjetas y tabla se recalculan sobre las coincidencias visibles.
- Fórmula provisional de eficiencia: finalizados / asignados × 100. Promedio en días ponderado por casos finalizados. Ambos criterios quedan visibles para aprobación.
- Los totales suman pendientes, en proceso y finalizados. Sin asignados o sin finalizados se muestra “—” donde no puede calcularse una tasa o promedio.
- No se incluyen variaciones contra un período anterior porque la muestra no contiene ese histórico.
- Actualizar y Exportar conservan avisos, sin operaciones externas.
- Verificación: unicidad municipal, cálculos, búsqueda parcial, acentos, autocompletado, teclado, cierres, cero, vacío y regresiones.
- Estado: implementado, pendiente de aprobación; sin conexiones ni publicación externa.

## Prueba 8 — Perfil del administrador

- Propuesta explícitamente experimental, sujeta a cambios o eliminación; no se considera diseño definitivo.
- Se conserva sin modificar el respaldo anterior a las pruebas.
- Acceso desde el bloque del nombre/avatar en dashboard, gestión, seguimiento y las tres vistas de estadísticas. También disponible en móvil y con teclado.
- Diseño basado en las tarjetas, colores, bordes y tipografía existentes. Estilos del perfil aislados en `css/profile.css`.
- Datos ficticios: alias RIETI Admin, nombre completo, correo, teléfono, área, organización, rol, identificador, ámbito, fecha de alta y último acceso de ejemplo.
- Funciones del administrador mostradas como propuesta; no se implementan permisos ni autenticación.
- Pantalla de consulta, sin formularios, almacenamiento ni cambio de contraseña. Campos preparados con comentarios y atributos para una futura API.
- Las gráficas y sus estilos no cambian; en las pantallas existentes solo cambia el acceso del bloque de usuario.
- Para retirar esta prueba: eliminar perfil y sus estilos, restituir el bloque de usuario como contenedor y retirar las reglas `user-summary--profile`. El respaldo permite recuperar la versión anterior completa.
- Verificación: navegación de siete pantallas, campos, enlaces locales, foco, acceso móvil y pruebas de regresión.
- Estado: implementado, pendiente de revisión del usuario.

### Ajuste 8.1 — Solo información personal

- Se conserva únicamente la tarjeta de información personal: nombre, correo, teléfono, área de trabajo y organización.
- Se retiran el resumen de identidad, los datos de cuenta y las funciones del administrador, junto con sus estilos no utilizados.
- La navegación, los datos ficticios y el carácter experimental se mantienen.

### Ajuste 8.2 — Retirar área de trabajo

- Se elimina el campo Área de trabajo del perfil. Se conservan nombre, correo, teléfono y organización sin otros cambios.

## Prueba 9 — Confirmar cierre de sesión

- Botón Cerrar sesión habilitado en la barra lateral de las siete pantallas internas, también en móvil.
- Aviso centrado con el diseño de los diálogos existentes: «¿Quieres cerrar sesión?», Cancelar y «Sí, cerrar sesión».
- Cancelar y Escape cierran el aviso sin navegar ni modificar datos. El foco inicial está en Cancelar y regresa al activador al cerrar.
- Confirmar sustituye la entrada actual del historial por el login mediante una ruta local fija. Se evita el doble clic.
- Se trata de navegación simulada: no hay sesiones reales, no se borran datos del navegador y las rutas aún no están protegidas.
- Comentarios de integración indican dónde invalidar la sesión en el servidor antes de redirigir y manejar un eventual error.
- Controlador independiente, sin alterar los gráficos ni el comportamiento de reportes y filtros.
- Cambios guardados directamente en la carpeta que el usuario abrió en VS Code; respaldo anterior intacto.
- Verificación: siete pantallas, apertura, cancelación, Escape, foco, confirmación, doble clic y restauración desde caché.
- Estado: implementado como prueba, pendiente de revisión.

## Prueba 10 — Aviso de eliminación de reporte

- Acciones rápidas del seguimiento y opciones Eliminar de dashboard, gestión y estadísticas abren el mismo aviso con el folio seleccionado.
- Advertencia visible: la acción no puede deshacerse. Casilla de aceptación inicialmente desmarcada.
- Botón Eliminar reporte deshabilitado y gris hasta marcar la casilla; al activarlo se vuelve rojo. Desmarcarla lo bloquea de nuevo.
- Cancelar y Escape cierran sin cambios. La aceptación se reinicia en cada apertura y el foco vuelve al activador.
- Confirmar muestra «Eliminación simulada» con el folio; no elimina filas, datos, archivos ni almacenamiento.
- Se evita la navegación de la fila al usar el menú y se cierran los tres puntos al abrir el aviso.
- Integración futura documentada: validar permisos y resultado de la API antes de indicar éxito real.
- Verificación: cuatro pantallas, folio correcto, bloqueo inicial, alternancia, cancelación, Escape, reapertura, foco y pruebas de regresión.
- Se mantiene como cambio de prueba guardado en la carpeta de VS Code. Al finalizar se abre el HTML en el navegador de la app, conforme a la preferencia del usuario.
- Estado: implementado, pendiente de aprobación.

## Integración RIETI — API MySQL de solo lectura

- Autorizada la conexión de dashboard, gestión, seguimiento y estadísticas con la API, manteniendo el diseño y sin modificar datos ni estructura de MySQL.
- Esquema verificado con SELECT sobre INFORMATION_SCHEMA: Reporte, Ciudadano, Municipio, Administrador, Demografico_Reporte y Ubicacion_Reporte. No se consultan contraseñas.
- Rutas GET `/api/reportes` y `/api/reportes/:id`; identificador real `id_reporte`, sin generar folios artificiales. Listado ordenado por fecha e identificador descendentes; dashboard muestra los cinco más recientes.
- Las relaciones múltiples se consultan aparte para no multiplicar reportes. Los valores demográficos y ubicaciones múltiples se muestran separados con ` · `, sin sumar ni inferir información.
- Estados literales de la base conservados en tablas y gráficas. Resumen: Registrado/Recibido/Pendiente → pendientes; En revision/En revisión/Canalizado/En proceso → en proceso; Concluido/Resuelto → resueltos. Cancelados y estados adicionales cuentan en el total y la distribución, sin asignarles una categoría inventada.
- Municipios, prioridades, estados y tipos de trabajo de los filtros provienen de los reportes consultados. Filtros locales sobre la respuesta completa; fechas inclusivas y validación de rango.
- Última actualización, horario, referencias, autoridad y comentarios no existen en el esquema y se muestran como “No disponible”. Administrador procede de la relación real; imagen_url se muestra como evidencia registrada sin inventar nombres ni tamaños ni habilitar descargas.
- Rendimiento queda sin indicadores: no existen asignaciones a autoridades ni fechas de resolución. No se infieren autoridades desde administradores ni duración desde la fecha del reporte.
- Gráficas de estados, municipios y tendencia usan los reportes reales. Mapa del dashboard y concentración de estadísticas quedan pendientes; se retira la ejecución del mapa de demostración.
- Carga, error y vacío explícitos, sin recurrir a datos ficticios. Actualizar vuelve a consultar mediante recarga. Cambiar estado, asignar autoridad y eliminar siguen simulados; exportación y sesión conservan su comportamiento provisional.
- Validación en AWS: siete reportes y siete identificadores únicos; detalle consistente con listado. Únicamente SELECT. Pruebas de backend y navegación con respuestas controladas, sin escribir en la base.

### Ajuste — Hora de última consulta del dashboard

- El encabezado muestra la hora real al completar correctamente la consulta y el renderizado de reportes, con segundos y horario de Ciudad de México.
- Durante la carga muestra “Consultando reportes…”; ante un error, “Última consulta: no disponible”. La hora cambia únicamente al volver a consultar correctamente.

### Ajuste — Esqueleto de carga

- Dashboard, gestión, seguimiento y las tres pestañas de estadísticas conservan los contenedores y muestran un esqueleto neutro mientras se consulta la API. Valores provisionales, tablas y controles dependientes de datos permanecen ocultos y sin interacción.
- La carga se activa desde el HTML para evitar destellos iniciales de guiones. Al terminar se muestran los datos reales, los campos no disponibles o el error correspondiente. Navegación y mapa existente se conservan.

### Ajuste — Desplazamiento horizontal de Estadísticas / Reportes

- El desplazamiento horizontal queda dentro de la tabla. Se limita el ancho de sus contenedores y se permite ajustar el encabezado y los filtros al ancho disponible.
- Se restauran las elipsis de las celdas para los textos recibidos de la API; el texto completo permanece en el título de la celda y el seguimiento.

### Ajuste — PNG de identidad en la barra lateral

- Se sustituye el bloque R / RIETI / Panel de Control por `assets/logo-rieti.png` en las siete pantallas internas. El usuario añadirá su archivo con ese nombre.
- Se conserva la proporción del PNG dentro de un espacio de 190 × 60 px; el tamaño se controla con `.brand-lockup__logo`.
