import {toWorld} from './geometry.js';
import {pointInPolygon} from './walk-navigation.js';

export function createNavigatorPlan({container,campus,onSelect}){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 if(!ctx)throw new Error('Canvas 2D unavailable');
 canvas.setAttribute('aria-hidden','true');
 canvas.className='nav-plan-canvas';
 canvas.style.touchAction='none';
 container.prepend(canvas);
 let view=0,route=null,selected=null,zoom=1,pan=[0,0],visible=new Set(campus.entries.keys()),drag=null;
 let projection=null;
 const floors=new Map([...campus.floors].map(([number,floor])=>{
  const outlines=[floor.source.footprint,...(floor.source.insets??[])].map(poly=>poly.map(point=>toWorld(floor.source,...point)));
  const x=outlines.flatMap(poly=>poly.map(point=>point[0])),y=outlines.flatMap(poly=>poly.map(point=>point[1]));
  const bounds={minX:Math.min(...x),maxX:Math.max(...x),minY:Math.min(...y),maxY:Math.max(...y)};
  return [number,{floor,outlines,bounds}];
 }));
 function draw(){
  const width=container.clientWidth,height=container.clientHeight;
  if(!width||!height)return;
  const dpr=Math.min(devicePixelRatio||1,2);
  const w=Math.round(width*dpr),h=Math.round(height*dpr);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,width,height);
  const number=view||route?.from.floor||campus.entries.get(selected)?.floor||1;
  const {floor,outlines,bounds}=floors.get(number);
  const spanX=bounds.maxX-bounds.minX,spanY=bounds.maxY-bounds.minY;
  const scale=Math.max(.1,Math.min((width-42)/spanX,(height-56)/spanY))*zoom;
  const center=[(width-spanX*scale)/2+pan[0]-bounds.minX*scale,(height-spanY*scale)/2+pan[1]-bounds.minY*scale];
  const pixel=point=>[point[0]*scale+center[0],point[1]*scale+center[1]];
  projection={floor,scale,center};
  container.dataset.floorView=String(number);
  container.dataset.projection='plan';
  function path(points,closed=false){
   if(!points.length)return;
   ctx.beginPath();ctx.moveTo(...pixel(points[0]));
   for(const point of points.slice(1))ctx.lineTo(...pixel(point));
   if(closed)ctx.closePath();
  }
  function polygon(points,fill,stroke){
   path(points,true);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();
  }
  for(const polygonPoints of outlines)polygon(polygonPoints,'#f1ede2','#b6bbc2');
  for(const room of floor.spaces){
   const active=room.id===selected;
   polygon(room.polygon,active?'#f0b093':visible.has(room.id)?'#dce5eb':'#e9e5dc','#94a4ae');
   if(!active&&(scale<5||!visible.has(room.id)))continue;
   const [x,y]=pixel(room.center);
   ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=active?'700 12px Golos, sans-serif':'10px Golos, sans-serif';
   const roomWidth=(Math.max(...room.polygon.map(point=>point[0]))-Math.min(...room.polygon.map(point=>point[0])))*scale;
   if(active||ctx.measureText(room.label).width+5<roomWidth){
    ctx.fillStyle='#26303a';ctx.fillText(room.label,x,y);
   }
  }
  if(!route)return;
  for(const segment of route.segments.filter(segment=>segment.floor===number)){
   ctx.lineJoin='round';ctx.lineCap='round';
   path(segment.points);ctx.strokeStyle='#fff8ed';ctx.lineWidth=7;ctx.stroke();
   ctx.strokeStyle='#b84b2f';ctx.lineWidth=4;ctx.stroke();
  }
  function marker(point,color,label){
   const [x,y]=pixel(point);
   ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#fff8ed';ctx.stroke();
   if(label){
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 9px Golos, sans-serif';ctx.fillStyle='white';ctx.fillText(label,x,y);
   }
  }
  for(const connection of route.connections){
   const label=connection.kind==='lift'?'Л':connection.stairNumber?String(connection.stairNumber):'';
   if(connection.fromFloor===number)marker(connection.from,'#624981',label);
   if(connection.toFloor===number)marker(connection.to,'#624981',label);
  }
  if(route.from.floor===number)marker(route.from.point,'#3c6078','А');
  if(route.to.floor===number)marker(route.to.point,'#9e432e','Б');
 }
 canvas.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0)return;
  canvas.setPointerCapture(event.pointerId);
  drag={x:event.clientX,y:event.clientY,pan:[...pan]};
 });
 canvas.addEventListener('pointermove',event=>{
  if(!drag||!event.isPrimary)return;
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(Math.hypot(dx,dy)<5)return;
  pan=[drag.pan[0]+dx,drag.pan[1]+dy];draw();
 });
 canvas.addEventListener('pointerup',event=>{
  if(!drag||!event.isPrimary)return;
  const moved=Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>=5;
  drag=null;
  if(moved||!projection)return;
  const rect=canvas.getBoundingClientRect(),{floor,scale,center}=projection;
  const point=[(event.clientX-rect.left-center[0])/scale,(event.clientY-rect.top-center[1])/scale];
  const room=floor.spaces.find(item=>visible.has(item.id)&&pointInPolygon(point,item.polygon));
  if(room)onSelect(room.id);
 });
 canvas.addEventListener('pointercancel',()=>{drag=null;});
 const reset=()=>{zoom=1;pan=[0,0];draw();};
 const observer=new ResizeObserver(draw);observer.observe(container);
 return {
  get view(){return Number(container.dataset.floorView)||1;},
  setView(number){view=Number(number)||0;reset();},
  focusRoom(id){view=campus.entries.get(id)?.floor??view;reset();},
  setRoute(value){route=value;draw();},
  select(id){selected=id;draw();},
  setVisible(ids){visible=new Set(ids);draw();},
  zoom(factor){zoom=Math.min(5,Math.max(.65,zoom*factor));draw();},
  reset,
  dispose(){observer.disconnect();canvas.remove();},
 };
}
