/* Cálculos puros sobre RIETI_REPORTS. Contrato futuro: registeredAt y resolvedAt
   en ISO 8601 (con zona horaria si incluyen hora); nunca usar updatedAt como resolución. */
(() => {
  const priorities = ['Baja', 'Media', 'Alta', 'Urgente'];
  const colors = { Baja: '#27834d', Media: '#d6ac19', Alta: '#e58027', Urgente: '#ce4545' };
  const clean = value => typeof value === 'string' && value.trim() && value !== 'No disponible' ? value.trim() : '';
  function date(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return null;
    if (value.length > 10 && (+value.slice(11, 13) > 23 || +value.slice(14, 16) > 59 || (value[16] === ':' && +value.slice(17, 19) > 59))) return null;
    const day = value.slice(0, 10), calendar = new Date(day + 'T00:00:00Z');
    if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== day) return null;
    const parsed = new Date(value.length === 10 ? value + 'T00:00:00Z' : value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  function registered(report) {
    if (report.registeredAt) return date(report.registeredAt);
    // La API actual entrega la hora local en reportedAt y el día ISO en date.
    const match = clean(report.reportedAt).match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
    if (match) {
      const iso = `${match[3]}-${match[2]}-${match[1]}`;
      if (!date(iso) || +match[4] > 23 || +match[5] > 59) return null;
      return new Date(+match[3], +match[2] - 1, +match[1], +match[4], +match[5]);
    }
    return date(report.date);
  }
  const resolved = report => (window.RIETI_STATUS_GROUPS?.resolved || ['Resuelto', 'Concluido']).includes(report.status);
  function counts(records, key, fallback) {
    const groups = new Map();
    records.forEach(report => {
      const label = clean(report[key]) || (fallback && clean(report[fallback])) || 'Sin especificar';
      groups.set(label, (groups.get(label) || 0) + 1);
    });
    return [...groups].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'));
  }
  function averages(records) {
    return priorities.map(priority => {
      const hours = records.filter(report => report.priority === priority && resolved(report)).flatMap(report => {
        const start = registered(report), end = date(report.resolvedAt);
        return start && end && end >= start ? [(end - start) / 3600000] : [];
      });
      return { priority, count: hours.length, hours: hours.length ? hours.reduce((sum, value) => sum + value, 0) / hours.length : null };
    });
  }
  function bucket(value, unit) {
    const result = new Date(value.toISOString().slice(0, 10) + 'T00:00:00Z');
    if (unit === 'month') result.setUTCDate(1);
    if (unit === 'week') result.setUTCDate(result.getUTCDate() - (result.getUTCDay() + 6) % 7);
    return result.toISOString().slice(0, 10);
  }
  function trend(records, unit = 'month', period = {}) {
    const events = [];
    records.forEach(report => {
      const start = date(report.date) || registered(report), end = date(report.resolvedAt);
      if (start) events.push([start.toISOString().slice(0, 10), 'registered']);
      if (resolved(report) && start && end && end >= start) events.push([end.toISOString().slice(0, 10), 'resolved']);
    });
    const latest = events.map(([day]) => day).sort().at(-1) || new Date().toISOString().slice(0, 10);
    const year = Number(period.year || latest.slice(0, 4));
    const month = Number(period.month || latest.slice(5, 7));
    if (!Number.isInteger(year) || year < 1 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) return [];
    const prefix = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
    let groups;
    if (unit === 'month') {
      groups = Array.from({ length: 12 }, (_, i) => ({ date: `${String(year).padStart(4, '0')}-${String(i + 1).padStart(2, '0')}-01`, registered: 0, resolved: 0 }));
    } else if (unit === 'week') {
      // Cuatro tramos del mes; el último incluye 29–31 para no perder reportes.
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      groups = [1, 8, 15, 22].map((day, i) => ({ date: `${prefix}-${String(day).padStart(2, '0')}`, endDate: `${prefix}-${String(i === 3 ? lastDay : day + 6).padStart(2, '0')}`, registered: 0, resolved: 0 }));
    } else {
      const start = date(period.weekStart || bucket(date(latest), 'week'));
      if (!start) return [];
      groups = Array.from({ length: 7 }, (_, i) => ({ date: new Date(+start + i * 86400000).toISOString().slice(0, 10), registered: 0, resolved: 0 }));
    }
    events.forEach(([day, kind]) => {
      const group = groups.find(row => unit === 'month' ? day.slice(0, 7) === row.date.slice(0, 7) : unit === 'week' ? day >= row.date && day <= row.endDate : day === row.date);
      if (group) group[kind]++;
    });
    return groups;
  }
  window.RIETI_STATISTICS = { priorities, colors, clean, date, registered, resolved, counts, averages, trend };
})();
