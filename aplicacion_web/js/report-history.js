/* Línea de tiempo del historial real. Los filtros no consultan ni modifican datos. */
window.RIETI_HISTORY_READY = (async () => {
  await window.RIETI_READY;
  if (!await window.RIETI_AUTH_READY) return;
  const id = new URLSearchParams(location.search).get('id');
  if (!Object.hasOwn(window.RIETI_REPORTS || {}, id)) return;
  const list = document.querySelector('[data-report-history]');
  const message = document.querySelector('[data-history-message]');
  const count = document.querySelector('[data-history-count]');
  const retry = document.querySelector('[data-history-retry]');
  const buttons = [...document.querySelectorAll('[data-history-filter]')];
  const formatter = new Intl.DateTimeFormat('es-MX', {timeZone:'UTC',day:'numeric',month:'long',year:'numeric'});
  let entries = [], filter = 'all', loading = false;
  const text = (tag, className, value) => {
    const node = document.createElement(tag); node.className = className; node.textContent = value; return node;
  };
  const changes = entry => ({
    status: entry.previousStatus !== entry.status,
    priority: entry.previousPriority !== entry.priority,
    comment: typeof entry.comments === 'string' && entry.comments.trim().length > 0,
  });
  function dateInfo(value) {
    const match = typeof value === 'string' && value.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
    if (match) {
      const [,day,month,year,hour,minute,second] = match;
      const date = new Date(Date.UTC(Number(year),Number(month)-1,Number(day)));
      if (date.getUTCFullYear()===Number(year) && date.getUTCMonth()===Number(month)-1 && date.getUTCDate()===Number(day) && Number(hour)<24 && Number(minute)<60 && Number(second)<60) {
        const key = `${year}-${month}-${day}`;
        return {key,day:formatter.format(date),time:`${hour}:${minute} h`,datetime:`${key}T${hour}:${minute}:${second}`};
      }
    }
    return {key:'unknown',day:'Fecha no disponible',time:'Hora no disponible',datetime:null};
  }
  function badge(value, type) {
    const label = value || 'No disponible';
    const node = text('span', type === 'status' ? 'status' : 'priority', type === 'status' ? window.RIETI_STATUS_LABEL(label) : label);
    if (type === 'status' && Object.hasOwn(window.RIETI_STATUS_CLASSES, label)) node.classList.add('status--'+window.RIETI_STATUS_CLASSES[label]);
    if (type === 'priority') node.dataset.priority = label;
    return node;
  }
  function eventItem(entry, date) {
    const flags = changes(entry);
    const item = document.createElement('li'); item.className = 'history-event'; item.dataset.historyEntry = String(entry.id);
    const hasName = typeof entry.actor?.name === 'string' && entry.actor.name.trim();
    const name = hasName ? entry.actor.name.trim() : 'Autor no disponible';
    const initials = hasName ? name.split(/\s+/).slice(0,2).map(word=>Array.from(word)[0]).join('').toLocaleUpperCase('es') : '?';
    const avatar = text('span','history-avatar'+(entry.actor?.role==='administrador'?' history-avatar--admin':''),initials); avatar.setAttribute('aria-hidden','true');
    const body = document.createElement('div'); body.className = 'history-event-body';
    const heading = document.createElement('div'); heading.className = 'history-event-heading';
    const description = document.createElement('div'); description.className = 'history-event-description';
    const action = flags.status && flags.priority ? 'cambió el estado y la prioridad' : flags.status ? 'cambió el estado' : flags.priority ? 'cambió la prioridad' : flags.comment ? 'agregó un comentario' : 'actualizó el reporte';
    description.append(text('strong','',name),document.createTextNode(' '),text('span','',action));
    const time = text('time','history-event-time',date.time);
    if (date.datetime) time.dateTime = date.datetime;
    time.title = entry.changedAt || 'Fecha no disponible'; heading.append(description,time);
    const role = entry.actor?.role === 'administrador' ? 'Administrador' : entry.actor?.role === 'procurador' ? 'Procurador municipal' : 'Identidad no disponible';
    body.append(heading,text('p','history-event-role',role));
    for (const [type,label,before,after] of [['status','Estado',entry.previousStatus,entry.status],['priority','Prioridad',entry.previousPriority,entry.priority]]) {
      if (!flags[type]) continue;
      const line = document.createElement('div'); line.className = 'history-change';
      const arrow = text('span','history-change-arrow','→'); arrow.setAttribute('aria-label','cambió a');
      line.append(text('span','history-change-label',label),badge(before,type),arrow,badge(after,type)); body.append(line);
    }
    if (flags.comment) body.append(text('p','history-comment',entry.comments));
    item.append(avatar,body); return item;
  }
  function render() {
    const visible = entries.filter(entry => filter === 'all' || changes(entry)[filter]);
    list.replaceChildren(); count.textContent = String(visible.length);
    count.setAttribute('aria-label',`${visible.length} movimientos`);
    message.hidden = visible.length > 0;
    message.textContent = entries.length ? 'No hay actividad de este tipo.' : 'Este reporte todavía no tiene movimientos registrados.';
    let previousDay, group;
    for (const entry of visible) {
      const date = dateInfo(entry.changedAt);
      if (date.key !== previousDay) {
        const day = document.createElement('li'); day.className = 'history-day';
        day.append(text('h3','history-date',date.day.toLocaleUpperCase('es')));
        group = document.createElement('ol'); group.className = 'history-events';
        day.append(group); list.append(day); previousDay = date.key;
      }
      group.append(eventItem(entry,date));
    }
  }
  async function loadHistory() {
    if (loading) return;
    loading = true; list.setAttribute('aria-busy','true'); list.replaceChildren();
    retry.hidden = true; message.hidden = false; message.textContent = 'Consultando historial…'; count.textContent = '…';
    buttons.forEach(button => { button.disabled = true; });
    try {
      const response = await window.RIETI_API.request(`/api/reportes/${encodeURIComponent(id)}/historial`);
      if (!response.ok) throw new Error('history');
      const {data} = await response.json();
      if (!Array.isArray(data) || !data.every(entry=>entry&&typeof entry==='object')) throw new Error('history');
      entries = data; render(); buttons.forEach(button => { button.disabled = false; });
    } catch {
      list.replaceChildren(); count.textContent = '—'; message.hidden = false;
      message.textContent = 'No fue posible consultar el historial. Puedes reintentar sin salir del reporte.'; retry.hidden = false;
    } finally { loading = false; list.setAttribute('aria-busy','false'); }
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.historyFilter;
    buttons.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    render();
  }));
  retry.addEventListener('click',loadHistory);
  await loadHistory();
})();
