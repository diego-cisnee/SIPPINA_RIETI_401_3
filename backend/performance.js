const { municipalAuthoritiesSQL, authorityNameSQL } = require('./authorities');

// El historial guarda el estado ANTERIOR. En un reporte actualmente concluido,
// la última copia cuyo estado no era Concluido marca la entrada a ese estado:
// todas las copias posteriores ya eran Concluido (comentarios/prioridad).
function performanceQuery(scoped) {
  return `WITH permitted_reports AS (
 SELECT r.id_reporte, r.id_municipio, r.estatus, r.fecha FROM Reporte r
 WHERE r.active = 1${scoped ? ' AND r.id_municipio = ?' : ''}
), latest_completions AS (
 SELECT h.id_reporte, MAX(h.id_historial) AS id_historial
 FROM Reporte_Historial h JOIN permitted_reports pr ON pr.id_reporte = h.id_reporte
 WHERE pr.estatus = 'Concluido' AND (h.estatus <> 'Concluido' OR h.estatus IS NULL)
 GROUP BY h.id_reporte
), resolution_durations AS (
 SELECT pr.id_reporte, TIMESTAMPDIFF(SECOND, pr.fecha, h.modificacion_fecha) AS seconds
 FROM permitted_reports pr JOIN latest_completions lc ON lc.id_reporte = pr.id_reporte
 JOIN Reporte_Historial h ON h.id_historial = lc.id_historial AND h.id_reporte = pr.id_reporte
 WHERE h.estatus <> 'Concluido' AND h.modificacion_fecha >= pr.fecha AND h.modificacion_fecha <= CURRENT_TIMESTAMP
)
SELECT m.id_municipio AS municipalityId, m.nombre AS municipality,
 p.authorityId, COALESCE(p.authorityCount, 0) AS authorityCount,
 ${authorityNameSQL} AS authority, COUNT(r.id_reporte) AS total,
 COALESCE(SUM(r.estatus = 'Registrado'), 0) AS pending,
 COALESCE(SUM(r.estatus IN ('En_revision', 'En_seguimiento', 'Canalizado')), 0) AS progress,
 COALESCE(SUM(r.estatus = 'Concluido'), 0) AS resolved,
 COUNT(rd.seconds) AS measuredResolved, COALESCE(SUM(rd.seconds), 0) AS resolutionSeconds
 FROM Municipio m
 LEFT JOIN (${municipalAuthoritiesSQL}) p ON p.id_municipio = m.id_municipio
 JOIN permitted_reports r ON r.id_municipio = m.id_municipio
 LEFT JOIN resolution_durations rd ON rd.id_reporte = r.id_reporte
 ${scoped ? 'WHERE m.id_municipio = ?' : ''}
 GROUP BY m.id_municipio, m.nombre, p.authorityId, p.authorityCount, p.authority
 ORDER BY m.nombre, m.id_municipio`;
}

async function readPerformance(pool, municipalityId = null) {
  const scoped = municipalityId !== null;
  const [rows] = await pool.query(performanceQuery(scoped), scoped ? [municipalityId, municipalityId] : []);
  return rows.map(row => {
    const total = Number(row.total), resolved = Number(row.resolved);
    const measuredResolved = Number(row.measuredResolved), resolutionSeconds = Number(row.resolutionSeconds);
    return {
      municipalityId: row.municipalityId, municipality: row.municipality,
      authorityId: row.authorityId, authority: row.authority,
      authorityCount: Number(row.authorityCount), total,
      pending: Number(row.pending), progress: Number(row.progress), resolved,
      efficiency: total ? resolved / total * 100 : null,
      measuredResolved, resolutionSeconds,
      averageDays: measuredResolved ? resolutionSeconds / measuredResolved / 86400 : null,
    };
  });
}

module.exports = { readPerformance, performanceQuery };
