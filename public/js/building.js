import * as THREE from 'three';
import {createMotion,zoomEntryFloor} from './navigation-motion.js';
import {OrbitControls} from '../vendor/OrbitControls.js';
// Massing follows the archived long spine / three-wing footprint. Facade is illustrative.
export function createBuilding({container,onSelect,onHover,onFailure}){
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x15222d);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;container.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-40,40,26,-26,.1,250);camera.position.set(39,32,50);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,4,0);controls.enablePan=false;controls.enableDamping=false;controls.minPolarAngle=.35;controls.maxPolarAngle=1.35;controls.minZoom=.65;controls.maxZoom=2.3;controls.rotateSpeed=.45;controls.zoomSpeed=.65;
 scene.add(new THREE.HemisphereLight(0xc3d5ed,0x444435,2));const sun=new THREE.DirectionalLight(0xe4d9bf,3);sun.position.set(-20,38,30);sun.castShadow=true;sun.shadow.mapSize.set(2048,1024);Object.assign(sun.shadow.camera,{left:-45,right:45,top:28,bottom:-28,near:1,far:100});sun.shadow.normalBias=.04;scene.add(sun);const rim=new THREE.DirectionalLight(0x8c91b8,2);rim.position.set(20,14,-25);scene.add(rim);
 const root=new THREE.Group();scene.add(root);const boxGeo=new THREE.BoxGeometry(1,1,1),geometries=[boxGeo],materials=[];
 function material(color,props={}){const m=new THREE.MeshStandardMaterial({color,roughness:.8,...props});materials.push(m);return m;}
 const stone=material(0xb4b1a3),trim=material(0xd6cbb0),base=material(0x565e5b),roof=material(0x3b505c,{metalness:.5,roughness:.4}),glass=material(0xffd59a,{emissive:0xffbd60,emissiveIntensity:.7}),glassDim=material(0x77878b,{emissive:0x4e626b,emissiveIntensity:.2});
 function box(parent,x,y,z,w,h,d,m){const o=new THREE.Mesh(boxGeo,m);o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 const polygon=[[-32,5],[-28,2],[-22,2],[-22,-10],[-17,-10],[-17,2],[-3,2],[-3,-10],[3,-10],[3,2],[17,2],[17,-10],[22,-10],[22,2],[30,2],[30,8],[-28,8]];
 const shape=new THREE.Shape();polygon.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
 const bodyGeo=new THREE.ExtrudeGeometry(shape,{depth:2.15,bevelEnabled:false});bodyGeo.rotateX(-Math.PI/2);geometries.push(bodyGeo);
 const floorGroups=new Map(),floorBodies=new Map(),level=2.25;
 // All five levels use source footprint as massing only; no invented interior boundaries.
 for(let f=1;f<=5;f++){
  const g=new THREE.Group();g.position.y=(f-1)*level;g.userData.floor=f;root.add(g);floorGroups.set(f,g);
  const m=stone.clone();materials.push(m);const body=new THREE.Mesh(bodyGeo,m);g.add(body);floorBodies.set(f,body);
  box(g,1,2.15,5,58,.1,6.15,trim);
  for(const x of [-19.5,0,19.5])box(g,x,2.15,-4,5.15,.1,12.1,trim);
  for(let x=-26.8;x<29;x+=1.45){
   box(g,x,1.15,8.035,.68,1.12,.07,Math.floor((x+30)*3+f)%5===0?glassDim:glass);
   box(g,x,.52,8.08,.82,.08,.15,trim);
   if(f===1&&Math.abs(x)<2)continue;
   // Windows facing the inner courtyards, including the three wing ends.
   box(g,x,1.15,1.96,.68,1.12,.07,Math.floor(x+30+f)%3===0?glassDim:glass);
  }
  for(const x of [-19.5,0,19.5]){
   for(const dx of [-2.54,2.54])for(let z=-8.9;z<1;z+=1.55){box(g,x+dx,1.15,z,.07,1.12,.68,(f+Math.round(z))%4===0?glassDim:glass);box(g,x+dx, .52,z,.14,.07,.8,trim);}
   for(const dx of [-1.45,0,1.45])box(g,x+dx,1.15,-10.04,.65,1.12,.07,glass);
  }
 }
 box(root,0,-.2,2,68,.35,28,material(0x243742));box(root,0,-.42,2,69,.12,29,material(0x0f1c26));
 box(root,1,.2,8.12,58,.4,.22,base);for(const x of [-19.5,0,19.5])box(root,x,.2,-10.12,5,.4,.2,base);
 // Main entrance is an exterior illustration, not a verified navigation marker.
 box(root,0,1,8.12,1.65,1.9,.12,material(0x33464b));box(root,0,2.05,8.65,2.7,.15,1.5,trim);for(const x of [-1.1,1.1])box(root,x,1,9.15,.12,2,.12,trim);
 const roofGroup=new THREE.Group();root.add(roofGroup);roofGroup.userData.floor=5;
 function pitchedRoof(length,width,x,z){const s=new THREE.Shape();s.moveTo(-width/2,0);s.lineTo(0,1.35);s.lineTo(width/2,0);s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth:length,bevelEnabled:false});geo.rotateY(Math.PI/2);geometries.push(geo);const m=new THREE.Mesh(geo,roof);m.position.set(x-length/2,11.3,z);roofGroup.add(m);}
 pitchedRoof(58,6.6,1,5);for(const x of [-19.5,0,19.5]){const s=new THREE.Shape();s.moveTo(-2.75,0);s.lineTo(0,1.2);s.lineTo(2.75,0);s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth:12,bevelEnabled:false});geometries.push(geo);const m=new THREE.Mesh(geo,roof);m.position.set(x,11.3,-10);roofGroup.add(m);}
 for(let x=-24;x<28;x+=10){box(root,x,12,5,.5,1.9,.6,base);box(root,x,13,5,.8,.12,.8,trim);}
 // An illustrated evening courtyard gives the building an entrance and a recognizable setting.
 const paving=material(0x829291),garden=material(0x405f55),leaf=material(0x5b7f6b),bark=material(0x64594b),wood=material(0xa48660),dark=material(0x263d46);
 box(root,0,-.005,12,66,.05,6,paving);for(let x=-32;x<33;x+=2)box(root,x,.026,12,.025,.01,6,trim);for(const z of [9,11,13,15])box(root,0,.026,z,66,.01,.025,trim);
 for(const x of [-10,10]){box(root,x,-.01,-3,9,.05,12,paving);box(root,x,.12,-5,5.5,.25,6,garden);for(const dx of [-1.8,1.8]){box(root,x+dx,1.2,-5,.16,2.4,.16,bark);const geo=new THREE.SphereGeometry(1.15,12,8);geometries.push(geo);const tree=new THREE.Mesh(geo,leaf);tree.position.set(x+dx,2.6,-5);tree.scale.set(.9,1.2,.9);tree.castShadow=true;root.add(tree);}for(const z of [-.8,-8.7]){box(root,x,.52,z,2.8,.16,.62,wood);for(const dx of [-1,1])box(root,x+dx,.25,z,.1,.5,.5,dark);}}
 for(let x=-27;x<30;x+=8){box(root,x,.7,12,.12,1.4,.12,dark);box(root,x,1.45,12,.24,.16,.24,glass);const light=new THREE.PointLight(0xffd29b,8,6,2);light.position.set(x,1.6,12);root.add(light);}
 for(let x=-25;x<30;x+=5.8)box(root,x,5.6,8.09,.13,10.8,.13,trim);
 box(root,0,.07,10,3.8,.12,2.2,trim);box(root,0,.17,9.5,3.3,.12,1.1,trim);box(root,0,.28,9.1,2.7,.1,.5,trim);
 const signCanvas=document.createElement('canvas');signCanvas.width=1024;signCanvas.height=256;const signContext=signCanvas.getContext('2d');signContext.fillStyle='#203844';signContext.fillRect(0,0,1024,256);signContext.fillStyle='#e9ddba';signContext.font='bold 90px Manrope, sans-serif';signContext.fillText('внутри. / 44–46',54,122);signContext.font='32px Manrope, sans-serif';signContext.fillText('Промтехдизайн · учебный кампус',58,194);const signTexture=new THREE.CanvasTexture(signCanvas);signTexture.colorSpace=THREE.SRGBColorSpace;const signMaterial=new THREE.MeshBasicMaterial({map:signTexture});materials.push(signMaterial);const signGeometry=new THREE.PlaneGeometry(4,.98);geometries.push(signGeometry);const signMesh=new THREE.Mesh(signGeometry,signMaterial);signMesh.position.set(0,3.2,8.15);root.add(signMesh);
 const entranceLight=new THREE.PointLight(0xffd6a0,24,8,2);entranceLight.position.set(0,2.7,10);root.add(entranceLight);
 // Fine site grid, subdued enough for the building to remain the central object.
 const grid=new THREE.GridHelper(100,50,0x38505d,0x263c49);grid.position.y=-.5;scene.add(grid);
 const motion=createMotion();let disposed=false,hovered=null,selected=null,entryFloor=null,entering=false,lastZoom=1,pointerDown=null;const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 function render(){if(!disposed)renderer.render(scene,camera);}
 function highlight(n){if(entering)return;if(n)entryFloor=n;hovered=n;const active=n??entryFloor;for(const [f,body] of floorBodies){body.material.color.set(f===active?0xe6c188:f===selected?0xc8b8db:0xaaa693);body.material.emissive.set(f===active?0x5f3e18:f===selected?0x272032:0x000000);body.material.emissiveIntensity=.35;}render();}
 function pick(e){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(pointer,camera);for(const h of ray.intersectObject(root,true)){let o=h.object;while(o){if(o.userData.floor)return o.userData.floor;o=o.parent;}}return null;}
 renderer.domElement.addEventListener('pointermove',e=>{if(e.buttons||entering)return;const n=pick(e);if(n!==hovered){highlight(n);onHover(n);}renderer.domElement.style.cursor=n?'pointer':'grab';});
 renderer.domElement.addEventListener('pointerleave',()=>{highlight(null);onHover(null);});
 renderer.domElement.addEventListener('pointerdown',e=>pointerDown={x:e.clientX,y:e.clientY});
 renderer.domElement.addEventListener('pointerup',e=>{if(!pointerDown||entering)return;const moved=Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y);pointerDown=null;if(moved<6){const n=pick(e);if(n)onSelect(n);}});
 renderer.domElement.addEventListener('wheel',e=>{if(entering)return;const n=pick(e);if(n){highlight(n);onHover(n);}if(e.deltaY<0&&camera.zoom>=1.85&&entryFloor)onSelect(entryFloor);},{passive:true,capture:true});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();disposed=true;motion.cancel();onFailure();});
 function resize(){const w=container.clientWidth,h=container.clientHeight,aspect=w/h,half=Math.max(20,43/aspect);if(!w||!h)return;camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(w,h,false);controls.update();render();}
 const observer=new ResizeObserver(resize);observer.observe(container);controls.addEventListener('change',()=>{render();const floor=entering?null:zoomEntryFloor(lastZoom,camera.zoom,entryFloor);lastZoom=camera.zoom;if(floor)onSelect(floor);});resize();
 function reset(){motion.cancel();entering=false;controls.enabled=true;controls.maxZoom=2.3;camera.position.set(39,32,50);controls.target.set(0,4,0);camera.zoom=lastZoom=1;camera.updateProjectionMatrix();controls.update();render();}
 async function flyTo(number){motion.cancel();entering=false;entryFloor=number;highlight(number);entering=true;controls.enabled=false;controls.maxZoom=4.5;const start=camera.position.clone(),targetStart=controls.target.clone(),focus=new THREE.Vector3(0,(number-1)*level+1.1,5),direction=start.clone().sub(targetStart),end=focus.clone().add(direction.multiplyScalar(.72)),initialZoom=camera.zoom;return motion.run(t=>{camera.position.lerpVectors(start,end,t);controls.target.lerpVectors(targetStart,focus,t);camera.zoom=initialZoom+(3.8-initialZoom)*t;camera.updateProjectionMatrix();controls.update();render();},900);}
 async function pullBack(number){motion.cancel();entering=false;entryFloor=number;highlight(number);entering=true;controls.enabled=false;controls.maxZoom=4.5;const focus=new THREE.Vector3(0,(number-1)*level+1.1,5),start=focus.clone().add(new THREE.Vector3(39,28,50).multiplyScalar(.72)),end=new THREE.Vector3(39,32,50),target=new THREE.Vector3(0,4,0);camera.position.copy(start);controls.target.copy(focus);camera.zoom=3.8;camera.updateProjectionMatrix();controls.update();render();const complete=await motion.run(t=>{camera.position.lerpVectors(start,end,t);controls.target.lerpVectors(focus,target,t);camera.zoom=3.8-2.8*t;lastZoom=camera.zoom;camera.updateProjectionMatrix();controls.update();render();},1200);if(complete){entering=false;controls.enabled=true;controls.maxZoom=2.3;}return complete;}
 return {highlight,flyTo,pullBack,select(n){selected=n;if(n===null)entryFloor=null;highlight(n);},reset,zoom(factor){if(entering)return;const previous=camera.zoom,requested=previous*factor;camera.zoom=THREE.MathUtils.clamp(requested,.65,2.3);lastZoom=camera.zoom;camera.updateProjectionMatrix();render();const floor=zoomEntryFloor(previous,requested,entryFloor);if(floor)onSelect(floor);},dispose(){disposed=true;motion.cancel();observer.disconnect();controls.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());signTexture.dispose();renderer.dispose();}};
}
