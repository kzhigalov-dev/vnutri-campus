import * as THREE from 'three';
import {OrbitControls} from '../vendor/OrbitControls.js';
// Massing follows the archived long spine / three-wing footprint. Facade is illustrative.
export function createBuilding({container,onSelect,onHover,onFailure}){
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x15222d);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;container.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-40,40,26,-26,.1,250);camera.position.set(39,32,50);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,4,0);controls.enablePan=false;controls.enableDamping=false;controls.minPolarAngle=.35;controls.maxPolarAngle=1.35;controls.minZoom=.65;controls.maxZoom=2.3;controls.rotateSpeed=.45;controls.zoomSpeed=.65;
 scene.add(new THREE.HemisphereLight(0xc3d5ed,0x444435,2));const sun=new THREE.DirectionalLight(0xe4d9bf,3);sun.position.set(-20,30,30);scene.add(sun);const rim=new THREE.DirectionalLight(0x8c91b8,2);rim.position.set(20,14,-25);scene.add(rim);
 const root=new THREE.Group();scene.add(root);const boxGeo=new THREE.BoxGeometry(1,1,1),geometries=[boxGeo],materials=[];
 function material(color,props={}){const m=new THREE.MeshStandardMaterial({color,roughness:.8,...props});materials.push(m);return m;}
 const stone=material(0xaaa693),trim=material(0xd6cbb0),base=material(0x565e5b),roof=material(0x485560,{metalness:.2}),glass=material(0xffd59a,{emissive:0xffbd60,emissiveIntensity:.7}),glassDim=material(0x77878b,{emissive:0x4e626b,emissiveIntensity:.2});
 function box(parent,x,y,z,w,h,d,m){const o=new THREE.Mesh(boxGeo,m);o.position.set(x,y,z);o.scale.set(w,h,d);parent.add(o);return o;}
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
 // Fine site grid, subdued enough for the building to remain the central object.
 const grid=new THREE.GridHelper(100,50,0x38505d,0x263c49);grid.position.y=-.5;scene.add(grid);
 let disposed=false,hovered=null,selected=null,pointerDown=null;const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 function render(){if(!disposed)renderer.render(scene,camera);}
 function highlight(n){hovered=n;for(const [f,body] of floorBodies){body.material.color.set(f===n?0xe6c188:f===selected?0xc8b8db:0xaaa693);body.material.emissive.set(f===n?0x5f3e18:f===selected?0x272032:0x000000);body.material.emissiveIntensity=.35;}render();}
 function pick(e){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(pointer,camera);for(const h of ray.intersectObject(root,true)){let o=h.object;while(o){if(o.userData.floor)return o.userData.floor;o=o.parent;}}return null;}
 renderer.domElement.addEventListener('pointermove',e=>{if(e.buttons)return;const n=pick(e);if(n!==hovered){highlight(n);onHover(n);}renderer.domElement.style.cursor=n?'pointer':'grab';});
 renderer.domElement.addEventListener('pointerleave',()=>{highlight(null);onHover(null);});
 renderer.domElement.addEventListener('pointerdown',e=>pointerDown={x:e.clientX,y:e.clientY});
 renderer.domElement.addEventListener('pointerup',e=>{if(!pointerDown)return;const moved=Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y);pointerDown=null;if(moved<6){const n=pick(e);if(n)onSelect(n);}});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();disposed=true;onFailure();});
 function resize(){const w=container.clientWidth,h=container.clientHeight,aspect=w/h,half=Math.max(20,43/aspect);if(!w||!h)return;camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(w,h,false);controls.update();render();}
 const observer=new ResizeObserver(resize);observer.observe(container);controls.addEventListener('change',render);resize();
 return {highlight,select(n){selected=n;highlight(null);},reset(){camera.position.set(39,32,50);controls.target.set(0,4,0);camera.zoom=1;camera.updateProjectionMatrix();controls.update();render();},zoom(factor){camera.zoom=THREE.MathUtils.clamp(camera.zoom*factor,.65,2.3);camera.updateProjectionMatrix();render();},dispose(){disposed=true;observer.disconnect();controls.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();}};
}
