const {test}=require('node:test');const assert=require('node:assert/strict');const {readHeatmap}=require('./heatmap');
test('Mapa: solo SELECT, catálogo geográfico independiente y parejas originales de coordenadas',async()=>{
 const calls=[];const pool={execute:async sql=>{calls.push(sql);return [sql.includes('FROM Municipio')?[{id:2,clave:15001,nombre:'Acambay'}]:[{id:7,folio:'RIETI-2026-0007',id_ubicacion:1,latitud:'19.2',longitud:'-99.6'},{id:7,folio:'RIETI-2026-0007',id_ubicacion:2,latitud:null,longitud:null}]];}};
 const data=await readHeatmap(pool);assert.equal(data.municipios[0].clave,'15001');assert.equal(data.puntos[0].latitud,19.2);assert.equal(data.puntos[1].latitud,null);assert.equal(data.puntos.length,2);assert.equal(data.puntos[0].folio,'RIETI-2026-0007');assert.match(calls[1],/r\.folio/);assert.ok(calls.every(sql=>sql.startsWith('SELECT')));assert.ok(!calls[0].includes('WHERE EXISTS'));
 assert.match(calls[1], /WHERE r\.active = 1\s+ORDER BY/);
 assert.match(calls[1], /r\.estatus AS estatus/);
 assert.match(calls[1], /u\.direccion/);
});
test('Sin reportes activos, el mapa devuelve puntos vacíos y conserva el catálogo municipal', async () => {
 const data=await readHeatmap({execute:async sql=>[sql.includes('FROM Municipio')?[{id:2,clave:15001,nombre:'Acambay'}]:[]]});
 assert.deepEqual(data.puntos,[]);
 assert.equal(data.municipios.length,1);
});
