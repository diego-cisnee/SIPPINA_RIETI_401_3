import {createAssignment} from './data.js';
import {colors,mapOptions,heatOptions,boundaryOptions,dotOptions,priorityColors,priorities} from './config.js';
import {bindControls} from './controls.js';
import {renderInformation} from './information.js';
export function createMap(geoData,points,catalog=[]) {
 const $=id=>document.getElementById(id);
 const L=window.L;
    const geo = geoData;
    const features = geo.features;
    const registered=new Map(catalog.map(m=>[String(m.clave).padStart(5,'0'),m]));
    const enabled=feature=>registered.has(feature.properties.cvegeo);
    const map = L.map('map', mapOptions);
    L.control.zoom({position:'topright'}).addTo(map);
    L.control.scale({imperial:false, position:'bottomright'}).addTo(map);
    // Fuente INEGI y metadatos conservados en assets/heatmap/data/fuente.json y README.
    const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'});
    streets.on('tileerror', () => { $('status').textContent = 'No se pudieron cargar algunas calles. Los límites y datos siguen disponibles.'; });
    map.createPane('boundaries'); map.getPane('boundaries').style.zIndex = 450;
    map.createPane('dots'); map.getPane('dots').style.zIndex = 460;
    const assignment=createAssignment(features,L); assignment.ingest(points);
    // Restringir también en el cliente: servidores anteriores pueden devolver el catálogo completo.
    const municipalitiesWithReports=new Set(assignment.records.map(p=>p.municipio));
    for(const key of registered.keys())if(!municipalitiesWithReports.has(key))registered.delete(key);
    const counts=new Map(assignment.counts);
    const maximum=()=>Math.max(1,...counts.values());
    function municipalColor(n){return colors[n===0?0:Math.min(5,Math.ceil(n/maximum()*5))];}
    function style(feature){
      if(!enabled(feature))return {color:'#9ca3af',weight:.8,fillColor:'#d1d5db',fillOpacity:.7,opacity:.8};
      const selected=$('municipio').value;
      const isSelected=selected===feature.properties.cvegeo;
      const options=boundaryOptions;
      const dim=selected&&!isSelected;
      return {color:isSelected?options.selectedColor:options.color,weight:isSelected?options.selectedWeight:options.weight,opacity:dim?options.dimOpacity:options.opacity,fillColor:$('mode').value==='municipal'?municipalColor(counts.get(feature.properties.cvegeo)):options.heatFill,fillOpacity:$('mode').value==='municipal'?(dim?options.dimMunicipalFillOpacity:options.municipalFillOpacity):(dim?options.dimHeatFillOpacity:options.heatFillOpacity)};
    }
    const municipalities=L.geoJSON(geo,{pane:'boundaries',style,onEachFeature:(feature,layer)=>{
      layer.bindTooltip('',{sticky:true});
      layer.on('mouseover',()=>{if(!enabled(feature)){layer.setTooltipContent(feature.properties.nomgeo+' · Municipio no registrado');return;}layer.setTooltipContent(`${feature.properties.nomgeo} · ${counts.get(feature.properties.cvegeo)} registros`);layer.setStyle({weight:2,color:boundaryOptions.selectedColor});});
      layer.on('mouseout',()=>municipalities.resetStyle(layer));
      layer.on('click',()=>{if(!enabled(feature))return;$('municipio').value=feature.properties.cvegeo;update(true);});
    }}).addTo(map);
    const stateBounds=municipalities.getBounds();
    map.fitBounds(stateBounds,{padding:[35,35]});
    const heat=L.heatLayer([],heatOptions);
    // Clip the rendered heat to the official polygons, including holes and detached areas.
    const originalRedraw=heat._redraw;
    heat._redraw=function(){
      if(!this._map)return;
      originalRedraw.call(this);
      if(!this._map||!this._canvas)return;
      const ctx=this._canvas.getContext('2d'); const origin=this._map.containerPointToLayerPoint([0,0]);
      ctx.save();ctx.globalCompositeOperation='destination-in';ctx.beginPath();
      const selected=$('municipio').value;
      for(const feature of features){
        if(!enabled(feature)||(selected&&feature.properties.cvegeo!==selected))continue;
        for(const polygon of (feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates))for(const ring of polygon){
          ring.forEach(([lng,lat],i)=>{const p=this._map.latLngToLayerPoint([lat,lng]).subtract(origin);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});ctx.closePath();
        }
      }
      ctx.fill('evenodd');ctx.restore();
    };
    const dots=L.layerGroup();
    features.filter(enabled).slice().sort((a,b)=>a.properties.nomgeo.localeCompare(b.properties.nomgeo,'es')).forEach(f=>{
      const option=document.createElement('option');option.value=f.properties.cvegeo;option.textContent=registered.get(f.properties.cvegeo).nombre;$('municipio').append(option);
    });
    $('municipal-total').textContent=features.filter(enabled).length;
    function update(fit=false){
      const selected=$('municipio').value;
      const priority=$('priority-filter').value;
      const filtered=assignment.records.filter(p=>registered.has(p.municipio)&&(!priority||(priorities.includes(p.prioridad)?p.prioridad:'Sin especificar')===priority));
      counts.forEach((_,key)=>counts.set(key,0));
      const seen=new Set();
      filtered.forEach(p=>{const key=p.municipio+':'+p.id;if(!seen.has(key)){seen.add(key);counts.set(p.municipio,counts.get(p.municipio)+1);}});
      const visible=selected?filtered.filter(p=>p.municipio===selected):filtered;
      const municipal=$('mode').value==='municipal';
      municipalities.setStyle(style);
      heat.setLatLngs(visible.map(p=>[p.latitud,p.longitud,p.intensidad]));
      if(municipal)map.removeLayer(heat);else if(!map.hasLayer(heat))heat.addTo(map);
      dots.clearLayers();
      if($('points').checked){
        visible.forEach(p=>{
          const priority=priorities.includes(p.prioridad)?p.prioridad:'Sin especificar';
          const tooltip=document.createElement('span');tooltip.textContent=`Folio ${p.id} · ${priority}`;
          const popup=document.createElement('div');
          const heading=document.createElement('p');heading.textContent=tooltip.textContent;
          const link=document.createElement('a');link.textContent='Abrir reporte';link.href=`reporte.html?id=${encodeURIComponent(p.id)}&from=mapa-calor`;
          popup.append(heading,link);
          L.circleMarker([p.latitud,p.longitud],{...dotOptions,fillColor:priorityColors[priority]}).bindTooltip(tooltip).bindPopup(popup).addTo(dots);
        });dots.addTo(map);
      }else map.removeLayer(dots);
      const visibleReports=[...new Map(visible.map(p=>[p.id,p])).values()];
      $('total').textContent=visibleReports.length.toLocaleString('es-MX');
      const feature=features.find(f=>f.properties.cvegeo===selected);
      renderInformation($,feature,selected,visibleReports,municipal,maximum(),colors);
      const notices=[];
      const unregistered=assignment.records.filter(p=>!registered.has(p.municipio)).length;
      if(unregistered)notices.push(`${unregistered} coordenadas en municipios no registrados`);
      if(assignment.rejected)notices.push(`${assignment.rejected} excluidos (inválidos o fuera del estado)`);
      if(!visible.length)notices.push('Sin registros para esta selección');
      $('status').textContent=notices.join(' · ');
      if(fit)map.fitBounds(feature?L.geoJSON(feature).getBounds():stateBounds,{padding:[40,40],maxZoom:12});
    }
    const unbind=bindControls($, {update,map,streets});
    update();
    return {map, cargarPuntos(points){assignment.ingest(points);update();}, destroy(){unbind();if(heat._frame){L.Util.cancelAnimFrame(heat._frame);heat._frame=null;}streets.off();municipalities.eachLayer(layer=>layer.off());map.remove();}};
}
