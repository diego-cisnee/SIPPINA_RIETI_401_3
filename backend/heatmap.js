// Datos mínimos para el mapa; consultas exclusivamente de lectura.
async function readHeatmap(pool) {
 const [municipalities] = await pool.execute('SELECT m.id_municipio AS id, m.clave, m.nombre FROM Municipio m ORDER BY m.nombre');
 const [reports] = await pool.execute(`SELECT r.id_reporte AS id, r.folio, r.prioridad AS prioridad, r.estatus AS estatus,
 DATE_FORMAT(r.fecha, '%Y-%m-%d') AS fecha_registro,
 u.id_ubicacion, u.latitud, u.longitud, u.direccion
 FROM Reporte r LEFT JOIN Ubicacion_Reporte u ON u.id_reporte = r.id_reporte
 WHERE r.active = 1
 ORDER BY r.id_reporte, u.id_ubicacion`);
 const number = value => value === null || value === undefined || value === '' ? null : Number(value);
 return { municipios: municipalities.map(m => ({...m, clave: String(m.clave)})), puntos: reports.map(r => ({...r,latitud:number(r.latitud),longitud:number(r.longitud),intensidad:1})) };
}
module.exports = {readHeatmap};
