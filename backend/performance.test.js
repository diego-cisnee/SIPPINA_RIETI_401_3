const {test}=require('node:test');const assert=require('node:assert/strict');
const {readPerformance}=require('./performance');
test('Rendimiento calcula días con segundos y casos medibles, conservando ceros y nulos',async()=>{
 const base={municipalityId:1,municipality:'Municipio',authorityId:1,authority:'Procurador',authorityCount:'1',total:'9',pending:'0',progress:'1',resolved:'8'};
 const pool={query:async()=>[[
  {...base,measuredResolved:'2',resolutionSeconds:String(6*86400)},
  {...base,municipalityId:2,measuredResolved:'1',resolutionSeconds:'0'},
  {...base,municipalityId:3,measuredResolved:'0',resolutionSeconds:'0'},
 ]]};
 const rows=await readPerformance(pool);
 assert.equal(rows[0].averageDays,3);assert.equal(rows[0].measuredResolved,2);assert.equal(rows[0].resolved,8);
 assert.equal(rows[1].averageDays,0);assert.equal(rows[2].averageDays,null);
});
test('La consulta filtra reportes activos y municipio tanto en el historial como en el agregado',async()=>{
 const calls=[];const pool={query:async(sql,args)=>{calls.push({sql,args});return [[]];}};
 await readPerformance(pool,22);await readPerformance(pool);
 assert.deepEqual(calls[0].args,[22,22]);assert.match(calls[0].sql,/r\.active = 1 AND r\.id_municipio = \?/);assert.match(calls[0].sql,/WHERE m\.id_municipio = \?/);
 assert.deepEqual(calls[1].args,[]);assert.ok(!calls[1].sql.includes('?'));
 assert.ok(calls.every(({sql})=>sql.startsWith('WITH ')&&!/\b(?:INSERT|UPDATE|DELETE|ALTER)\b/.test(sql)));
});
