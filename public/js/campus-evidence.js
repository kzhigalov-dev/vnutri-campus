export const accessSources={
  university:'https://sutd.ru/education/ovz/',
  literA:'https://sutd.ru/upload/iblock/287/Pasport_voznes_a.pdf#page=2',
  literB:'https://sutd.ru/upload/iblock/fef/Pasport_voznes_b.pdf',
};

const secondFloorDetours={'f2-s24':2,'f2-s40':1,'f2-s41':1,'f2-s55':1};

export function floorSource(floor){
  return floor>=2&&floor<=4
    ?{label:'Навигационная панель · 2026',href:`./assets/floor${floor}-archive-plan.webp`}
    :{label:'Архивный план · 2012',href:`./assets/floor${floor}-archive-sheet.webp`};
}

export function secondFloorDetour(route){
  const stair=secondFloorDetours[route.to.id];
  if(!stair)return null;
  return route.connections.find(connection=>connection.fromFloor===3&&connection.toFloor===2&&connection.stairNumber===stair)??null;
}

export function fourthFloorSign(destination){
  if(destination.floor!==4||!/^\d{3}$/.test(destination.label))return null;
  const number=Number(destination.label);
  if(number>=452&&number<=465)return '451–465';
  if(number>=474&&number<=489)return '474–489';
  if(number>=444&&number<=450)return '444–451';
  return null;
}
