import {priorities} from './config.js';
export function summarizeCases(records, today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())) {
 const end=new Date(today+'T00:00:00Z');
 const start=new Date(end);start.setUTCDate(start.getUTCDate()-29);
 const counts=new Map(priorities.map(priority=>[priority,0]));let recent=0;
 for(const record of records){
  const priority=priorities.includes(record.prioridad)?record.prioridad:'Sin especificar';
  counts.set(priority,(counts.get(priority)||0)+1);
  const day=record.fecha_registro;
  if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))continue;
  const date=new Date(day+'T00:00:00Z');
  if(Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===day&&date>=start&&date<=end)recent++;
 }
 return {recent,priorities:[...counts].map(([priority,count])=>({priority,count}))};
}
