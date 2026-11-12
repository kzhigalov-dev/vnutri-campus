import {toWorld} from './geometry.js';

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


function streetEdge({source},depthScale){
 const points=source.footprint.map(point=>{
  const [x,z]=toWorld(source,...point);
  return [x,z*depthScale];
 });
 return points.reduce((longest,a,i)=>{
  const b=points[(i+1)%points.length];
  return Math.abs(b[0]-a[0])>Math.abs(longest[1][0]-longest[0][0])?[a,b]:longest;
 },[points[0],points[1]]);
}

// Register the archive outlines to the street edge of the fourth-floor plan.
// The translation is calculated after rotation, in the same space as the mesh.
export function floorDisplay(floor,reference,depthScale=2.2){
 let [x,z]=[floor.offset[0],floor.offset[1]*depthScale];
 let rotation=0,scale=1;
 if([1,5].includes(floor.source.floor)&&floor!==reference){
  const [a,b]=streetEdge(floor,depthScale).sort((left,right)=>right[0]-left[0]);
  const [c,d]=streetEdge(reference,depthScale).sort((left,right)=>left[0]-right[0]);
  const source=[b[0]-a[0],b[1]-a[1]],target=[d[0]-c[0],d[1]-c[1]];
  rotation=Math.atan2(source[1],source[0])-Math.atan2(target[1],target[0]);
  scale=Math.hypot(...target)/Math.hypot(...source);
  const cos=Math.cos(rotation),sin=Math.sin(rotation);
  x=c[0]+reference.offset[0]-scale*(a[0]*cos+a[1]*sin);
  z=c[1]+reference.offset[1]*depthScale-scale*(-a[0]*sin+a[1]*cos);
 }
 const cos=Math.cos(rotation),sin=Math.sin(rotation);
 return {x,z,rotation,scale,point([px,pz],height=0){
  const depth=pz*depthScale;
  return [x+scale*(px*cos+depth*sin),(floor.source.floor-1)*10+height,z+scale*(-px*sin+depth*cos)];
 }};
}

export function stairDisplay(source,index,place){
 const rect=source.stairs[index];
 if(!rect)return null;
 const [x,z,w,d]=rect;
 const a=place(toWorld(source,x,z)),across=place(toWorld(source,x+w,z)),along=place(toWorld(source,x,z+d));
 const dx=along[0]-a[0],dz=along[2]-a[2],length=Math.hypot(dx,dz);
 return {
  center:place(toWorld(source,x+w/2,z+d/2)),
  axis:[dx/length,dz/length],length,
  width:Math.hypot(across[0]-a[0],across[2]-a[2]),
 };
}
