import * as THREE from 'three';
import {createFloorEnvelope} from './floor-envelope.js?v=20261106-floors1';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {createMotion} from './navigation-motion.js';
import {toWorld} from './geometry.js';
import {createMaquetteProps} from './maquette-props.js?v=20261106-floors1';
import {createCampusExterior} from './campus-exterior.js?v=20261112-entrance';
import {visualWorld,roomBounds} from './maquette-layout.js?v=20261106-floors1';
import {pilotRoomBySpace} from './pilot-spaces.js';
import {createRoutePreview,sampleRoutePreview} from './route-preview.js?v=20261111-stairs';
import {buildRouteStair} from './route-stair.js';

export function createNavigatorScene({container,campus,onSelect,onFloor,onFailure,onPreview=()=>{},onSeatSelect=()=>{}}){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x284b73,0);
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 container.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-50,50,35,-35,.1,400);
 const controls=new OrbitControls(camera,renderer.domElement),motion=createMotion(),turnMotion=createMotion();
 controls.enableDamping=false;controls.minZoom=.5;controls.maxZoom=16;controls.maxPolarAngle=1.35;controls.minPolarAngle=.015;
 controls.target.set(0,20,0);camera.position.set(43,78,70);
 scene.add(new THREE.HemisphereLight(0xffffff,0x829bbb,2.1));
 const sun=new THREE.DirectionalLight(0xfff7ef,3);sun.position.set(-25,65,35);scene.add(sun);
 const fill=new THREE.DirectionalLight(0xbab7ec,1.1);fill.position.set(35,25,-30);scene.add(fill);
 const box=new THREE.BoxGeometry(1,1,1),floorGroups=new Map(),roomMeshes=new Map(),labels=new Map(),floorLabels=[],stairLabels=[];
 const resources=new Set([box]),materials=new Set(),textures=new Set(),labelLayer=document.createElement('div');
 labelLayer.className='nav-map-labels';container.append(labelLayer);const showcaseCaption=document.createElement('span');showcaseCaption.className='nav-showcase-caption';showcaseCaption.textContent='Авторский интерьер · 8 мест';Object.assign(showcaseCaption.style,{position:'absolute',left:'50%',bottom:'82px',transform:'translateX(-50%)',color:'#f0e9dc',font:'13px sans-serif',whiteSpace:'nowrap'});showcaseCaption.hidden=true;labelLayer.append(showcaseCaption);
 const stairTags=Array.from({length:2},()=>{
  const tag=document.createElement('span');
  tag.className='nav-stair-label nav-stair-endpoint';
  tag.setAttribute('aria-hidden','true');
  tag.hidden=true;
  container.append(tag);
  return tag;
 });
 const preview=document.createElement('div');preview.className='nav-map-preview';preview.hidden=true;preview.setAttribute('role','tooltip');container.append(preview);
 let hoveredFloor=null;
 let overviewMode='building',focusedRoom=null,chosenSpace=null,chosenSeatIds=new Set();const seatLabels=[];
 const depthScale=2.2;
 const reversePlan=floor=>floor===1||floor===5;
 const sceneWorld=(floor,p,y=.12)=>visualWorld(campus.world(floor,p,y),depthScale,reversePlan(floor));
 let selected=null,hovered=null,visible=new Set(campus.entries.keys()),availability=new Map(),view=0,topView=false;
 let routeGroup=null,traveller=null,previewPath=null,previewProgress=0,playing=false,previewFrame=null,previewTime=null;
 let stairFocus=null;
 const routeStairs=new Map(),routeSurfaces=[],routeEndpoints=[];
 let disposed=false,failed=false,viewRevision=0,transitioning=false,portraitState=null,down;
 const floorColors=[0xe9a174,0xb4c5a0,0xc6b6db,0xf1c568,0xc4dce0];
 function material(options){const m=new THREE.MeshStandardMaterial(options);materials.add(m);return m;}
 const hatch=document.createElement('canvas');hatch.width=hatch.height=64;const ctx=hatch.getContext('2d');
 ctx.fillStyle='#e0dce4';ctx.fillRect(0,0,64,64);ctx.strokeStyle='#aaa0b0';ctx.lineWidth=5;
 for(let i=-64;i<128;i+=24){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i+64,64);ctx.stroke();}
 const hatchTexture=new THREE.CanvasTexture(hatch);textures.add(hatchTexture);
 function shapeGeometry(f,polygons,depth=0){
  const shapes=polygons.map(poly=>{const s=new THREE.Shape();poly.forEach((p,i)=>{const [x,z]=toWorld(f,...p);i?s.lineTo(x,-z):s.moveTo(x,-z)});s.closePath();return s;});
  const g=depth?new THREE.ExtrudeGeometry(shapes,{depth,bevelEnabled:false}):new THREE.ShapeGeometry(shapes);g.rotateX(-Math.PI/2);resources.add(g);return g;
 }
 function trackedGeometry(g){resources.add(g);return g;}
 for(const [number,f] of campus.floors){
  const group=new THREE.Group();group.position.set(f.offset[0],(number-1)*10,f.offset[1]*depthScale);group.scale.z=depthScale;if(reversePlan(number)){group.rotation.y=Math.PI;group.position.x*=-1;group.position.z*=-1;}scene.add(group);
  const palette={
   plate:material({color:0xe1e0d7,roughness:.55,metalness:.05}),edge:material({color:0xc6b89e,roughness:.78,metalness:0}),
   wall:material({color:0xe4dbc9,roughness:.82,metalness:0}),
   sill:material({color:number===1?0x646f72:0xc8c5b7,roughness:.82}),trim:material({color:0xe5e0d2,roughness:.82}),frame:material({color:0x60737b,roughness:.5,metalness:.15}),glass:material({color:0x9bbec9,roughness:.35,metalness:.15}),room:material({color:0xe3d4ba,roughness:.6}),
   free:material({color:0xc9b88d,roughness:.4}),selected:material({color:0xffc587,roughness:.38,emissive:0xe98d4b,emissiveIntensity:.16}),
   hover:material({color:0xb6a7d5,roughness:.4}),busy:material({map:hatchTexture,color:0xe0d8df,roughness:.8}),
   stair:material({color:0x99a4a5,roughness:.35,metalness:.12}),stairRail:material({color:0x7c8889,roughness:.5,metalness:.2})
  };
  Object.values(palette).forEach(m=>{m.transparent=true;m.userData.baseOpacity=1;});palette.glass.userData.baseOpacity=.24;palette.glass.opacity=.24;
  const plate=new THREE.Mesh(shapeGeometry(f.source,[f.source.footprint,...(f.source.insets||[])],.55),[palette.plate,palette.edge]);plate.position.y=-.55;group.add(plate);
  const walls=new THREE.InstancedMesh(box,palette.wall,f.floor.walls.length),dummy=new THREE.Object3D();
  f.floor.walls.forEach((s,i)=>{const a=toWorld(f.source,s[0],s[1]),b=toWorld(f.source,s[2],s[3]);const height=.76;dummy.position.set((a[0]+b[0])/2,height/2,(a[1]+b[1])/2);dummy.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);dummy.scale.set(Math.hypot(b[0]-a[0],b[1]-a[1]),height,Math.max(.06,s[4]*80/f.source.imageWidth));dummy.updateMatrix();walls.setMatrixAt(i,dummy.matrix);});group.add(walls);
  const envelope=createFloorEnvelope({source:f.source,box,palette});group.add(envelope.group);
  const outlineMaterial=new THREE.LineBasicMaterial({color:0xd5794f,transparent:true,opacity:1,depthTest:false});materials.add(outlineMaterial);
  const rims=[];
  for(const space of f.spaces){
   const polygons=[space.polygon.map(p=>[(p[0]/80+.5)*f.source.imageWidth,p[1]*f.source.imageWidth/80+f.source.imageHeight/2])];
   const mesh=new THREE.Mesh(shapeGeometry(f.source,polygons,.10),palette.room);mesh.position.y=.02;mesh.userData.spaceId=space.id;group.add(mesh);roomMeshes.set(space.id,mesh);
   const outline=new THREE.LineSegments(trackedGeometry(new THREE.EdgesGeometry(mesh.geometry)),outlineMaterial);outline.position.y=.04;outline.visible=false;mesh.add(outline);rims.push(outline);
   const button=document.createElement('button');button.type='button';button.className='nav-room-label';button.addEventListener('click',()=>onSelect(space.id));button.addEventListener('pointerdown',e=>e.stopPropagation());
   button.addEventListener('pointerenter',()=>hover(space.id));button.addEventListener('pointerleave',()=>hover(null));button.addEventListener('focus',()=>hover(space.id));button.addEventListener('blur',()=>hover(null));
   labelLayer.append(button);labels.set(space.id,{button,space,outline,position:new THREE.Vector3(...sceneWorld(number,space.center,.82))});
  }
  for(const [stairIndex,[px,py,pw,ph]] of f.source.stairs.entries()){const [x,z]=toWorld(f.source,px,py),w=pw*80/f.source.imageWidth,d=ph*80/f.source.imageWidth;for(let i=0;i<8;i++){const mesh=new THREE.Mesh(box,f.landings.some(l=>l.isMain&&l.index===stairIndex)?palette.selected:palette.stair);mesh.position.set(x+w/2,.04+i*.035,z+(i+.5)*d/8);mesh.scale.set(w,.08+i*.035,d/8*.84);group.add(mesh);}
   // slim handrails keep the stair blocks readable as staircases, not stacked plates
   for(const side of [-1,1]){const rail=new THREE.Mesh(box,palette.stairRail||palette.stair);rail.position.set(x+w/2+side*(w/2+.05),.36,z+d/2);rail.scale.set(.06,.72,d*1.02);group.add(rail);}}
  for(const landing of f.landings){const b=document.createElement('span');b.className='nav-stair-label';b.textContent=landing.label||'Лестница';b.hidden=true;labelLayer.append(b);stairLabels.push({button:b,number,main:Boolean(landing.isMain),position:new THREE.Vector3(...sceneWorld(number,landing.center,1))});}
  const label=document.createElement('button');label.style.setProperty('--floor-color','#'+floorColors[number-1].toString(16));label.className='nav-level-label';label.type='button';label.innerHTML=`<span>${number}</span><small>этаж</small>`;label.setAttribute('aria-label',`${number}-й этаж`);label.addEventListener('click',()=>onFloor(number));labelLayer.append(label);
  const displayBoundary=[f.source.footprint,...(f.source.insets||[])].flat().map(p=>sceneWorld(number,toWorld(f.source,...p),.6));
  floorLabels.push({button:label,number,boundary:displayBoundary.map(p=>new THREE.Vector3(...p))});
  floorGroups.set(number,{group,palette,walls,plate,rims,outlineMaterial,envelope});
 }
 const decor=createMaquetteProps({campus,box,material,track:trackedGeometry,textures});
 for(const [n,f] of floorGroups){f.decor=decor.floors.get(n);f.group.add(f.decor);}
 for(const [id,root] of decor.roomShowcases){root.visible=false;root.position.y=30;scene.add(root);}
 const exterior=createCampusExterior({campus,box,material,track:trackedGeometry,textures,depthScale});
 const entranceMarker=document.createElement('button');
 entranceMarker.type='button';
 entranceMarker.className='nav-entrance-marker';
 entranceMarker.textContent='Главный вход';
 entranceMarker.setAttribute('aria-label','Главный вход со стороны Вознесенского проспекта — открыть 1-й этаж');
 entranceMarker.hidden=true;
 entranceMarker.addEventListener('click',()=>onFloor(1));
 entranceMarker.addEventListener('pointerdown',event=>event.stopPropagation());
 labelLayer.append(entranceMarker);
 const entrancePosition=new THREE.Vector3(exterior.entrance.x,1.25,exterior.entrance.z);
 const assembled=new THREE.Group();scene.add(assembled);
 for(const g of exterior.facades.values())assembled.add(g);
 assembled.add(exterior.roof,exterior.site);
 const shellMaterials=new Map();assembled.traverse(object=>{if(!object.material)return;const source=object.material;let owner=object;while(owner&&!owner.userData.floor)owner=owner.parent;const floor=owner?.userData.floor||0,key=floor+':'+source.uuid;if(!shellMaterials.has(key)){const clone=source.clone();clone.transparent=true;materials.add(clone);shellMaterials.set(key,{material:clone,floor,baseColor:clone.color.clone()});}object.material=shellMaterials.get(key).material;});let shellMix=1;
 function setShell(value){
  shellMix=value;assembled.visible=value>.001;exterior.roof.position.y=(1-value)*5.5;const peeking=hoveredFloor&&isBuilding()&&value>.99;
  for(const {material:m,floor,baseColor} of shellMaterials.values()){m.opacity=value*(peeking?(floor===hoveredFloor ? .30 : floor ? .085 : .28):1);m.depthWrite=m.opacity>.7;m.color.copy(baseColor);if(peeking&&floor===hoveredFloor)m.color.lerp(new THREE.Color(0xe5b77d),.35);}
  for(const [n,f] of floorGroups){const active=peeking&&n===hoveredFloor;f.group.position.y=active?exterior.levelBases[n-1]+.12:(n-1)*10;f.group.visible=!focusedRoom&&stairFocus===null&&(active||value<.42&&(!view||n===view));f.palette.plate.emissive.set(active?0x5e482c:0x000000);f.palette.plate.emissiveIntensity=active?.18:0;}
 }
 function previewFloor(number){
  number=Number(number)||null;if(!isBuilding()||transitioning||down||!floorGroups.has(number))number=null;if(hoveredFloor===number)return;
  hoveredFloor=number;container.dataset.hoverFloor=number?String(number):'';setShell(shellMix);preview.replaceChildren();preview.hidden=!number;
  if(number){const title=document.createElement('strong');title.textContent=number+' этаж';const hint=document.createElement('span');hint.textContent='Нажмите, чтобы открыть';preview.append(title,hint);}container.style.cursor=number?'pointer':'';render();
 }

 // A soft contact shadow sits on the exhibition stage; no persistent GPU animation.
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const shadowContext=shadowCanvas.getContext('2d'),gradient=shadowContext.createRadialGradient(64,64,8,64,64,64);gradient.addColorStop(0,'rgba(9,23,42,.5)');gradient.addColorStop(1,'rgba(9,23,42,0)');shadowContext.fillStyle=gradient;shadowContext.fillRect(0,0,128,128);const shadowTexture=new THREE.CanvasTexture(shadowCanvas);textures.add(shadowTexture);const shadowMaterial=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false});materials.add(shadowMaterial);const shadow=new THREE.Mesh(trackedGeometry(new THREE.PlaneGeometry(94,66)),shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.set(0,-1.15,2);scene.add(shadow);
 function isBuilding(){return !view&&overviewMode==='building';}
 function floorVisible(number){return !focusedRoom&&stairFocus===null&&!isBuilding()&&(!view||number===view);}
 function showWorld(){setShell(isBuilding()?1:0);shadow.visible=true;container.dataset.overview=overviewMode;}
 function roomContext(){
  container.dataset.roomFocus=focusedRoom||'';showcaseCaption.hidden=!focusedRoom;decor.setVisible(visible,focusedRoom);for(const [id,root] of decor.roomShowcases)root.visible=id===focusedRoom;for(const [n,f] of floorGroups)f.group.visible=floorVisible(n);
  for(const [n,f] of floorGroups){for(const child of f.group.children){if(child===decor.floors.get(n))continue;child.visible=focusedRoom?child===roomMeshes.get(focusedRoom):child.userData.spaceId?visible.has(child.userData.spaceId):true;}}
  for(const [id,p] of decor.roomProps)p.visible=focusedRoom?id===focusedRoom:visible.has(id);
  routeVisibility();
 }
 function clearSeatLabels(){for(const item of seatLabels)item.button.remove();seatLabels.length=0;}
 function createSeatLabels(id){clearSeatLabels();for(const seat of decor.showcaseSeats.get(id)||[]){const button=document.createElement('button');button.type='button';button.className='nav-seat-label';Object.assign(button.style,{position:'absolute',width:'26px',height:'26px',borderRadius:'50%',border:'1px solid rgba(35,61,80,.3)',font:'600 12px sans-serif',padding:'0',transform:'translate(-50%,-50%)',pointerEvents:'auto'});button.addEventListener('pointerdown',e=>e.stopPropagation());button.addEventListener('click',()=>{if(!availability.get(id)?.occupied?.has(seat.seatId))onSeatSelect(id,seat.seatId);});labelLayer.append(button);seatLabels.push({button,seat,id});}}
 function project(position){const p=position.clone().project(camera);return {x:(p.x+1)*container.clientWidth/2,y:(1-p.y)*container.clientHeight/2,z:p.z};}
 function render(){
  if(disposed||failed)return;shadow.visible=isBuilding();renderer.render(scene,camera);for(const item of seatLabels){const busy=availability.get(item.id)?.occupied?.has(item.seat.seatId),p=project(item.seat.mesh.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.32,0)));item.button.hidden=!focusedRoom||p.z< -1||p.z>1;item.button.style.left=p.x+'px';item.button.style.top=p.y+'px';item.button.disabled=Boolean(busy);item.button.textContent=busy?'×':String(item.seat.seatId);const chosen=chosenSpace===item.id&&chosenSeatIds.has(item.seat.seatId);item.button.style.background=busy?'#233d50':chosen?'#e89873':'#f0e9dc';item.button.setAttribute('aria-pressed',String(chosen));item.button.style.color=busy?'#f0e9dc':'#233d50';item.button.setAttribute('aria-label',`Место ${item.seat.seatId}${busy?' · занято':' · свободно'}`);}
  labelLayer.hidden=stairFocus!==null;
  const width=container.clientWidth,height=container.clientHeight;
  const entrancePoint=project(entrancePosition);
  entranceMarker.hidden=!isBuilding()||transitioning||camera.position.z>=exterior.front.z
   ||Math.abs(entrancePoint.z)>=1||entrancePoint.x<62||entrancePoint.x>width-62||entrancePoint.y<60||entrancePoint.y>height-66;
  if(!entranceMarker.hidden){
   entranceMarker.style.left=entrancePoint.x+'px';
   entranceMarker.style.top=entrancePoint.y+'px';
  }
  const activeStair=routeStairs.get(stairFocus);
  for(const [index,tag] of stairTags.entries()){
   const landing=activeStair?.landings[index];
   const p=landing&&project(landing.position);
   tag.hidden=!p||p.x<28||p.x>width-28||p.y<24||p.y>height-24||Math.abs(p.z)>=1;
   if(!tag.hidden){
    tag.textContent=`${landing.floor} этаж`;
    tag.style.left=p.x+'px';
    tag.style.top=(p.y+(index===0?20:-17))+'px';
   }
  }
  if(activeStair)return;
  const occupied=[],isMobile=matchMedia('(max-width:700px)').matches;
  for(const item of floorLabels){const p=item.boundary.map(project).reduce((left,current)=>current.x<left.x?current:left);item.button.hidden=Boolean(focusedRoom)||isBuilding()||Boolean(view&&view!==item.number)||p.z< -1||p.z>1;item.button.style.left=Math.max(26,Math.min(width-26,p.x-28))+'px';item.button.style.top=p.y+'px';item.button.setAttribute('aria-pressed',String(view===item.number));item.button.style.opacity=routeGroup&&!routeEndpoints.some(endpoint=>endpoint.floors.has(item.number))?'.55':'';}
  for(const endpoint of routeEndpoints){const p=project(endpoint.position),show=routeGroup?.visible&&!focusedRoom&&(!view||view===endpoint.floor)&&p.z>-1&&p.z<1&&p.x>36&&p.x<width-36&&p.y>35&&p.y<height-30;endpoint.label.hidden=!show;if(show){endpoint.label.style.left=p.x+'px';endpoint.label.style.top=(p.y-12)+'px';}}
  for(const item of (routeGroup?[]:stairLabels).filter(item=>item.main&&item.number===view)){const p=project(item.position);if(p.z>-1&&p.z<1)occupied.push(p);}
  const ordered=[...labels.values()].sort((a,b)=>Number(b.space.id===selected)-Number(a.space.id===selected)||Number(b.space.id===hovered)-Number(a.space.id===hovered)||Number(Boolean(pilotRoomBySpace(b.space.id)))-Number(Boolean(pilotRoomBySpace(a.space.id)))||Number(Boolean(b.space.directoryRoom))-Number(Boolean(a.space.directoryRoom)));
  for(const item of ordered){const {space,button}=item,p=project(item.position),pilot=pilotRoomBySpace(space.id),show=!routeGroup&&!focusedRoom&&!isBuilding()&&!(transitioning&&assembled.visible)&&visible.has(space.id)&&(!view?Boolean(pilot)||Boolean(space.directoryRoom)||space.id===selected:view===space.floor)&&p.z>-1&&p.z<1&&p.x>35&&p.x<width-40&&p.y>(isMobile?126:80)&&p.y<height-65&&!occupied.some(q=>Math.abs(q.x-p.x)<80&&Math.abs(q.y-p.y)<31);button.hidden=!show;if(show){button.style.left=p.x+'px';button.style.top=p.y+'px';occupied.push(p);}}
  for(const item of stairLabels){const p=project(item.position),show=!routeGroup&&!focusedRoom&&!(transitioning&&assembled.visible)&&view===item.number&&p.z>-1&&p.z<1&&p.x>28&&p.x<width-45&&p.y>125&&p.y<height-65&&(item.main||!occupied.some(q=>Math.abs(q.x-p.x)<78&&Math.abs(q.y-p.y)<28));item.button.hidden=!show;if(show){item.button.style.left=p.x+'px';item.button.style.top=p.y+'px';occupied.push(p);}}
  if(hoveredFloor&&isBuilding()){const p=project(new THREE.Vector3(exterior.front.x,exterior.levelBases[hoveredFloor-1]+1,exterior.front.z));preview.hidden=false;preview.style.left=Math.max(105,Math.min(width-105,p.x))+'px';preview.style.top=Math.max(100,Math.min(height-75,p.y-38))+'px';}
  if(hovered){const item=labels.get(hovered),p=project(item.position);preview.hidden=p.z< -1||p.z>1;preview.style.left=Math.max(110,Math.min(width-110,p.x))+'px';preview.style.top=Math.max(125,Math.min(height-90,p.y-45))+'px';}
 }
 function applyMaterial(id){const mesh=roomMeshes.get(id),f=floorGroups.get(labels.get(id).space.floor),status=availability.get(id),pilot=pilotRoomBySpace(id);mesh.material=id===selected&&!focusedRoom?f.palette.selected:id===hovered?f.palette.hover:pilot?(status?.free===0?f.palette.busy:f.palette.free):f.palette.room;labels.get(id).outline.visible=id===selected||id===hovered;}
 function hover(id){if(id===hovered||(id&&(down||transitioning)))return;const old=hovered;hovered=id;if(old)applyMaterial(old);if(id){applyMaterial(id);const item=labels.get(id),status=availability.get(id);preview.replaceChildren();const title=document.createElement('strong');title.textContent=item.space.label+' · '+item.space.floor+' этаж';const text=document.createElement('span');text.textContent=item.space.displayName||'Помещение модели';preview.append(title,text);if(pilotRoomBySpace(id)){const free=document.createElement('small');free.textContent=status?.text||'Учебная зона бронирования';preview.append(free);}}else preview.hidden=true;container.style.cursor=id?'pointer':'';render();}
 function refresh(){decor.setVisible(visible,focusedRoom);decor.setAvailability(availability,selected);for(const [id,mesh] of roomMeshes){mesh.visible=visible.has(id)&&(!focusedRoom||id===focusedRoom);if(decor.roomProps.has(id))decor.roomProps.get(id).visible=visible.has(id)&&(!focusedRoom||id===focusedRoom);applyMaterial(id);const {button,space}=labels.get(id),pilot=pilotRoomBySpace(id),status=availability.get(id);button.classList.toggle('is-pilot',Boolean(pilot));button.classList.toggle('is-busy',status?.free===0);button.setAttribute('aria-pressed',String(id===selected));button.textContent=space.label+(pilot?` ${status?.free===0?'×':status?.free!=null?status.free+'/8':'○'}`:'');button.setAttribute('aria-label',`${space.label}${space.displayName?' · '+space.displayName:''}${pilot?' · '+(status?.text||'Пилотная зона'):''}`);}render();}
 function fit(){const aspect=container.clientWidth/(container.clientHeight||1);if(stairFocus!==null){
  const radius=routeStairs.get(stairFocus).bounds.radius;
  const half=Math.max(radius/aspect,radius)*1.27;
  camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;
  camera.updateProjectionMatrix();
  return;
 }if(focusedRoom){const w=8*.78+7*.63,h=(8*.63+7*.78)*.75+1.3,half=Math.max(w/aspect,h)*.73;camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.zoom=1;camera.updateProjectionMatrix();return;}const half=view?(aspect<.7?48:Math.max(14,46/aspect)):(aspect<.7?Math.max(43,28/aspect):Math.max(34,47/aspect));camera.left=-half*aspect;camera.right=half*aspect;const lift=matchMedia('(max-width:700px)').matches?half*.24:0;const framing=isBuilding()?Math.max(36,(container.clientWidth<=700?49:57)/aspect):half;camera.left=-framing*aspect;camera.right=framing*aspect;camera.top=framing+lift;camera.bottom=-framing+lift;camera.updateProjectionMatrix();}
 function routeVisibility(){
  if(!routeGroup)return;
  routeGroup.visible=!isBuilding()&&!focusedRoom;
  for(const surface of routeSurfaces){
   const {routeFloor,planOnly,liftFloors}=surface.userData;
   surface.visible=stairFocus===null&&(!view||view===routeFloor||liftFloors?.includes(view))
    &&(!planOnly||topView)&&(!liftFloors||!topView);
  }
  let shown=0;
  for(const [index,{group,floors,connector}] of routeStairs.entries()){
   group.visible=routeGroup.visible&&!topView&&(stairFocus===null?(!view||floors.includes(view)):stairFocus===index);
   if(connector)connector.visible=stairFocus===null;
   if(group.visible)shown++;
  }
  container.dataset.routeStairs=String(shown);
  const position=sampleRoutePreview(previewPath,previewProgress);
  traveller.visible=stairFocus===null&&Boolean(position&&(!view||position.floor===view));
 }
 function opacity(f,value){
  for(const m of Object.values(f.palette)){m.opacity=value*(m.userData.baseOpacity??1);m.depthWrite=m.opacity>.5;}
  f.outlineMaterial.opacity=value;
  f.decor.visible=value>=.7;
 }
 async function setView(number,{animate=true,keepPreview=false,stairIndex=null}={}){
  previewFloor(null);if(!keepPreview)pausePreview();focusedRoom=null;controls.maxZoom=16;clearSeatLabels();
  const revision=++viewRevision;
  stairFocus=routeStairs.has(stairIndex)?stairIndex:null;
  if(stairFocus===null)delete container.dataset.stairFocus;
  else container.dataset.stairFocus=String(stairFocus);
  view=stairFocus===null?(Number(number)||0):0;
  if(!view)topView=false;
  roomContext();
  container.dataset.floorView=String(view);container.dataset.projection=topView?'plan':'3d';hover(null);
  // In the plan projection low walls must not shade the corridor as long dark bands.
  for(const [,fg] of floorGroups)fg.walls.scale.y=topView?.24:1;transitioning=true;container.setAttribute('aria-busy','true');turnMotion.cancel();motion.cancel();fit();
  const startShell=shellMix,endShell=isBuilding()?1:0,starts=new Map();for(const [n,f] of floorGroups){starts.set(n,f.group.visible?f.palette.plate.opacity:0);}setShell(startShell);
  routeVisibility();const target=stairFocus===null
   ?new THREE.Vector3(isBuilding()&&container.clientWidth/container.clientHeight>=1.15?5:0,view?(view-1)*10:isBuilding()?(container.clientWidth>=700?12:7):20,isBuilding()?-1.8:0)
   :routeStairs.get(stairFocus).bounds.center.clone();
  const portrait=container.clientWidth/container.clientHeight<.7;
  const offset=topView?new THREE.Vector3(0,80,.12):(portrait?new THREE.Vector3(...(isBuilding()?[-47,46,-62]:[-65,49,-35])):new THREE.Vector3(-26,48,-76));
  const to=target.clone().add(offset),from=camera.position.clone(),old=controls.target.clone(),zoom=camera.zoom,fromUp=camera.up.clone(),toUp=topView?(portrait?new THREE.Vector3(1,0,0):new THREE.Vector3(0,0,-1)):new THREE.Vector3(0,1,0);controls.enabled=false;
  await motion.run(t=>{setShell(startShell+(endShell-startShell)*t);for(const [n,f] of floorGroups){const end=!view||n===view?1:0;opacity(f,starts.get(n)+(end-starts.get(n))*t);}camera.up.lerpVectors(fromUp,toUp,t).normalize();camera.position.lerpVectors(from,to,t);controls.target.lerpVectors(old,target,t);camera.zoom=zoom+(1-zoom)*t;camera.updateProjectionMatrix();controls.update();render();},animate?(startShell!==endShell?900:620):0);
  if(revision!==viewRevision||disposed||failed)return;setShell(endShell);for(const [n,f] of floorGroups){f.group.visible=floorVisible(n);opacity(f,1);}transitioning=false;container.setAttribute('aria-busy','false');controls.enabled=true;controls.enableRotate=!topView;routeVisibility();render();
 }
 async function focusRoom(id){const entry=campus.entries.get(id);if(!entry?.center)return;const request=setView(entry.floor),revision=viewRevision;await request;if(revision!==viewRevision||view!==entry.floor||disposed)return;
  const pilot=pilotRoomBySpace(id),bounds=pilot?{x:0,z:0,w:8,d:7}:roomBounds(entry.polygon),p=pilot?new THREE.Vector3(0,30.38,0):new THREE.Vector3(...sceneWorld(entry.floor,[bounds.x,bounds.z],.38)),start=camera.position.clone(),old=controls.target.clone(),initial=camera.zoom;
  if(pilot){focusedRoom=id;hover(null);roomContext();createSeatLabels(id);}
  const aspect=container.clientWidth/container.clientHeight,projectedW=bounds.w*.78+bounds.d*(pilot?1:depthScale)*.63,projectedH=(bounds.w*.63+bounds.d*(pilot?1:depthScale)*.78)*.75+1.3,half=Math.max(projectedW/aspect,projectedH)*.73;
  const focusZoom=pilot?Math.max(1,(camera.top-camera.bottom)/(half*2)):2.4,offset=pilot?new THREE.Vector3(8,14,10):camera.position.clone().sub(controls.target);controls.maxZoom=pilot?64:16;
  transitioning=true;container.setAttribute('aria-busy','true');controls.enabled=false;
  const complete=await turnMotion.run(t=>{controls.target.lerpVectors(old,p,t);camera.position.lerpVectors(start,p.clone().add(offset),t);camera.zoom=initial+(focusZoom-initial)*t;camera.updateProjectionMatrix();controls.update();render();},440);
  if(!complete||revision!==viewRevision||disposed||failed)return;transitioning=false;container.setAttribute('aria-busy','false');controls.enabled=true;render();
 }
 function clearRoute(){
  pausePreview();
  if(routeGroup){
   const geometries=new Set(),routeMaterials=new Set();
   routeGroup.traverse(object=>{
    if(object.isInstancedMesh)object.dispose();
    if(object.geometry&&object.geometry!==box)geometries.add(object.geometry);
    if(object.material)routeMaterials.add(object.material);
   });
   geometries.forEach(geometry=>geometry.dispose());
   routeMaterials.forEach(material=>material.dispose());
   scene.remove(routeGroup);
  }
  routeGroup=null;traveller=null;previewPath=null;previewProgress=0;stairFocus=null;
  for(const endpoint of routeEndpoints)endpoint.label.remove();routeEndpoints.length=0;
  routeSurfaces.length=0;routeStairs.clear();
  delete container.dataset.stairFocus;
  container.dataset.routeStairs='0';
 }
 function routeMaterial(color){return new THREE.MeshBasicMaterial({color,depthTest:false,depthWrite:false,transparent:true,toneMapped:false});}
 function routeLine(a,b,radius,group,color=0xe66c4b){const length=a.distanceTo(b);if(length<.001)return;const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,8),routeMaterial(color));mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());mesh.renderOrder=10;group.add(mesh);}
 function addRouteSurface(object,floor,planOnly=false){
  object.userData.routeFloor=floor;
  object.userData.planOnly=planOnly;
  routeSurfaces.push(object);
  routeGroup.add(object);
 }
 function addRouteMarker(floor,point,color,planOnly=false){
  const marker=new THREE.Mesh(new THREE.TorusGeometry(.42,.1,8,20),routeMaterial(color));
  marker.rotation.x=Math.PI/2;
  marker.position.set(...sceneWorld(floor,point,.28));
  marker.renderOrder=12;
  addRouteSurface(marker,floor,planOnly);
 }
 function addRouteEndpoint(floor,point,title,color,floors){
  const position=new THREE.Vector3(...sceneWorld(floor,point,.34));
  const group=new THREE.Group();group.position.copy(position);
  const outer=new THREE.Mesh(new THREE.CylinderGeometry(.62,.62,.11,24),routeMaterial(0xf5f0e5));outer.renderOrder=12;group.add(outer);
  const inner=new THREE.Mesh(new THREE.CylinderGeometry(.41,.41,.13,24),routeMaterial(color));inner.position.y=.07;inner.renderOrder=13;group.add(inner);
  addRouteSurface(group,floor);
  const label=document.createElement('span');label.textContent=title;label.setAttribute('aria-hidden','true');
  Object.assign(label.style,{position:'absolute',transform:'translate(-50%,-100%)',background:'#f5f0e5',color:'#263d53',borderRadius:'5px',padding:'3px 7px',font:'600 11px/1.3 sans-serif',whiteSpace:'nowrap',boxShadow:'0 2px 6px #10283e30',pointerEvents:'none'});
  labelLayer.append(label);routeEndpoints.push({label,position,floor,floors});
 }
 function addRoutePath(points,group){
  const spans=[];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],length=a.distanceTo(b);if(length>.001)spans.push({a,b,length});}
  if(!spans.length)return;
  const transform=new THREE.Object3D(),up=new THREE.Vector3(0,1,0);
  // The pale casing separates the route from the busy model without hiding its shape.
  for(const [radius,color,order] of [[.23,0xf6eee1,9],[.13,0xd9553e,10]]){
   const mesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(radius,radius,1,8),routeMaterial(color),spans.length);
   for(const [index,{a,b,length}] of spans.entries()){transform.position.copy(a).add(b).multiplyScalar(.5);transform.scale.set(1,length,1);transform.quaternion.setFromUnitVectors(up,b.clone().sub(a).normalize());transform.updateMatrix();mesh.setMatrixAt(index,transform.matrix);}
   mesh.instanceMatrix.needsUpdate=true;mesh.renderOrder=order;group.add(mesh);
  }
 }
 function addRouteStair(index,connection,stair,stepMaterial,landingMaterial){
  const group=new THREE.Group();
  const transform=new THREE.Object3D();
  for(const [boxes,material] of [[stair.treads,stepMaterial],[stair.landings,landingMaterial]]){
   if(!boxes.length)continue;
   const mesh=new THREE.InstancedMesh(box,material,boxes.length);
   for(const [index,part] of boxes.entries()){
    transform.position.set(...part.position);
    transform.scale.set(...part.size);
    transform.rotation.y=part.rotationY;
    transform.updateMatrix();
    mesh.setMatrixAt(index,transform.matrix);
   }
   mesh.instanceMatrix.needsUpdate=true;
   group.add(mesh);
  }
  const bounds=new THREE.Box3().setFromObject(group).getBoundingSphere(new THREE.Sphere());
  const raised=point=>new THREE.Vector3(point[0],point[1]+.09,point[2]);
  const spans=[];
  let connector=null;
  for(let i=1;i<stair.path.length;i++){
   const from=stair.path[i-1],to=stair.path[i];
   if(stair.connector?.[0]===from&&stair.connector[1]===to){
    const geometry=new THREE.BufferGeometry().setFromPoints([raised(from),raised(to)]);
    const material=new THREE.LineDashedMaterial({color:0xa46782,dashSize:.38,gapSize:.24,depthTest:false,depthWrite:false,transparent:true});
    connector=new THREE.Line(geometry,material);
    connector.computeLineDistances();
    connector.renderOrder=11;
    group.add(connector);
    continue;
   }
   if(from.some((value,index)=>Math.abs(value-to[index])>1e-4))spans.push([raised(from),raised(to)]);
  }
  if(spans.length){
   const up=new THREE.Vector3(0,1,0),direction=new THREE.Vector3();
   const mesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(.09,.09,1,8),routeMaterial(0xe66c4b),spans.length);
   for(const [index,[from,to]] of spans.entries()){
    direction.subVectors(to,from);
    transform.position.copy(from).add(to).multiplyScalar(.5);
    transform.scale.set(1,direction.length(),1);
    transform.quaternion.setFromUnitVectors(up,direction.normalize());
    transform.updateMatrix();
    mesh.setMatrixAt(index,transform.matrix);
   }
   mesh.instanceMatrix.needsUpdate=true;
   mesh.renderOrder=10;
   group.add(mesh);
  }
  const {fromFloor,toFloor,from,to}=connection;
  addRouteMarker(fromFloor,from,0xa46782,true);
  addRouteMarker(toFloor,to,0xa46782,true);
  const floors=[fromFloor,toFloor];
  const landings=[stair.landings[0],stair.landings.at(-1)].flatMap((part,index)=>part
   ?[{position:new THREE.Vector3(...part.position),floor:index===0?Math.min(...floors):Math.max(...floors)}]
   :[]);
  routeStairs.set(index,{group,floors,bounds,connector,landings});
  routeGroup.add(group);
 }
 function setRoute(route){
  if(route&&focusedRoom){focusedRoom=null;clearSeatLabels();roomContext();}
  const wasStairFocused=stairFocus!==null;
  clearRoute();
  overviewMode=route?'spread':'building';
  showWorld();
  if(!route){
   if(wasStairFocused)setView(view,{animate:false});
   else render();
   return;
  }
  routeGroup=new THREE.Group();
  scene.add(routeGroup);
  for(const segment of route.segments){
   const group=new THREE.Group();
   addRouteSurface(group,segment.floor);
   addRoutePath(segment.points.map(point=>new THREE.Vector3(...sceneWorld(segment.floor,point,.18))),group);
  }
  const routeFloors=new Set(route.floors);
  const sameEndpoint=route.from.floor===route.to.floor&&route.from.point.every((value,index)=>Math.abs(value-route.to.point[index])<1e-6);
  addRouteEndpoint(route.from.floor,route.from.point,sameEndpoint?'Начало / цель':'Начало',0x594a79,routeFloors);
  if(!sameEndpoint)addRouteEndpoint(route.to.floor,route.to.point,'Цель',0xd9553e,routeFloors);
  const stairs=new Map();
  if(route.connections.length){
   let stepMaterial,landingMaterial;
   for(const [index,connection] of route.connections.entries()){
    if(connection.kind==='lift'){
     const {fromFloor,toFloor,from,to}=connection;
     const group=new THREE.Group();
     group.userData.liftFloors=[fromFloor,toFloor];
     addRouteSurface(group,fromFloor);
     routeLine(new THREE.Vector3(...sceneWorld(fromFloor,from,.27)),new THREE.Vector3(...sceneWorld(toFloor,to,.27)),.18,group,0x8a72bb);
     addRouteMarker(fromFloor,from,0x8a72bb,true);
     addRouteMarker(toFloor,to,0x8a72bb,true);
     continue;
    }
    const stair=buildRouteStair(connection,sceneWorld);
    stepMaterial??=new THREE.MeshStandardMaterial({color:0xc8a7bb,roughness:.75});
    landingMaterial??=new THREE.MeshStandardMaterial({color:0xdec3cd,roughness:.65});
    stairs.set(connection,stair);
    addRouteStair(index,connection,stair,stepMaterial,landingMaterial);
   }
  }
  previewPath=createRoutePreview(route,sceneWorld,connection=>stairs.get(connection)?.path.map(([x,y,z])=>[x,y+.09,z]));
  traveller=new THREE.Mesh(new THREE.SphereGeometry(.34,16,12),routeMaterial(0x564177));
  traveller.renderOrder=15;
  routeGroup.add(traveller);
  setPreview(0);
 }
 function reportPreview(){const sample=sampleRoutePreview(previewPath,previewProgress);onPreview({playing,progress:previewProgress,floor:sample?.floor,step:sample?.step,toFloor:sample?.toFloor,connection:sample?.connection,done:previewProgress>=1});}
 function setPreview(progress){previewProgress=Math.max(0,Math.min(1,Number(progress)||0));const p=sampleRoutePreview(previewPath,previewProgress);if(traveller&&p)traveller.position.set(...p.position);routeVisibility();reportPreview();render();}
 function pausePreview(){playing=false;if(previewFrame!==null)cancelAnimationFrame(previewFrame);previewFrame=null;previewTime=null;reportPreview();}
 function playPreview(){
  if(!previewPath||!previewPath.length)return;if(playing){pausePreview();return;}
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){setPreview(Math.min(1,previewProgress+.2));return;}
  if(previewProgress>=1)setPreview(0);playing=true;previewTime=null;setView(0,{keepPreview:true});reportPreview();
  const duration=Math.max(8000,Math.min(24000,previewPath.length*170));
  function tick(time){if(!playing||disposed||failed||document.hidden){pausePreview();return;}if(previewTime!==null)setPreview(previewProgress+(time-previewTime)/duration);previewTime=time;if(previewProgress>=1){pausePreview();return;}previewFrame=requestAnimationFrame(tick);}
  previewFrame=requestAnimationFrame(tick);
 }
 function settle(){previewFloor(null);viewRevision++;motion.cancel();turnMotion.cancel();transitioning=false;container.setAttribute('aria-busy','false');controls.enabled=true;controls.enableRotate=!topView;setShell(isBuilding()?1:0);for(const [n,f] of floorGroups){f.group.visible=floorVisible(n);opacity(f,1);}render();}
 function resize(){if(!container.clientWidth||!container.clientHeight)return;renderer.setSize(container.clientWidth,container.clientHeight,false);const portrait=container.clientWidth/container.clientHeight<.7;if(focusedRoom){portraitState=portrait;if(transitioning){settle();controls.target.set(0,30.38,0);camera.position.set(8,44.38,10);controls.update();}else turnMotion.cancel();fit();render();return;}if(portrait!==portraitState){portraitState=portrait;if(transitioning){fit();render();}else setView(view,{animate:false,stairIndex:stairFocus});}else{fit();render();}}
 const observer=new ResizeObserver(resize);observer.observe(container);controls.addEventListener('change',render);
 controls.addEventListener('start',()=>{pausePreview();settle();hover(null);});
 controls.addEventListener('end',()=>{if(focusedRoom&&camera.zoom<.70)setView(view);else if(view&&camera.zoom<.70)onFloor(0);});
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 function hitObject(e){if(stairFocus!==null)return null;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(pointer,camera);if(isBuilding())return ray.intersectObject(assembled,true).map(hit=>{let o=hit.object;while(o&&!o.userData.floor)o=o.parent;return o;}).find(Boolean)||null;const targets=focusedRoom?[]:[...roomMeshes.values()].filter(m=>m.visible&&m.parent.visible);for(const [id,seats] of (focusedRoom?decor.showcaseSeats:decor.seats))if(visible.has(id)&&(!focusedRoom||id===focusedRoom)&&(!view||campus.entries.get(id).floor===view))targets.push(...seats.map(s=>s.mesh));return ray.intersectObjects(targets,false)[0]?.object||null;}
 function hitAt(e){return hitObject(e)?.userData.spaceId||null;}
 renderer.domElement.addEventListener('pointermove',e=>{if(down||e.pointerType==='touch'||transitioning)return;if(isBuilding()){hover(null);previewFloor(hitObject(e)?.userData.floor);}else{previewFloor(null);hover(hitAt(e));}});
 renderer.domElement.addEventListener('pointerleave',()=>{hover(null);previewFloor(null)});
 renderer.domElement.addEventListener('pointerdown',e=>{previewFloor(null);pausePreview();if(transitioning)settle();turnMotion.cancel();hover(null);down=[e.clientX,e.clientY];});
 renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5){down=null;return;}down=null;const hit=hitObject(e);if(hit?.userData.floor){onFloor(hit.userData.floor);return;}if(hit?.userData.seatId){const {spaceId,seatId}=hit.userData;if(!availability.get(spaceId)?.occupied?.has(seatId))onSeatSelect(spaceId,seatId);return;}if(hit?.userData.spaceId)onSelect(hit.userData.spaceId);});
 renderer.domElement.addEventListener('pointercancel',()=>{down=null;});
 const visibility=()=>{if(document.hidden){pausePreview();settle();}};document.addEventListener('visibilitychange',visibility);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;pausePreview();motion.cancel();turnMotion.cancel();onFailure();});refresh();resize();
 return {setView,previewFloor,setOverviewMode(mode){const next=mode==='spread'?'spread':'building';if(next===overviewMode)return;overviewMode=next;if(!view)setView(0);},setSeatSelection(spaceId,ids){chosenSpace=spaceId;chosenSeatIds=new Set(ids||[]);decor.setSeatSelection(spaceId,ids);decor.setAvailability(availability,selected);render();},focusRoom,setRoute,playPreview,pausePreview,seekPreview(value){pausePreview();setPreview(value);},setVisible(ids){visible=new Set(ids);if(hovered&&!visible.has(hovered))hover(null);refresh();},setAvailability(data){availability=data;refresh();},select(id,{focus=true}={}){const leaving=!id&&focusedRoom;selected=id;refresh();if(leaving)setView(view);else if(id&&focus)focusRoom(id);},
  setProjection(plan){topView=Boolean(plan);setView(view);},rotate(){if(topView)return;pausePreview();settle();const offset=camera.position.clone().sub(controls.target),from=Math.atan2(offset.x,offset.z),radius=Math.hypot(offset.x,offset.z);turnMotion.run(t=>{const angle=from+Math.PI/2*t;camera.position.set(controls.target.x+Math.sin(angle)*radius,camera.position.y,controls.target.z+Math.cos(angle)*radius);controls.update();render();},450);},
  zoom(factor){pausePreview();settle();camera.zoom=THREE.MathUtils.clamp(camera.zoom*factor,.5,focusedRoom?64:16);camera.updateProjectionMatrix();if(focusedRoom&&camera.zoom<.70)setView(view);else if(view&&camera.zoom<.70)onFloor(0);else render();},reset(){setView(view,{stairIndex:stairFocus});},get view(){return view;},
  dispose(){disposed=true;clearSeatLabels();pausePreview();motion.cancel();turnMotion.cancel();document.removeEventListener('visibilitychange',visibility);observer.disconnect();controls.dispose();clearRoute();exterior.dispose();decor.dispose();floorGroups.forEach(f=>{f.walls.dispose();f.envelope.dispose();});resources.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());stairTags.forEach(tag=>tag.remove());labelLayer.remove();preview.remove();renderer.dispose();renderer.domElement.remove();}
 };
}
