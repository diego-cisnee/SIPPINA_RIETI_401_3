// Las mutaciones del reporte y su copia histórica se confirman en una sola transacción.
const statuses = Object.freeze(['Registrado', 'En_revision', 'En_seguimiento', 'Canalizado', 'Concluido', 'Archivado', 'Cancelado', 'Reincidente']);
const priorities = Object.freeze(['Baja', 'Media', 'Alta']);
const fail = (status, message) => Object.assign(new Error(message), { status });
// Incluye el último historial para detectar también comentarios y cambios de ida y vuelta.
const versionSQL = `SHA2(CAST(JSON_ARRAY(r.id_reporte, r.id_usuario, r.id_administrador,
 r.id_municipio, r.estatus, r.descripcion, r.fecha, r.prioridad, r.imagen_url, r.folio, r.active,
 (SELECT COALESCE(MAX(vh.id_historial), 0) FROM Reporte_Historial vh WHERE vh.id_reporte = r.id_reporte)) AS CHAR), 256)`;

function validateChange(body, actor, deleting) {
  if (!actor || !['administrador', 'procurador'].includes(actor.role)) throw fail(403, 'No tienes permiso para realizar esta acción.');
  if (deleting && actor.role !== 'administrador') throw fail(403, 'Solo un administrador puede eliminar reportes.');
  if (!body || typeof body.version !== 'string' || !/^[a-f0-9]{64}$/.test(body.version)) throw fail(400, 'Recarga el reporte antes de realizar el cambio.');
  const allowed = deleting ? ['version'] : ['version', 'status', 'priority', 'comments'];
  if (Object.keys(body).some(key => !allowed.includes(key))) throw fail(400, 'La solicitud contiene campos no permitidos.');
  if (deleting) return;
  if (!statuses.includes(body.status)) throw fail(400, 'Selecciona un estado válido.');
  if (actor.role === 'procurador' && Object.hasOwn(body, 'priority')) throw fail(403, 'El procurador solo puede cambiar el estado y agregar comentarios.');
  if (Object.hasOwn(body, 'priority') && !priorities.includes(body.priority)) throw fail(400, 'Selecciona una prioridad válida.');
  if (body.comments !== undefined && (typeof body.comments !== 'string' || [...body.comments].length > 2000)) throw fail(400, 'Los comentarios deben tener hasta 2000 caracteres.');
}

async function changeReport(pool, id, actor, body, { deleting = false } = {}) {
  validateChange(body, actor, deleting);
  const connection = await pool.getConnection();
  let started = false, broken = false;
  try {
    await connection.beginTransaction(); started = true;
    const scoped = actor.role === 'procurador';
    const [rows] = await connection.execute(`SELECT r.* FROM Reporte r WHERE r.id_reporte = ? AND r.active = 1${scoped ? ' AND r.id_municipio = ?' : ''} FOR UPDATE`, scoped ? [id, actor.municipalityId] : [id]);
    if (!rows.length) throw fail(404, 'Reporte no encontrado.');
    const report = rows[0];
    // Esta lectura se hace DESPUÉS de obtener el bloqueo: ve el historial confirmado
    // por quien tenía antes el reporte, incluso si hubo que esperar para bloquearlo.
    const [[current]] = await connection.execute(`SELECT ${versionSQL} AS version FROM Reporte r WHERE r.id_reporte = ?`, [id]);
    if (current.version !== body.version) throw fail(409, 'El reporte cambió desde que lo abriste. Recarga la página y revisa los cambios antes de volver a enviar.');
    const comments = deleting ? 'Eliminación lógica del reporte (active=0).' : (body.comments || '').trim();
    const priority = Object.hasOwn(body, 'priority') ? body.priority : report.prioridad;
    if (!deleting && body.status === report.estatus && priority === report.prioridad && !comments) throw fail(400, 'No hay cambios ni comentarios para guardar.');
    // El esquema actual admite TEXT en Reporte, pero solo 255 caracteres en historial.
    // Rechazar la operación completa, nunca truncar o perder la evidencia anterior.
    if (report.imagen_url !== null && [...report.imagen_url].length > 255) throw fail(409, 'No fue posible conservar el historial completo de este reporte. Contacta al administrador.');
    await connection.execute(`INSERT INTO Reporte_Historial
      (id_reporte, id_usuario, id_administrador, id_municipio, estatus, descripcion, fecha,
       prioridad, imagen_url, folio, modificacion_fecha, id_procurador, comentarios)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`,
    [report.id_reporte, report.id_usuario, actor.role === 'administrador' ? actor.id : null,
      report.id_municipio, report.estatus, report.descripcion, report.fecha, report.prioridad,
      report.imagen_url, report.folio, actor.role === 'procurador' ? actor.id : null, comments || null]);
    if (deleting) await connection.execute('UPDATE Reporte SET active = 0 WHERE id_reporte = ?', [id]);
    else await connection.execute('UPDATE Reporte SET estatus = ?, prioridad = ? WHERE id_reporte = ?', [body.status, priority, id]);
    await connection.commit(); started = false;
    return { id: String(id), active: !deleting };
  } catch (error) {
    if (started) {
      try { await connection.rollback(); }
      catch { broken = true; connection.destroy(); }
    }
    if (['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(error.code)) throw fail(409, 'Otro cambio está en curso. Recarga el reporte y vuelve a intentarlo.');
    throw error;
  } finally { if (!broken) connection.release(); }
}

async function readHistory(pool, id, municipalityId = null) {
  const scope = municipalityId === null ? '' : ' AND r.id_municipio = ?';
  const args = municipalityId === null ? [id] : [id, municipalityId];
  const [reports] = await pool.execute(`SELECT r.id_reporte FROM Reporte r WHERE r.id_reporte = ? AND r.active = 1${scope}`, args);
  if (!reports.length) return null;
  const [rows] = await pool.execute(`SELECT h.id_historial AS id, h.estatus AS previousStatus,
    h.prioridad AS previousPriority, h.comentarios AS comments,
    DATE_FORMAT(h.modificacion_fecha, '%d/%m/%Y %H:%i:%s') AS changedAt,
    h.id_administrador AS adminId, h.id_procurador AS procuratorId,
    a.nombre AS adminName, p.nombre AS procuratorName,
    r.estatus AS currentStatus, r.prioridad AS currentPriority
    FROM Reporte_Historial h JOIN Reporte r ON r.id_reporte = h.id_reporte
    LEFT JOIN Administrador a ON a.id_admin = h.id_administrador
    LEFT JOIN Procurador p ON p.id_procurador = h.id_procurador
    WHERE r.id_reporte = ? AND r.active = 1${scope} ORDER BY h.id_historial ASC`, args);
  return rows.map((row, index) => ({
    id: row.id, previousStatus: row.previousStatus, status: rows[index + 1]?.previousStatus ?? row.currentStatus,
    previousPriority: row.previousPriority, priority: rows[index + 1]?.previousPriority ?? row.currentPriority,
    comments: row.comments, changedAt: row.changedAt,
    actor: row.adminId && !row.procuratorId ? { id: row.adminId, role: 'administrador', name: row.adminName }
      : row.procuratorId && !row.adminId ? { id: row.procuratorId, role: 'procurador', name: row.procuratorName } : null,
  })).reverse();
}

module.exports = { changeReport, readHistory, versionSQL, statuses, priorities };
