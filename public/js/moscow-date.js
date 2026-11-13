export function todayMoscow(now=new Date()) {
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const v=k=>p.find(x=>x.type===k).value;
  return `${v('year')}-${v('month')}-${v('day')}`;
}
