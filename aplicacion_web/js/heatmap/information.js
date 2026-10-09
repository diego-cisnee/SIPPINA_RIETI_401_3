import {priorityColors,heatOptions} from './config.js';
import {summarizeCases} from './statistics.js';
export function renderInformation($,feature,selected,visible,municipal,maximum,colors) {
      $('selection-name').textContent=feature?feature.properties.nomgeo:'Estado de México';
      const summary=summarizeCases(visible);
      $('priority-counts').replaceChildren(...summary.priorities.map(({priority,count})=>{
        const row=document.createElement('li');
        const label=document.createElement('span');
        const swatch=document.createElement('i');swatch.className='priority-swatch';swatch.style.background=priorityColors[priority];
        label.append(swatch,document.createTextNode(priority));
        const total=document.createElement('strong');total.textContent=count.toLocaleString('es-MX');
        row.append(label,total);return row;
      }));
      $('recent-cases').textContent=`${summary.recent.toLocaleString('es-MX')} reportes nuevos en los últimos 30 días`;
      $('legend-title').textContent=municipal?'Registros por municipio':'Concentración de registros';
      $('legend-gradient').style.background='linear-gradient(90deg,'+(municipal?colors:Object.entries(heatOptions.gradient).sort((a,b)=>Number(a[0])-Number(b[0])).map(([,color])=>color)).join(',')+')';
      $('legend-min').textContent=municipal?'0':'Baja';$('legend-max').textContent=municipal?`${maximum} registros`:'Alta';
      $('legend-note').textContent=municipal?'Conteo absoluto · escala relativa al estado':'Intensidad relativa · reportes consultados';
}
