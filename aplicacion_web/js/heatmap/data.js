export async function loadData(signal) {
 const response = await fetch(new URL('../../assets/heatmap/data/municipios.geojson', import.meta.url), {signal});
 if(!response.ok)throw new Error('No se pudieron cargar los límites municipales.');
 const geo=await response.json();
 const data=await loadCoordinates(signal);
 return [geo,data.puntos,data.municipios];
}
export async function loadCoordinates(signal) {
 const apiBase=(window.RIETI_API_BASE || (location.port==='3000' && ['localhost','127.0.0.1','[::1]'].includes(location.hostname)?location.origin:'http://127.0.0.1:3000')).replace(/\/$/,'');
 const response=await fetch(apiBase+'/api/mapa-calor',{method:'GET',cache:'no-store',signal:AbortSignal.any([signal,AbortSignal.timeout(15000)])});
 if(!response.ok)throw new Error('No fue posible consultar los reportes y municipios.');
 const payload=await response.json();
 if(!Array.isArray(payload.data?.puntos)||!Array.isArray(payload.data?.municipios))throw new Error('Respuesta del mapa inválida.');
 return payload.data;
}
export function createAssignment(features, L) {
    const counts = new Map(features.map(f => [f.properties.cvegeo, 0]));
    let records = [], rejected = 0;
    function inRing(x,y,ring) {
      let inside=false;
      for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
        const a=ring[i], b=ring[j];
        if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
      }
      return inside;
    }
    function contains(x,y,feature) {
      const polygons=feature.geometry.type==='Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
      return polygons.some(p => inRing(x,y,p[0]) && !p.slice(1).some(r => inRing(x,y,r)));
    }
    // Cache bounds before assigning coordinates to their municipality.
    const spatial=features.map(feature => ({feature,bounds:L.geoJSON(feature).getBounds()}));
    function ingest(points) {
      if(!Array.isArray(points)) throw new Error('Las coordenadas deben recibirse como un arreglo.');
      const next=[]; let invalid=0;
      for(const p of points) {
        const lat=p?.latitud, lng=p?.longitud, weight=p?.intensidad ?? 1;
        if(!Number.isFinite(lat)||!Number.isFinite(lng)||!Number.isFinite(weight)||weight<=0||lat< -90||lat>90||lng< -180||lng>180) {invalid++;continue;}
        const match=spatial.find(s => s.bounds.contains([lat,lng]) && contains(lng,lat,s.feature));
        if(!match){invalid++;continue;}
        next.push({...p, intensidad:weight, municipio:match.feature.properties.cvegeo});
      }
      records=next;rejected=invalid;counts.forEach((_,key)=>counts.set(key,0));
      const seen=new Set();
      records.forEach(p => {const key=p.municipio+':'+p.id;if(!seen.has(key)){seen.add(key);counts.set(p.municipio,counts.get(p.municipio)+1);}});
    }
return {ingest, get records(){return records;}, get rejected(){return rejected;}, counts};
}
