// Una fila por municipio: no duplicar reportes si el catálogo tiene un conflicto.
const municipalAuthoritiesSQL = `SELECT id_municipio, COUNT(*) AS authorityCount,
 CASE WHEN COUNT(*) = 1 THEN MAX(id_procurador) END AS authorityId,
 CASE WHEN COUNT(*) = 1 THEN MAX(nombre) END AS authority
 FROM Procurador WHERE activo = 1 GROUP BY id_municipio`;

const authorityNameSQL = `CASE WHEN p.authorityCount > 1
 THEN 'Múltiples procuradores registrados'
 ELSE COALESCE(NULLIF(TRIM(p.authority), ''), 'Sin procurador registrado') END`;

module.exports = { municipalAuthoritiesSQL, authorityNameSQL };
