# Cambio de estado e historial — pendiente

Acuerdos con el usuario del 17 de octubre de 2026. La implementación de escrituras
queda pendiente por solicitud del usuario. No aplicar cambios en RDS ni habilitar
estas operaciones al retomar otro trabajo sin volver a este contexto.

Última indicación del usuario: dejar nuevamente pendiente el cambio de estado
hasta que su compañero revise el inicio de sesión. Las columnas necesarias ya
están confirmadas en RDS; falta resolver cómo validar la identidad y el rol en el
backend. No se implementaron escrituras, sesiones nuevas ni cambios al login en
este intento. Para retomar, obtener el resultado de esa revisión y autorización
del usuario para continuar. También falta confirmar por qué aplicación y servicio
se autentica el procurador; la pregunta realizada en el chat queda aplazada.

## Decisiones confirmadas

- Todos los administradores pueden modificar cualquier reporte: no restringirlos
  por municipio ni por el administrador asociado al reporte.
- Las autoridades son los registros de la tabla `Procurador`.
- Cada municipio tiene un procurador, según lo indicado por el usuario. Aun así,
  registrar su ID para identificar al autor histórico aunque cambie el procurador.
- El procurador únicamente puede cambiar el estado; no puede asignar autoridades,
  realizar bajas lógicas ni modificar la prioridad.
- Los cambios de administradores y procuradores deben generar historial.
- `Reporte_Historial.estatus` conserva el estado ANTERIOR. `Reporte.estatus`
  conserva el estado ACTUAL. No agregar `estatus_anterior` ni `estatus_nuevo`.
- Reutilizar `Reporte_Historial.id_administrador` para el administrador que realizó
  el cambio, no para copiar al administrador asociado al reporte.
- Agregar `Reporte_Historial.id_procurador` para el autor procurador. En cada
  entrada nueva debe tener valor exactamente uno de los dos campos de autor.
- Conservar `Reporte_Historial.id_municipio` como municipio del reporte.
- Agregar `Reporte_Historial.comentarios` sin sobrescribir `Reporte.descripcion`.
  La obligatoriedad de los comentarios no se ha acordado; actualmente el formulario
  los permite opcionales y con un máximo de 2000 caracteres.
- Usar `modificacion_fecha` para la fecha y hora del cambio; `fecha` corresponde a
  la fecha original del reporte.

## Estructura confirmada en RDS

Verificación de solo lectura realizada el 17 de octubre de 2026, tras el aviso del
usuario: ya existen `id_procurador INT UNSIGNED NULL`, `comentarios TEXT NULL` y
`fk_historial_procurador` hacia `Procurador.id_procurador`. La llave tiene
`ON UPDATE CASCADE` y **`ON DELETE SET NULL`**, en lugar del `RESTRICT` propuesto.
Con la regla aplicada, borrar físicamente un procurador elimina su referencia en
el historial (la entrada permanece). Esta diferencia se comunicó al usuario;
no se modificó RDS. La implementación de la función sigue pendiente.

## Propuesta original de estructura comunicada al compañero

Este SQL es la propuesta original entregada al usuario; NO se ejecutó desde este
chat. No volver a ejecutar el ALTER: las columnas y la relación ya existen, con
la diferencia en ON DELETE documentada arriba.

```sql
ALTER TABLE Reporte_Historial
    ADD COLUMN id_procurador INT UNSIGNED NULL,
    ADD COLUMN comentarios TEXT NULL,
    ADD CONSTRAINT fk_historial_procurador
        FOREIGN KEY (id_procurador)
        REFERENCES Procurador (id_procurador)
        ON DELETE RESTRICT
        ON UPDATE CASCADE;
```

`ON DELETE RESTRICT` conserva la referencia histórica al impedir el borrado físico
de procuradores que tengan cambios registrados. No agregar columnas para los estados
anterior y nuevo: se usan las existentes como se describe arriba.

## Trabajo necesario al retomar

1. Completado: se confirmaron las columnas y la llave foránea en RDS. Tener en
   cuenta la regla ON DELETE SET NULL realmente aplicada; no ejecutar la propuesta original.
2. Validar la identidad y el rol en el backend. El login web actual llama a una
   Lambda y guarda `id_admin` en localStorage; la API Express aún no valida sesión.
   No aceptar como identidad confiable un ID o rol enviado libremente por el navegador.
   Falta integrar o definir la autenticación del procurador.
3. Crear la operación de cambio de estado con validación de los ocho estados
   admitidos por RDS y rechazo de reportes con `active != 1`.
4. Dentro de una transacción y con bloqueo del reporte, guardar una copia de los
   valores anteriores en `Reporte_Historial`, sustituyendo el autor por la identidad
   validada y agregando comentarios y fecha del cambio. Actualizar después `Reporte`.
   Si falla cualquiera de las operaciones, revertir ambas.
5. Revisar la diferencia de tipos de `imagen_url`: en la estructura consultada,
   `Reporte` usa TEXT y `Reporte_Historial` usa VARCHAR(255). No truncar datos al copiar.
6. Definir el manejo de conflictos y de envíos repetidos para no sobrescribir cambios
   concurrentes ni duplicar el historial por un reintento.
7. Conectar el formulario en Dashboard, Gestión de reportes, Estadísticas y detalle.
   Mostrar éxito solo tras confirmar el guardado; conservar los datos del formulario
   ante errores y actualizar el reporte y los indicadores después del éxito.
8. El formulario de administrador también incluye prioridad. Confirmar su alcance
   al implementar; al procurador permitirle únicamente estado y comentarios.
9. Probar persistencia, autores de ambos roles, permisos, inactivos, validación,
   concurrencia y reversión de la transacción, sin usar reportes reales como prueba.

## Otros pendientes relacionados

- Asignación de autoridad: cargar procuradores activos desde RDS. En el esquema
  consultado aún no hay relación Reporte–Procurador; preparar esa relación antes
  de guardar asignaciones. Esta función no se implementó.
- Eliminar: implementar baja lógica actualizando `Reporte.active` de 1 a 0,
  conservando el registro. La acción del frontend sigue simulada.
- No crear todavía funciones, rutas ni controles para consultar o restaurar inactivos.

## Preparación ya terminada en el repositorio

- Estados alineados con RDS: `Registrado`, `En_revision`, `En_seguimiento`,
  `Canalizado`, `Concluido`, `Archivado`, `Cancelado`, `Reincidente`.
- Etiquetas legibles para revisión y seguimiento sin alterar los valores originales.
- Consultas del backend filtradas obligatoriamente por `Reporte.active = 1` en
  listado, detalle, mapa y coincidencias. Un detalle inactivo devuelve 404.
- El mapa del dashboard consulta la API del proyecto para respetar el mismo filtro.
- Las funciones de cambiar estado, asignar autoridad y eliminar siguen simuladas;
  no se han implementado escrituras reales ni aplicado migraciones desde este chat.
- Los cambios del repositorio no se han enviado a Git ni desplegado desde este chat.
