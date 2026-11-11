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
