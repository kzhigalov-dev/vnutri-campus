import * as THREE from 'three';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {createMotion} from './navigation-motion.js';
import {toWorld} from './geometry.js';
import {pilotRoomBySpace} from './pilot-spaces.js';
import {createRoutePreview,sampleRoutePreview} from './route-preview.js?v=20261030-4';

export function createNavigatorScene({container,campus,onSelect,onFloor,onFailure,onPreview=()=>{}}){
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0xeeeef3);
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 container.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-50,50,35,-35,.1,400);
 const controls=new OrbitControls(camera,renderer.domElement),motion=createMotion(),turnMotion=createMotion();
 controls.enableDamping=false;controls.minZoom=.5;controls.maxZoom=5;controls.maxPolarAngle=1.35;controls.minPolarAngle=.015;
 controls.target.set(0,20,0);camera.position.set(43,78,70);
 scene.add(new THREE.HemisphereLight(0xffffff,0xa9a4bf,2.2));
 const sun=new THREE.DirectionalLight(0xfff7ef,3);sun.position.set(-25,65,35);scene.add(sun);
 const fill=new THREE.DirectionalLight(0xbab7ec,1.1);fill.position.set(35,25,-30);scene.add(fill);
 const box=new THREE.BoxGeometry(1,1,1),floorGroups=new Map(),roomMeshes=new Map(),labels=new Map(),floorLabels=[],stairLabels=[];
 const resources=new Set([box]),materials=new Set(),textures=new Set(),labelLayer=document.createElement('div');
 labelLayer.className='nav-map-labels';container.append(labelLayer);
 const preview=document.createElement('div');preview.className='nav-map-preview';preview.hidden=true;preview.setAttribute('role','tooltip');container.append(preview);
 let selected=null,hovered=null,visible=new Set(campus.entries.keys()),availability=new Map(),view=0,topView=false;
 let routeGroup=null,traveller=null,previewPath=null,previewProgress=0,playing=false,previewFrame=null,previewTime=null;
 let disposed=false,failed=false,viewRevision=0,transitioning=false,portraitState=null,down;
 const floorColors=[0xaa9bc7,0x8eb9aa,0xd6aa86,0x9aaeda,0xc4a0bc];
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
  const group=new THREE.Group();group.position.set(f.offset[0],(number-1)*10,f.offset[1]);scene.add(group);
  const palette={
   plate:material({color:0xf8f7fc,roughness:.55,metalness:.05}),edge:material({color:floorColors[number-1],roughness:.38,metalness:.12}),
   wall:material({color:0x9e93ac,roughness:.48,metalness:.08}),room:material({color:0xdcd9e9,roughness:.6}),
   free:material({color:0xef7858,roughness:.4}),selected:material({color:0xffc587,roughness:.38,emissive:0xe98d4b,emissiveIntensity:.16}),
   hover:material({color:0xb6a7d5,roughness:.4}),busy:material({map:hatchTexture,color:0xe0d8df,roughness:.8}),
   stair:material({color:0xa99dc5,roughness:.35,metalness:.12})
  };
  Object.values(palette).forEach(m=>{m.transparent=true;m.userData.baseOpacity=1;});
  const plate=new THREE.Mesh(shapeGeometry(f.source,[f.source.footprint,...(f.source.insets||[])],.55),[palette.plate,palette.edge]);plate.position.y=-.55;group.add(plate);
  const walls=new THREE.InstancedMesh(box,palette.wall,f.floor.walls.length),dummy=new THREE.Object3D();
  f.floor.walls.forEach((s,i)=>{const a=toWorld(f.source,s[0],s[1]),b=toWorld(f.source,s[2],s[3]);dummy.position.set((a[0]+b[0])/2,.38,(a[1]+b[1])/2);dummy.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);dummy.scale.set(Math.hypot(b[0]-a[0],b[1]-a[1]),.76,Math.max(.06,s[4]*80/f.source.imageWidth));dummy.updateMatrix();walls.setMatrixAt(i,dummy.matrix);});group.add(walls);
  const outlineMaterial=new THREE.LineBasicMaterial({color:0xd5794f,transparent:true,opacity:1,depthTest:false});materials.add(outlineMaterial);
  const rims=[];
  for(const space of f.spaces){
   const polygons=[space.polygon.map(p=>[(p[0]/80+.5)*f.source.imageWidth,p[1]*f.source.imageWidth/80+f.source.imageHeight/2])];
   const mesh=new THREE.Mesh(shapeGeometry(f.source,polygons,.10),palette.room);mesh.position.y=.02;mesh.userData.spaceId=space.id;group.add(mesh);roomMeshes.set(space.id,mesh);
   const outline=new THREE.LineSegments(trackedGeometry(new THREE.EdgesGeometry(mesh.geometry)),outlineMaterial);outline.position.y=.04;outline.visible=false;mesh.add(outline);rims.push(outline);
   const button=document.createElement('button');button.type='button';button.className='nav-room-label';button.addEventListener('click',()=>onSelect(space.id));button.addEventListener('pointerdown',e=>e.stopPropagation());
   button.addEventListener('pointerenter',()=>hover(space.id));button.addEventListener('pointerleave',()=>hover(null));button.addEventListener('focus',()=>hover(space.id));button.addEventListener('blur',()=>hover(null));
   labelLayer.append(button);labels.set(space.id,{button,space,outline,position:new THREE.Vector3(...campus.world(number,space.center,.82))});
  }
  for(const [px,py,pw,ph] of f.source.stairs){const [x,z]=toWorld(f.source,px,py),w=pw*80/f.source.imageWidth,d=ph*80/f.source.imageWidth;for(let i=0;i<8;i++){const mesh=new THREE.Mesh(box,palette.stair);mesh.position.set(x+w/2,.04+i*.035,z+(i+.5)*d/8);mesh.scale.set(w,.08+i*.035,d/8*.84);group.add(mesh);}}
  for(const landing of f.landings){const b=document.createElement('span');b.className='nav-stair-label';b.textContent='Лестница';b.hidden=true;labelLayer.append(b);stairLabels.push({button:b,number,position:new THREE.Vector3(...campus.world(number,landing.center,1))});}
  const label=document.createElement('button');label.style.setProperty('--floor-color','#'+floorColors[number-1].toString(16));label.className='nav-level-label';label.type='button';label.innerHTML=`<span>${number}</span><small>этаж</small>`;label.setAttribute('aria-label',`${number}-й этаж`);label.addEventListener('click',()=>onFloor(number));labelLayer.append(label);
  floorLabels.push({button:label,number,position:new THREE.Vector3(Math.min(...f.source.footprint.map(p=>toWorld(f.source,...p)[0]))+f.offset[0]-4,(number-1)*10+.6,7)});
  floorGroups.set(number,{group,palette,walls,rims,outlineMaterial});
 }
 function project(position){const p=position.clone().project(camera);return {x:(p.x+1)*container.clientWidth/2,y:(1-p.y)*container.clientHeight/2,z:p.z};}
 function render(){
  if(disposed||failed)return;renderer.render(scene,camera);
  const occupied=[],width=container.clientWidth,height=container.clientHeight,isMobile=matchMedia('(max-width:700px)').matches;
  for(const item of floorLabels){const p=project(item.position);item.button.hidden=Boolean(view&&view!==item.number)||p.z< -1||p.z>1;item.button.style.left=Math.max(26,Math.min(width-26,p.x))+'px';item.button.style.top=p.y+'px';item.button.setAttribute('aria-pressed',String(view===item.number));}
  const ordered=[...labels.values()].sort((a,b)=>Number(b.space.id===selected)-Number(a.space.id===selected)||Number(b.space.id===hovered)-Number(a.space.id===hovered)||Number(Boolean(pilotRoomBySpace(b.space.id)))-Number(Boolean(pilotRoomBySpace(a.space.id)))||Number(Boolean(b.space.directoryRoom))-Number(Boolean(a.space.directoryRoom)));
  for(const item of ordered){const {space,button}=item,p=project(item.position),pilot=pilotRoomBySpace(space.id),show=visible.has(space.id)&&(!view?Boolean(pilot)||Boolean(space.directoryRoom)||space.id===selected:view===space.floor)&&p.z>-1&&p.z<1&&p.x>35&&p.x<width-40&&p.y>(isMobile?126:80)&&p.y<height-65&&!occupied.some(q=>Math.abs(q.x-p.x)<80&&Math.abs(q.y-p.y)<31);button.hidden=!show;if(show){button.style.left=p.x+'px';button.style.top=p.y+'px';occupied.push(p);}}
  for(const item of stairLabels){const p=project(item.position),show=view===item.number&&p.z>-1&&p.z<1&&p.x>28&&p.x<width-45&&p.y>125&&p.y<height-65&&!occupied.some(q=>Math.abs(q.x-p.x)<78&&Math.abs(q.y-p.y)<28);item.button.hidden=!show;if(show){item.button.style.left=p.x+'px';item.button.style.top=p.y+'px';occupied.push(p);}}
  if(hovered){const item=labels.get(hovered),p=project(item.position);preview.hidden=p.z< -1||p.z>1;preview.style.left=Math.max(110,Math.min(width-110,p.x))+'px';preview.style.top=Math.max(125,Math.min(height-90,p.y-45))+'px';}
 }
 function applyMaterial(id){const mesh=roomMeshes.get(id),f=floorGroups.get(labels.get(id).space.floor),status=availability.get(id),pilot=pilotRoomBySpace(id);mesh.material=id===selected?f.palette.selected:id===hovered?f.palette.hover:pilot?(status?.free===0?f.palette.busy:f.palette.free):f.palette.room;labels.get(id).outline.visible=id===selected||id===hovered;}
 function hover(id){if(id===hovered||(id&&(down||transitioning)))return;const old=hovered;hovered=id;if(old)applyMaterial(old);if(id){applyMaterial(id);const item=labels.get(id),status=availability.get(id);preview.replaceChildren();const title=document.createElement('strong');title.textContent=item.space.label+' · '+item.space.floor+' этаж';const text=document.createElement('span');text.textContent=item.space.displayName||'Помещение модели';preview.append(title,text);if(pilotRoomBySpace(id)){const free=document.createElement('small');free.textContent=status?.text||'Учебная зона бронирования';preview.append(free);}}else preview.hidden=true;container.style.cursor=id?'pointer':'';render();}
 function refresh(){for(const [id,mesh] of roomMeshes){mesh.visible=visible.has(id);applyMaterial(id);const {button,space}=labels.get(id),pilot=pilotRoomBySpace(id),status=availability.get(id);button.classList.toggle('is-pilot',Boolean(pilot));button.classList.toggle('is-busy',status?.free===0);button.setAttribute('aria-pressed',String(id===selected));button.textContent=space.label+(pilot?` ${status?.free===0?'×':status?.free!=null?status.free+'/8':'○'}`:'');button.setAttribute('aria-label',`${space.label}${space.displayName?' · '+space.displayName:''}${pilot?' · '+(status?.text||'Пилотная зона'):''}`);}render();}
 function fit(){const aspect=container.clientWidth/(container.clientHeight||1),half=view?(aspect<.7?48:Math.max(14,43/aspect)):(aspect<.7?Math.max(43,28/aspect):Math.max(34,47/aspect));camera.left=-half*aspect;camera.right=half*aspect;const lift=matchMedia('(max-width:700px)').matches?half*.24:0;camera.top=half+lift;camera.bottom=-half+lift;camera.updateProjectionMatrix();}
 function routeVisibility(){routeGroup?.traverse(o=>{if(o.userData.routeFloor)o.visible=!view||view===o.userData.routeFloor;if(o.userData.connection)o.visible=!view;});if(traveller){const p=sampleRoutePreview(previewPath,previewProgress);traveller.visible=Boolean(p&&(!view||p.floor===view));}}
 function opacity(f,value){for(const m of Object.values(f.palette)){m.opacity=value;m.depthWrite=value>.5;}f.outlineMaterial.opacity=value;}
 async function setView(number,{animate=true,keepPreview=false}={}){
  if(!keepPreview)pausePreview();const revision=++viewRevision;view=Number(number)||0;if(!view)topView=false;
  container.dataset.floorView=String(view);container.dataset.projection=topView?'plan':'3d';hover(null);transitioning=true;container.setAttribute('aria-busy','true');turnMotion.cancel();motion.cancel();fit();
  const starts=new Map();for(const [n,f] of floorGroups){starts.set(n,f.group.visible?f.palette.plate.opacity:0);f.group.visible=true;}
  routeVisibility();const target=new THREE.Vector3(0,view?(view-1)*10:20,0),portrait=container.clientWidth/container.clientHeight<.7;
  const offset=topView?new THREE.Vector3(0,80,.12):view?(portrait?new THREE.Vector3(52,60,8):new THREE.Vector3(18,55,46)):(portrait?new THREE.Vector3(70,58,8):new THREE.Vector3(30,45,75));
  const to=target.clone().add(offset),from=camera.position.clone(),old=controls.target.clone(),zoom=camera.zoom,fromUp=camera.up.clone(),toUp=topView?(portrait?new THREE.Vector3(1,0,0):new THREE.Vector3(0,0,-1)):new THREE.Vector3(0,1,0);controls.enabled=false;
  await motion.run(t=>{for(const [n,f] of floorGroups){const end=!view||n===view?1:0;opacity(f,starts.get(n)+(end-starts.get(n))*t);}camera.up.lerpVectors(fromUp,toUp,t).normalize();camera.position.lerpVectors(from,to,t);controls.target.lerpVectors(old,target,t);camera.zoom=zoom+(1-zoom)*t;camera.updateProjectionMatrix();controls.update();render();},animate?680:0);
  if(revision!==viewRevision||disposed||failed)return;for(const [n,f] of floorGroups){f.group.visible=!view||n===view;opacity(f,1);}transitioning=false;container.setAttribute('aria-busy','false');controls.enabled=true;controls.enableRotate=!topView;routeVisibility();render();
 }
 function clearRoute(){pausePreview();if(routeGroup){routeGroup.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});scene.remove(routeGroup);}routeGroup=null;traveller=null;previewPath=null;previewProgress=0;}
 function routeMaterial(color){return new THREE.MeshBasicMaterial({color,depthTest:false,depthWrite:false,transparent:true,toneMapped:false});}
 function routeLine(a,b,radius,group,color=0xe66c4b){const length=a.distanceTo(b);if(length<.001)return;const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,8),routeMaterial(color));mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());mesh.renderOrder=10;group.add(mesh);}
 function setRoute(route){clearRoute();if(!route){render();return;}routeGroup=new THREE.Group();scene.add(routeGroup);previewPath=createRoutePreview(route,campus.world);
  for(const segment of route.segments){const g=new THREE.Group();g.userData.routeFloor=segment.floor;routeGroup.add(g);for(let i=1;i<segment.points.length;i++)routeLine(new THREE.Vector3(...campus.world(segment.floor,segment.points[i-1],.18)),new THREE.Vector3(...campus.world(segment.floor,segment.points[i],.18)),.13,g);}
  for(const [i,endpoint] of [route.from,route.to].entries()){const marker=new THREE.Mesh(new THREE.TorusGeometry(.42,.10,8,20),routeMaterial(i?0xe66c4b:0x6d5c90));marker.rotation.x=Math.PI/2;marker.position.set(...campus.world(endpoint.floor,endpoint.point,.28));marker.userData.routeFloor=endpoint.floor;marker.renderOrder=12;routeGroup.add(marker);}
  for(const c of route.connections){const points=[new THREE.Vector3(...campus.world(c.fromFloor,c.from,.18)),new THREE.Vector3(...campus.world(c.toFloor,c.to,.18))],line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineDashedMaterial({color:0xa46782,dashSize:.4,gapSize:.22,depthTest:false,depthWrite:false,transparent:true}));line.userData.connection=true;line.renderOrder=11;line.computeLineDistances();routeGroup.add(line);}
  traveller=new THREE.Mesh(new THREE.SphereGeometry(.34,16,12),routeMaterial(0x564177));traveller.renderOrder=15;routeGroup.add(traveller);setPreview(0);routeVisibility();render();
 }
 function reportPreview(){const sample=sampleRoutePreview(previewPath,previewProgress);onPreview({playing,progress:previewProgress,floor:sample?.floor,toFloor:sample?.toFloor,connection:sample?.connection,done:previewProgress>=1});}
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
 function settle(){viewRevision++;motion.cancel();turnMotion.cancel();transitioning=false;container.setAttribute('aria-busy','false');controls.enabled=true;controls.enableRotate=!topView;for(const [n,f] of floorGroups){f.group.visible=!view||n===view;opacity(f,1);}render();}
 function resize(){if(!container.clientWidth||!container.clientHeight)return;renderer.setSize(container.clientWidth,container.clientHeight,false);const portrait=container.clientWidth/container.clientHeight<.7;if(portrait!==portraitState){portraitState=portrait;setView(view,{animate:false});}else{fit();render();}}
 const observer=new ResizeObserver(resize);observer.observe(container);controls.addEventListener('change',render);
 controls.addEventListener('start',()=>{pausePreview();settle();hover(null);});
 controls.addEventListener('end',()=>{if(view&&camera.zoom<.70)onFloor(0);});
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 function hitAt(e){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(pointer,camera);return ray.intersectObjects([...roomMeshes.values()].filter(m=>m.visible&&m.parent.visible),false)[0]?.object.userData.spaceId||null;}
 renderer.domElement.addEventListener('pointermove',e=>{if(!down&&e.pointerType!=='touch'&&!transitioning)hover(hitAt(e));});
 renderer.domElement.addEventListener('pointerleave',()=>hover(null));
 renderer.domElement.addEventListener('pointerdown',e=>{hover(null);down=[e.clientX,e.clientY];});
 renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5){down=null;return;}down=null;const hit=hitAt(e);if(hit)onSelect(hit);});
 renderer.domElement.addEventListener('pointercancel',()=>{down=null;});
 const visibility=()=>{if(document.hidden){pausePreview();settle();}};document.addEventListener('visibilitychange',visibility);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;pausePreview();motion.cancel();turnMotion.cancel();onFailure();});refresh();resize();
 return {setView,setRoute,playPreview,pausePreview,seekPreview(value){pausePreview();setPreview(value);},setVisible(ids){visible=new Set(ids);if(hovered&&!visible.has(hovered))hover(null);refresh();},setAvailability(data){availability=data;refresh();},select(id,{focus=true}={}){selected=id;refresh();if(id&&focus)setView(campus.entries.get(id)?.floor||0);},
  setProjection(plan){topView=Boolean(plan);setView(view);},rotate(){if(topView)return;pausePreview();settle();const offset=camera.position.clone().sub(controls.target),from=Math.atan2(offset.x,offset.z),radius=Math.hypot(offset.x,offset.z);turnMotion.run(t=>{const angle=from+Math.PI/2*t;camera.position.set(controls.target.x+Math.sin(angle)*radius,camera.position.y,controls.target.z+Math.cos(angle)*radius);controls.update();render();},450);},
  zoom(factor){pausePreview();settle();camera.zoom=THREE.MathUtils.clamp(camera.zoom*factor,.5,5);camera.updateProjectionMatrix();if(view&&camera.zoom<.70)onFloor(0);else render();},reset(){setView(view);},get view(){return view;},
  dispose(){disposed=true;pausePreview();motion.cancel();turnMotion.cancel();document.removeEventListener('visibilitychange',visibility);observer.disconnect();controls.dispose();clearRoute();floorGroups.forEach(f=>f.walls.dispose());resources.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());labelLayer.remove();preview.remove();renderer.dispose();renderer.domElement.remove();}
 };
}
