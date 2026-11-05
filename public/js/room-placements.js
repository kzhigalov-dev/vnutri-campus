// Directory rooms mapped onto the 2026 panel plan of floor 4. The panel shows
// the modern numbering, so matches are exact; rooms the panel does not show
// (400, 446, 467, 469, 475) are not placed. Purpose evidence belongs to
// directory.json; it never verifies these placements.
export const roomPlacements=Object.freeze([
 ['404','f4-s16'],['411','f4-s7'],['415','f4-s2'],['419','f4-s35'],['420','f4-s37'],
 ['435','f4-s39'],['436','f4-s41'],['437','f4-s42'],['439','f4-s44'],['440','f4-s45'],
 ['452','f4-s27'],['459','f4-s4'],['460','f4-s24'],['462','f4-s8'],['466','f4-s13'],
 ['484','f4-s20'],['489','f4-s57']
].map(([number,spaceId])=>Object.freeze({number,spaceId,confidence:'exact'})));
export const placementForSpace=id=>roomPlacements.find(p=>p.spaceId===id);
export function applyRoomPlacements(campus,directory){for(const placement of roomPlacements){const room=directory.rooms.find(r=>r.number===placement.number),space=campus.entries.get(placement.spaceId);if(!room||!space)continue;space.modelIndex??=space.label;space.label=room.number;space.displayName=room.label;space.directoryRoom=room;space.placement=placement;}return campus;}
export function roomEvidence(room){const state={conflicting:'Источники указывают разные номера; функция требует проверки.',historical:'Историческая запись; нынешнее назначение не подтверждено.',needs_verification:'В источниках есть расхождения по назначению.',overlapping_assignments:'Номер указан у разных подразделений; совместное использование не подтверждено.'}[room.evidence_status];return [room.documented_floor?`${room.documented_floor}-й этаж указан в источнике.`:'Этаж предположен по номеру; источник его не подтверждает.',state||'Номер и назначение взяты из открытого справочника.','Положение на модели взято с навигационной панели 2026 года.'].join(' ');}
