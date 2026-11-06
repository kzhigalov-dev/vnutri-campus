// Authored furniture vocabulary. Coordinates stay in each room's retained polygon bounds.
export const FLOOR_WORLDS = [
 {name:'Встречи и выставки',color:0xe9a174,landmarks:['Стойка встречи','Галерея макетов'],kind:'gallery'},
 {name:'Материал и форма',color:0xb4c5a0,landmarks:['Архив материалов','Большой раскройный стол'],kind:'material'},
 {name:'Идеи и изображения',color:0xc6b6db,landmarks:['Стена печатной графики','Световой павильон'],kind:'graphic'},
 {name:'Работа и обмен',color:0xf1c568,landmarks:['Восемь рабочих миров','Открытая библиотека'],kind:'work'},
 {name:'Проект и показ',color:0xc4dce0,landmarks:['Подиум дипломов','Форум проектов'],kind:'show'}
];
export function roomBounds(polygon){const xs=polygon.map(p=>p[0]),zs=polygon.map(p=>p[1]);const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);return {x:(minX+maxX)/2,z:(minZ+maxZ)/2,w:maxX-minX,d:maxZ-minZ};}
export function seatLayout(kind,spaceId){
 return Array.from({length:8},(_,i)=>{const col=i%4,row=Math.floor(i/4);if(spaceId==='f4-s13')return {seatId:i+1,x:(i%2-.5)*.54,z:(Math.floor(i/2)-1.5)*.2,angle:i%2?Math.PI/2:-Math.PI/2};if(spaceId==='f4-s36')return {seatId:i+1,x:(i%4-1.5)*.22,z:(row-.5)*.56,angle:row?Math.PI:0};if(kind==='reading')return {seatId:i+1,x:(i%2-.5)*.53,z:(Math.floor(i/2)-1.5)*.21,angle:i%2?Math.PI/2:-Math.PI/2};if(kind==='team'||kind==='lecture')return {seatId:i+1,x:(col-1.5)*.22,z:(row-.5)*.58,angle:row?Math.PI:0};if(kind==='quiet')return {seatId:i+1,x:(col-1.5)*.23,z:(row-.5)*.5,angle:0};return {seatId:i+1,x:(col-1.5)*.23,z:(row-.5)*.53,angle:row?Math.PI:0};});
}
// The same adapter is used by floor groups, DOM labels, route tubes and traveller samples.
export function visualWorld(position,depthScale=2.2,reversePlan=false){const direction=reversePlan?-1:1;return [position[0]*direction,position[1],position[2]*depthScale*direction];}
