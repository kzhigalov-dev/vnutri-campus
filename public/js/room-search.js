// Search only the identifiers and descriptions supplied by the caller. Scores
// let each view put an exact room number before partial and textual matches.
export function normalizeRoomSearch(value='') {
  return String(value).replace(/[№#]/g,' ').normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g,'е')
    .replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
}

export function searchRoom(query,{numbers=[],text=[]}={}) {
  let q=normalizeRoomSearch(query);
  // A room prefix is meaningful only when followed by a number: retain words
  // such as "аудитория" when searching for a room's name.
  q=q.replace(/^(?:аудитория|ауд|кабинет|каб|помещение)\s+(?=\d)/u,'');
  if(!q)return 3;
  const identifiers=numbers.filter(value=>value!=null).map(normalizeRoomSearch).filter(Boolean);
  if(identifiers.some(value=>value===q))return 0;
  if(/^\d{3}$/.test(q)&&numbers.some(value=>roomRangeContains(value,q)))return .5;
  if(identifiers.some(value=>value.startsWith(q)))return 1;
  if(identifiers.some(value=>value.includes(q)))return 2;
  const searchable=[...numbers,...text].filter(value=>value!=null).map(normalizeRoomSearch).join(' ');
  return searchable.includes(q)?3:Infinity;
}

function roomRangeContains(label,number){
  const range=String(label).trim().match(/^(\d{3})\s*[-–—]\s*(\d{3})$/u);
  return range&&range[1][0]===range[2][0]&&Number(range[1])<=Number(number)&&Number(number)<=Number(range[2]);
}
