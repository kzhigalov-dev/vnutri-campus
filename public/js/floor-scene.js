import {createMotion} from './navigation-motion.js';
import * as THREE from 'three';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {toWorld,segmentTransform,validateFloorGeometry} from './geometry.js';

export function createFloorScene({container,onFailure}){
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x172630);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;container.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-48,48,24,-24,.1,300);camera.position.set(18,55,46);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,0);controls.enablePan=true;controls.enableDamping=false;controls.minZoom=.65;controls.maxZoom=6;controls.minPolarAngle=.01;controls.maxPolarAngle=1.35;controls.rotateSpeed=.5;controls.panSpeed=.7;controls.zoomSpeed=.8;controls.mouseButtons.RIGHT=THREE.MOUSE.PAN;
 scene.add(new THREE.HemisphereLight(0xd4e3f5,0x625740,1.8));const sun=new THREE.DirectionalLight(0xffe0b0,2.2);sun.position.set(-18,30,20);sun.castShadow=true;sun.shadow.mapSize.set(2048,1024);Object.assign(sun.shadow.camera,{left:-45,right:45,top:16,bottom:-16,near:1,far:90});sun.shadow.normalBias=.035;scene.add(sun);const rim=new THREE.DirectionalLight(0x96b4d9,1.2);rim.position.set(25,18,-20);scene.add(rim);
 const motion=createMotion();let entranceRevision=0;
 let group,overlay,wallMesh,capMesh,current,texture,revision=0,failed=false,low=true,underlay=false,disposed=false;
 const labelLayer=document.createElement('div');labelLayer.className='floor-label-layer';labelLayer.setAttribute('aria-hidden','true');container.append(labelLayer);let labels=[];
 const labelData=fetch('./data/archive-labels.json').then(r=>r.ok?r.json():null).catch(()=>null);
 const boxGeo=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D();
 const materials={wall:new THREE.MeshStandardMaterial({color:0xb9b5a3,roughness:.9}),cap:new THREE.MeshStandardMaterial({color:0xe5d6b6,roughness:.8}),floor:new THREE.MeshStandardMaterial({color:0xc5c5b0,roughness:.95}),edge:new THREE.MeshStandardMaterial({color:0x3e555f,roughness:.7}),step:new THREE.MeshStandardMaterial({color:0xa8b9b8,roughness:.9}),wood:new THREE.MeshStandardMaterial({color:0xb89b72,roughness:.8}),metal:new THREE.MeshStandardMaterial({color:0x52676b,roughness:.6}),chair:new THREE.MeshStandardMaterial({color:0x8b9d8d,roughness:.9}),paper:new THREE.MeshStandardMaterial({color:0xe9dfc9}),lamp:new THREE.MeshStandardMaterial({color:0xf5dca3,emissive:0xffcc73,emissiveIntensity:1.5}),glass:new THREE.MeshStandardMaterial({color:0xc4d9d5,transparent:true,opacity:.45,roughness:.25}),screen:new THREE.MeshStandardMaterial({color:0x95acb0,emissive:0x476a73,emissiveIntensity:.3})};
 function render(){if(failed||disposed)return;renderer.render(scene,camera);const shown=[];for(const label of labels){const point=label.position.clone().project(camera),x=(point.x+1)*container.clientWidth/2,y=(1-point.y)*container.clientHeight/2;const visible=point.z>-1&&point.z<1&&x>30&&x<container.clientWidth-30&&y>135&&y<container.clientHeight-130&&!shown.some(p=>Math.abs(p.x-x)<76&&Math.abs(p.y-y)<30);label.element.hidden=!visible;if(visible){label.element.style.left=x+'px';label.element.style.top=y+'px';shown.push({x,y});}}}
 function box(parent,x,y,z,w,h,d,material){const mesh=new THREE.Mesh(boxGeo,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 function clear(){if(!group)return;scene.remove(group);const geometries=new Set(),localMaterials=new Set(),shared=new Set(Object.values(materials));group.traverse(o=>{if(o.geometry&&o.geometry!==boxGeo)geometries.add(o.geometry);if(o.isInstancedMesh)o.dispose();if(o.material&&!shared.has(o.material))localMaterials.add(o.material);});geometries.forEach(g=>g.dispose());localMaterials.forEach(m=>m.dispose());texture?.dispose();texture=null;overlay=null;group=null;}
 function floorShape(f,depth){const shapes=[f.footprint,...(f.insets||[])].map(poly=>{const shape=new THREE.Shape();poly.forEach(([px,py],i)=>{const [x,z]=toWorld(f,px,py);if(i)shape.lineTo(x,-z);else shape.moveTo(x,-z);});shape.closePath();return shape;});const geo=new THREE.ExtrudeGeometry(shapes,{depth,bevelEnabled:false});geo.rotateX(-Math.PI/2);return geo;}
 function updateWalls(){if(!current||!wallMesh)return;const h=low?.72:1.65;current.walls.forEach((s,i)=>{const t=segmentTransform(current,s,h);dummy.position.set(t.x,h/2+.05,t.z);dummy.rotation.set(0,-t.angle,0);dummy.scale.set(t.length,h,Math.max(.055,t.thickness));dummy.updateMatrix();wallMesh.setMatrixAt(i,dummy.matrix);dummy.position.y=h+.06;dummy.scale.y=.045;dummy.updateMatrix();capMesh.setMatrixAt(i,dummy.matrix);});wallMesh.instanceMatrix.needsUpdate=true;capMesh.instanceMatrix.needsUpdate=true;wallMesh.computeBoundingSphere();capMesh.computeBoundingSphere();render();}
 function nearWall(f,x,y,distance=16){return f.walls.some(([a,b,c,d])=>{const dx=c-a,dy=d-b,t=Math.max(0,Math.min(1,((x-a)*dx+(y-b)*dy)/(dx*dx+dy*dy)));return Math.hypot(x-a-t*dx,y-b-t*dy)<distance;});}
 function inside(f,x,y){let yes=false;for(let i=0,j=f.footprint.length-1;i<f.footprint.length;j=i++){const a=f.footprint[i],b=f.footprint[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
 function furnish(f){
  // Furniture is an illustrative layer, never a claim about present equipment or access.
  const [left,right]=[Math.min(...f.footprint.map(p=>p[0])),Math.max(...f.footprint.map(p=>p[0]))];const bottom=Math.max(...f.footprint.map(p=>p[1]));let count=0;
  const candidates=[];
  if(f.floor<5){const end=f.footprint[f.footprint.length-2],start=f.footprint[f.footprint.length-1];for(let x=left+310;x<right-70;x+=79){const localBottom=start[1]+(x-start[0])*(end[1]-start[1])/(end[0]-start[0]);candidates.push([x,localBottom-48],[x,localBottom-128]);}}
  for(let i=0;i<f.footprint.length;i++){const a=f.footprint[i],b=f.footprint[(i+1)%f.footprint.length];if(a[1]>200||b[1]>200||b[0]-a[0]<180)continue;for(const y of [65,130,240,310])for(const x of [a[0]+52,b[0]-47])candidates.push([x,Math.min(a[1],b[1])+y]);}
  for(const [px,py] of candidates){if(!inside(f,px,py)||!inside(f,px,py+22)||nearWall(f,px,py)||nearWall(f,px,py+21,10)||f.stairs.some(([x,y,w,h])=>px>x-20&&px<x+w+20&&py>y-20&&py<y+h+30))continue;
   const [x,z]=toWorld(f,px,py),scale=80/f.imageWidth;const w=23*scale,d=15*scale;
   box(group,x,.3,z,w,.055,d,materials.wood);for(const dx of [-w*.4,w*.4])box(group,x+dx,.15,z,.025,.3,d*.75,materials.metal);
   const chairZ=z+22*scale;box(group,x,.18,chairZ,w*.5,.06,d*.55,materials.chair);box(group,x,.31,chairZ+d*.25,w*.5,.23,.035,materials.chair);box(group,x,.08,chairZ,.025,.16,.025,materials.metal);
   if((count+f.floor)%3===0&&f.floor<5){box(group,x,.49,z-d*.2,w*.6,.3,.035,materials.metal);box(group,x,.49,z-d*.17,w*.52,.23,.012,materials.screen);}else box(group,x-w*.15,.34,z,w*.35,.015,d*.45,materials.paper);
   if(count%4===0){box(group,x+w*.35,.43,z-d*.2,.025,.2,.025,materials.metal);box(group,x+w*.35,.55,z-d*.2,.12,.045,.1,materials.lamp);}
   count++;
  }
  return count;
 }
 function stairs(f){for(const [px,py,pw,ph] of f.stairs){const [x,z]=toWorld(f,px,py),w=pw*80/f.imageWidth,d=ph*80/f.imageWidth;box(group,x+w/2,.025,z+d/2,w,.05,d,materials.metal);for(let n=0;n<9;n++)box(group,x+w*.25,.055+n*.045,z+d*(n+.5)/9,w*.44,.07+n*.09,d/9,materials.step);for(let n=0;n<9;n++)box(group,x+w*.75,.055+(8-n)*.045,z+d*(n+.5)/9,w*.44,.07+(8-n)*.09,d/9,materials.step);}}
 function details(f){
  // Source-aligned perimeter plinth and glass rail: no invented door connections.
  for(let i=0;i<f.footprint.length;i++){const a=f.footprint[i],b=f.footprint[(i+1)%f.footprint.length],t=segmentTransform(f,[...a,...b,7],.12);const plinth=box(group,t.x,.03,t.z,t.length,.12,t.thickness,materials.cap);plinth.rotation.y=-t.angle;}
  // Sparse point lights in the three actual wings; no per-frame animation.
  for(const x of [-25,-5,15]){const light=new THREE.PointLight(0xffd59b,14,15,2);light.position.set(x,3,-3);group.add(light);}
  if(f.floor===5){const bottom=Math.max(...f.footprint.map(p=>p[1]));for(let px=700;px<2800;px+=220){const [x,z]=toWorld(f,px,bottom-100);box(group,x,.18,z,.1,.15,3.1,materials.wood);}}
 }
 async function show(f,url){
  stopMotion();if(!validateFloorGeometry(f))throw Error('Invalid floor geometry');if(failed||disposed)throw Error('3D unavailable');const request=++revision;
  const [loaded,annotations]=await Promise.all([new THREE.TextureLoader().loadAsync(url),labelData]);if(request!==revision||disposed||failed){loaded.dispose();return false;}
  clear();current=f;texture=loaded;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
  group=new THREE.Group();scene.add(group);const floor=new THREE.Mesh(floorShape(f,.22),materials.floor);floor.position.y=-.22;floor.receiveShadow=true;group.add(floor);
  // An exact pixel-aligned source overlay allows direct comparison with the tracing.
  overlay=new THREE.Mesh(new THREE.PlaneGeometry(80,80*f.imageHeight/f.imageWidth),new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.72,depthWrite:false}));overlay.rotation.x=-Math.PI/2;overlay.position.y=.015;overlay.visible=underlay;group.add(overlay);
  wallMesh=new THREE.InstancedMesh(boxGeo,materials.wall,f.walls.length);wallMesh.castShadow=true;wallMesh.receiveShadow=true;group.add(wallMesh);capMesh=new THREE.InstancedMesh(boxGeo,materials.cap,f.walls.length);group.add(capMesh);updateWalls();stairs(f);const furnitureCount=furnish(f);details(f);
  const outlineGeo=floorShape(f,.01),outline=new THREE.LineSegments(new THREE.EdgesGeometry(outlineGeo),new THREE.LineBasicMaterial({color:0x728c93}));outlineGeo.dispose();outline.position.y=-.225;group.add(outline);
  box(group,0,-.45,0,76,.25,80*f.imageHeight/f.imageWidth+.6,materials.edge);
  labelLayer.replaceChildren();labels=(annotations?.floors.find(item=>item.floor===f.floor)?.labels||[]).map(item=>{const element=document.createElement('span');element.className='floor-source-label';element.textContent=item.text;labelLayer.append(element);const [x,z]=toWorld(f,item.x,item.y);return {element,position:new THREE.Vector3(x,1.9,z)};});
  resize();reset();requestAnimationFrame(render);container.dataset.floor=String(f.floor);container.dataset.wallCount=String(f.walls.length);container.dataset.furnitureCount=String(furnitureCount);return true;
 }
 function stopMotion(){entranceRevision++;motion.cancel();controls.enabled=true;}
 function reset(){stopMotion();camera.position.set(18,55,46);camera.zoom=1;controls.target.set(0,0,0);camera.updateProjectionMatrix();controls.update();render();}
 function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;const aspect=w/h,half=Math.max(18,44/aspect);camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(w,h,false);render();}
 const observer=new ResizeObserver(resize);observer.observe(container);controls.addEventListener('change',render);renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(failed)return;failed=true;revision++;onFailure();});resize();
 async function enter(){stopMotion();const request=++entranceRevision;controls.enabled=false;const start=new THREE.Vector3(18,44,55),end=new THREE.Vector3(18,55,46);const completed=await motion.run(t=>{camera.position.lerpVectors(start,end,t);camera.zoom=1.28-.28*t;camera.updateProjectionMatrix();controls.update();render();},600);if(request===entranceRevision)controls.enabled=true;return completed;}
 return {show,enter,cancelEntrance:stopMotion,reset,zoom(factor){stopMotion();camera.zoom=THREE.MathUtils.clamp(camera.zoom*factor,.65,6);camera.updateProjectionMatrix();render();},top(){stopMotion();camera.position.set(0,70,.01);controls.target.set(0,0,0);camera.zoom=1;camera.updateProjectionMatrix();controls.update();render();},pan(x,z){stopMotion();const delta=new THREE.Vector3(x,0,z);camera.position.add(delta);controls.target.add(delta);controls.update();render();},setLow(value){low=value;updateWalls();},setOverlay(value){underlay=value;if(overlay)overlay.visible=value;render();},dispose(){if(disposed)return;disposed=true;revision++;stopMotion();observer.disconnect();controls.dispose();clear();boxGeo.dispose();Object.values(materials).forEach(m=>m.dispose());renderer.dispose();}};
}
