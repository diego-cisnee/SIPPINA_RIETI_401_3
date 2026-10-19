# Reportes — estado actual

## Implementado · 18 de octubre de 2026

El usuario retomó las acciones después de integrar autenticación. Ya funcionan el
cambio de estado, comentarios e historial de ambos roles, la prioridad para admin
y la baja lógica exclusivamente de admin. Ver [REPORTES.md](REPORTES.md) para
contratos de API, transacciones, versiones, interfaz y pruebas.

Se conserva lo acordado: la autoridad actual es el procurador activo del municipio,
sin asignación manual; admin ve todo y procurador únicamente su municipio.
`Reporte_Historial.estatus` y `prioridad` guardan los valores anteriores; la identidad
real se registra en exactamente uno de `id_administrador` o `id_procurador`.
`id_municipio` es el del reporte; `fecha` es la original y `modificacion_fecha` la
del movimiento. Los comentarios no alteran la descripción.

No se agregaron columnas, no se cambiaron llaves ni se ejecutaron pruebas de
escritura contra RDS. El esquema ya tenía `id_procurador`, `comentarios` y la FK
con ON DELETE SET NULL, confirmado nuevamente con consultas de solo lectura.

## Pendiente

- Desplegar en EC2 y comprobar la configuración del servidor; HTTPS/IP estable
  quedaron aplazados por el usuario. Reiniciar el backend al incorporar las rutas.
- Revisar una migración de `Reporte_Historial.imagen_url` a TEXT si se necesitan
  evidencias de más de 255 caracteres. Por ahora esas operaciones se rechazan
  completas para no truncar datos. No repetir el ALTER de id_procurador/comentarios.
- No se han solicitado vistas de reportes inactivos ni restauración. No crearlas.
- El historial conserva los IDs de autor, pero los nombres se consultan de las
  cuentas existentes; un borrado físico ajeno a esta API puede perder referencias
  según las FK actuales. Esta implementación realiza exclusivamente bajas lógicas.
