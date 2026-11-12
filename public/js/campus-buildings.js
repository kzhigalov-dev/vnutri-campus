import {createRouteLink} from './navigation-link.js';
import {roomPlacements} from './room-placements.js';

export const campusBuildings=[
 {id:'voznesensky',address:'Вознесенский проспект, 46',code:'В',source:'https://sutd.ru/contacts/?address=109',plan:'./index.html?start=start-1'},
 {id:'morskaya',address:'Большая Морская улица, 18',code:'Без буквы',source:'https://sutd.ru/contacts/?address=23'},
 {id:'dzhambula',address:'переулок Джамбула, 13',code:'Д',source:'https://sutd.ru/contacts/?address=275'},
 {id:'sadovaya',address:'Садовая улица, 54',code:'С',source:'https://sutd.ru/contacts/'},
 {id:'mokhovaya',address:'Моховая улица, 26',code:'М',source:'https://sutd.ru/contacts/'},
 {id:'tsvetochnaya',address:'Цветочная улица, 8',code:'Ц',source:'https://sutd.ru/contacts/'},
 {id:'rosenshteyna',address:'улица Розенштейна, 8–12',code:'Р',source:'https://sutd.ru/contacts/'},
];

export const buildingById=id=>campusBuildings.find(building=>building.id===id);

export function mappedBuildingRoom(buildingId, roomNumber) {
 if(buildingId!=='voznesensky')return null;
 return roomPlacements.find(room=>room.number===roomNumber&&room.confidence==='exact')??null;
}

export function buildingDirectionsLink(base, buildingId, roomNumber) {
 const url=new URL('./buildings.html',base);
 url.searchParams.set('to',buildingId);
 if(mappedBuildingRoom(buildingId,roomNumber))url.searchParams.set('room',roomNumber);
 return url;
}

export function indoorDirections(base, buildingId, roomNumber) {
 const building=buildingById(buildingId);
 if(!building?.plan)return null;
 const room=mappedBuildingRoom(buildingId,roomNumber);
 const url=room?createRouteLink(base,'start-1',room.spaceId):new URL(building.plan,base);
 return {url,room};
}

export function cityDirections(fromId,toId){
 const from=buildingById(fromId),to=buildingById(toId);
 if(!to||from?.id===to.id)return null;
 const url=new URL('https://www.google.com/maps/dir/');
 url.searchParams.set('api','1');
 if(from)url.searchParams.set('origin',`Санкт-Петербург, ${from.address}`);
 url.searchParams.set('destination',`Санкт-Петербург, ${to.address}`);
 url.searchParams.set('travelmode','walking');
 return url.href;
}
