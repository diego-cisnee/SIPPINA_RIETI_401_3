# Login y administración de cuentas en Express

Implementación del 18 de octubre de 2026. Sustituye las dos Lambdas recibidas:
Express utiliza el pool existente de RDS y bcrypt; no abre una conexión nueva por
petición ni vuelve a crear tablas. Las acciones de reportes y su historial están
integrados; ver REPORTES.md. No hay cuentas de demostración ni credenciales predeterminadas.

## Uso

1. En el inicio de sesión seleccionar Administrador o Procurador e ingresar correo
   o nombre y contraseña. El rol selecciona una tabla fija en el servidor; no otorga
   permisos por sí solo.
2. La sesión identifica al usuario en el backend. El administrador ve todos los
   reportes; el procurador activo solo los de su municipio. Listado, detalle,
   coincidencias, mapas y Rendimiento aplican el filtro en SQL. Se rechazan accesos
   directos a reportes ajenos aunque se altere la URL o los parámetros.
3. Solo un administrador autenticado puede abrir **Administrar cuentas** en el menú lateral.
   Allí registra administradores y procuradores o restablece la contraseña de una cuenta
   existente (administrador o procurador activo). Las altas de procuradores siempre
   requieren una sesión de administrador; la excepción pública temporal solo permite administradores.
4. Registrar otra cuenta conserva la sesión del administrador que realiza el alta.
   Las contraseñas nuevas se guardan como bcrypt de costo 10. Nombre y correo del
   administrador tienen máximo 50 caracteres; para procuradores, nombre de hasta 150
   y correo de hasta 254, conforme al esquema real de RDS. Las cuentas nuevas de procurador quedan activas.
5. Cerrar sesión la destruye en el servidor. Restablecer una contraseña invalida
   las sesiones anteriores de esa cuenta en su siguiente consulta. Si el administrador
   cambia su propia contraseña, vuelve al login inmediatamente.

Las escrituras de autenticación son únicamente el INSERT de un administrador y
el UPDATE de la contraseña de la cuenta expresamente seleccionada por un admin.
Las rutas de autenticación no modifican Reporte ni Reporte_Historial. Las acciones
de reportes tienen sus propias rutas y transacciones documentadas en REPORTES.md.

## Cuentas existentes

### Apertura temporal del registro

Para crear una cuenta cuando todavía no se dispone de un acceso válido, configurar
`PUBLIC_ADMIN_REGISTRATION_UNTIL` con una fecha ISO futura en el `.env` del entorno
y reiniciar el backend. Durante ese intervalo, el login muestra **Crear cuenta de
administrador** y `/pages/registro.html` permite el alta sin sesión. Solo se publica
el catálogo municipal necesario para el formulario; las cuentas, los reportes y
el restablecimiento de contraseñas conservan sus permisos.

Al vencer la fecha, tanto la página como el POST vuelven a exigir un administrador
autenticado automáticamente, incluso si alguien conserva el formulario abierto.
Una fecha vacía, inválida o pasada mantiene cerrado el registro público. Para cerrarlo
antes, vaciar la variable y reiniciar. Esta excepción temporal sustituye durante
ese intervalo la restricción habitual de registro descrita arriba. No modifica
el servidor EC2 hasta configurar allí la variable y desplegar el código.

La revisión de solo lectura encontró contraseñas que no corresponden al formato
bcrypt de las Lambdas. El algoritmo anterior es desconocido; no se comparan como
texto ni se convierten automáticamente. Para el primer acceso se requiere un
administrador existente con contraseña bcrypt válida. Desde su sesión puede
restablecer las cuentas antiguas con una contraseña nueva. No se realizó ningún
restablecimiento ni alta real durante la implementación.

Si dos registros existentes coinciden en el mismo identificador de login, el
servidor rechaza la entrada ambigua en vez de elegir una cuenta arbitrariamente.
Usar un correo único o revisar esos registros con el responsable de la base.

## Configuración local y en EC2

- Instalar las dependencias desde `backend` con `npm ci`.
- Después de publicar y comprobar el backend nuevo, deshabilitar las URLs de las
  Lambdas antiguas en AWS. Retirarlas del JavaScript no apaga los servicios: la Lambda
  de registro anterior podría seguir aceptando altas públicas por fuera de Express.
- Configurar `SESSION_SECRET` con un valor aleatorio privado de al menos 32 caracteres.
  Para generarlo: `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`.
  Guardarlo únicamente en el `.env` del servidor o su gestor de secretos; nunca en Git.
  En el equipo local se generó uno sin mostrar su valor.
- Las sesiones se guardan cifradas en `backend/.sessions`, excluido de Git. `SESSION_DIR`
  permite elegir otro directorio privado y persistente. El usuario que ejecuta Node
  necesita permiso de escritura. Conservar directorio y secreto entre reinicios;
  cambiar el secreto invalida las sesiones existentes.
- Con Live Server, evitar que las escrituras de sesión provoquen recargas continuas.
  `.vscode/settings.json` excluye `.sessions`, archivos de entorno y logs de la
  vigilancia (reiniciar Live Server si estaba abierto al cambiar esa configuración).
  En este equipo `SESSION_DIR` apunta a un directorio local fuera del repositorio,
  conservando los archivos cifrados existentes y el mismo secreto. No copiar esa
  ruta local a EC2: allí elegir un directorio privado y persistente del servidor.
- En EC2 usar HTTPS y `NODE_ENV=production`, además de `DB_SSL_CA_FILE` para RDS.
  En producción las cookies requieren conexión segura. El proxy local debe preservar
  Host y enviar correctamente X-Forwarded-Proto y X-Forwarded-For. Express confía
  únicamente en proxies de loopback y sigue escuchando en 127.0.0.1.
- Se recomienda servir frontend y API desde el mismo origen. En desarrollo con
  puertos separados conservar el mismo host: localhost con localhost, o 127.0.0.1
  con 127.0.0.1. `api.js` incluye las cookies en las peticiones. CORS admite POST,
  credenciales y los orígenes explícitos configurados; no usa un origen comodín.
- El almacenamiento de sesiones está diseñado para este servidor EC2. Varias
  instancias con discos separados requieren un almacén compartido antes de escalar.

Sin Recordar sesión, la cookie dura la sesión del navegador y la identidad expira
a las ocho horas. Con Recordar sesión, el máximo es siete días. La cookie es
HttpOnly y SameSite=Lax. Los roles y el municipio se vuelven a consultar en la
base; localStorage ya no se usa como identidad. Se elimina únicamente el viejo
`id_admin` del navegador al entrar o salir.

## API

| Ruta | Acceso | Datos |
| --- | --- | --- |
| POST /api/auth/login | Público, con límite de intentos | `{user, pwrd, role, remember}`. role: administrador o procurador. |
| GET /api/auth/session | Sesión válida | Devuelve user: id, role, name, email, municipalityId y expiresAt por separado. |
| POST /api/auth/logout | Mismo origen autorizado | Destruye sesión y elimina cookie; enviar JSON `{}`. |
| POST /api/auth/register | Administrador | `{nombre, email, contrasena, id_municipio, role}`. role: administrador (predeterminado) o procurador. Responde 201 con role e id_admin o id_procurador. |
| GET /api/auth/accounts | Administrador | Lista de cuentas para restablecer, sin hashes ni contraseñas. |
| POST /api/auth/password | Administrador | `{role, id, password}`. No acepta permisos o municipio desde el cliente. |

Las rutas de datos exigen sesión. El catálogo /api/municipios y /test-db requieren
administrador. /test y la presentación pública de Acerca de RIETI siguen accesibles.
Las respuestas de API y las páginas privadas usan Cache-Control: no-store.

Los POST exigen JSON y un origen autorizado cuando el navegador lo proporciona.
El login limita intentos fallidos a 15 por IP/proceso en diez minutos; altas y
restablecimientos comparten un límite de 30 por hora. Las validaciones devuelven
400, credenciales incorrectas o sesión ausente 401, falta de permisos 403 y cuentas
repetidas 409. Los errores internos no devuelven detalles de SQL o credenciales.

Administrador no tiene índices únicos de nombre/correo en el esquema consultado.
Para evitar altas concurrentes duplicadas, este backend usa un bloqueo MySQL con
nombre específico de la base, comprueba duplicados e inserta en la misma conexión.
El bloqueo se libera al terminar. Esto protege las altas de esta API; no reemplaza
una restricción única frente a otros programas que escriban directamente en RDS.

## Verificación

- `npm test`: autenticación, sesiones, permisos, validaciones, registro y
  concurrencia con una base aislada; no conecta a RDS. Incluye cifrado/persistencia
  del almacén de sesiones después de reiniciar la aplicación.
- Con Chrome y Playwright disponible en NODE_PATH: `npm run test:auth-browser`.
  Usa Express y datos aislados, nunca RDS. Comprueba formularios, ambos roles,
  cookies entre puertos locales, restablecimiento, perfil, permisos y logout.
- Las comprobaciones contra RDS durante este cambio se limitaron a lecturas de
  estructura, conteos de formatos y alcance por municipio con sesiones locales de
  verificación. No se crearon cuentas ni se cambiaron contraseñas reales.

Referencias de implementación: [express-session](https://github.com/expressjs/session),
[session-file-store](https://github.com/valery-barysok/session-file-store),
[bcryptjs](https://github.com/dcodeIO/bcrypt.js) y
[bloqueos MySQL](https://dev.mysql.com/doc/refman/8.4/en/locking-functions.html).
