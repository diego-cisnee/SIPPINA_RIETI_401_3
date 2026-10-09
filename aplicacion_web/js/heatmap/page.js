import {loadData} from './data.js';
import {createMap} from './map.js';
const controller=new AbortController();
let instance;
async function mount(){
 document.getElementById('status').textContent='Cargando mapa…';
 try {
  if(!window.L?.heatLayer) throw new Error('No se pudieron cargar las librerías locales.');
  const [geo,points,municipalities]=await loadData(controller.signal);
  if(controller.signal.aborted)return;
  instance=createMap(geo,points,municipalities);
  window.mapaCalor=instance;
  document.getElementById('map-controls').disabled=false;
 } catch(error){if(error.name!=='AbortError')document.getElementById('status').textContent=error.name==='TimeoutError'?'La consulta tardó demasiado. Vuelve a cargar para reintentar.':error instanceof TypeError?'No fue posible conectar con la API. Comprueba que el backend esté iniciado y vuelve a cargar.':error.message;}
}
window.addEventListener('pagehide',()=>{controller.abort();instance?.destroy();delete window.mapaCalor;},{once:true});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
mount();
