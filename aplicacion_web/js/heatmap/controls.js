import {controls,priorities} from './config.js';
export function bindControls($,{update,map,streets}) {
 const removers=[];
 for(const priority of [...priorities,'Sin especificar']){
  const option=document.createElement('option');option.value=priority;option.textContent=priority;$('priority-filter').append(option);
 }
 const on=(id,event,handler)=>{if(controls.events[id]!==event) throw new Error('Control no definido');$(id).addEventListener(event,handler);removers.push(()=>$(id).removeEventListener(event,handler));};
    on('priority-filter','change',()=>update());
    on('mode','change',()=>update());
    on('municipio','change',()=>update(true));
    on('points','change',()=>update());
    on('basemap','change',()=>{if($('basemap').checked)streets.addTo(map);else map.removeLayer(streets);});
    on('reset','click',()=>{$('municipio').value='';update(true);});
 return ()=>removers.forEach(remove=>remove());
}
