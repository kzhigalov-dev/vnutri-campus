import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { rooms } from './data.js';

export function createCampusScene({container,labels,onSelect,onSeat,onFailure}){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x17232d);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 renderer.domElement.setAttribute('aria-hidden','true');container.prepend(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x17232d);
 const camera=new THREE.OrthographicCamera(-24,24,18,-18,.1,180);camera.position.set(27,32,38);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,0);controls.enablePan=false;controls.enableDamping=false;controls.minPolarAngle=.25;controls.maxPolarAngle=1.13;controls.minZoom=.7;controls.maxZoom=2.8;controls.enableZoom=true;controls.zoomSpeed=.8;controls.rotateSpeed=.45;
 // One-finger vertical gestures remain available for scrolling on phones.
 controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_ROTATE;
 const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 const materials=new Map(),unitBox=new THREE.BoxGeometry(1,1,1),unitCylinder=new THREE.CylinderGeometry(1,1,1,16),sphere=new THREE.SphereGeometry(1,12,8);
 const mat=(color,roughness=.8,emissive)=>{const key=String(color)+roughness+String(emissive);if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness:.05,...(emissive?{emissive,emissiveIntensity:1.7}:{})}));return materials.get(key);};
 const box=(parent,x,y,z,w,h,d,color,extra={})=>{const o=new THREE.Mesh(unitBox,typeof color==='object'?color:mat(color));o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=true;o.receiveShadow=true;Object.assign(o.userData,extra);parent.add(o);return o;};
 const cylinder=(parent,x,y,z,r,h,color)=>{const o=new THREE.Mesh(unitCylinder,mat(color));o.position.set(x,y,z);o.scale.set(r,h,r);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
 const ball=(parent,x,y,z,r,color)=>{const o=new THREE.Mesh(sphere,mat(color));o.position.set(x,y,z);o.scale.setScalar(r);o.castShadow=true;parent.add(o);return o;};
 const line=(parent,a,b,color,r=.025)=>{const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av),o=new THREE.Mesh(unitCylinder,mat(color));o.position.copy(av.add(bv).multiplyScalar(.5));o.scale.set(r,delta.length(),r);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());parent.add(o);return o;};
 scene.add(new THREE.HemisphereLight(0xc6d9f1,0x71604b,1.0));scene.add(new THREE.AmbientLight(0xc2c9c4,.4));
 const sun=new THREE.DirectionalLight(0xc4d5ef,1.6);sun.position.set(-15,32,18);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-30,right:30,top:25,bottom:-25,near:1,far:80});sun.shadow.normalBias=.045;sun.shadow.bias=-.0002;scene.add(sun);
 const rim=new THREE.DirectionalLight(0xffd19d,1.0);rim.position.set(15,16,-13);scene.add(rim);
 const root=new THREE.Group();scene.add(root);
 // Procedural architectural textures; all geometry is illustrative, not a surveyed floor plan.
 function floorTexture(){const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#8a877a';c.fillRect(0,0,256,256);for(let i=0;i<256;i+=32){c.strokeStyle='#6e756e';c.lineWidth=1;c.beginPath();c.moveTo(i,0);c.lineTo(i,256);c.moveTo(0,i);c.lineTo(256,i);c.stroke();}for(let i=0;i<600;i++){c.fillStyle=i%2?'#8d8d80':'#939083';c.fillRect((i*73)%256,(i*137)%256,1,1);}const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(8,5);t.colorSpace=THREE.SRGBColorSpace;return t;}
 const baseMat=new THREE.MeshStandardMaterial({map:floorTexture(),roughness:.95,color:0x9faaa2});
 box(root,0,-.5,0,31.6,.9,21.7,0x33434b);box(root,0,.0,0,31.2,.12,21.3,baseMat);
 box(root,0,-.98,0,30.5,.12,20.7,0x0d161e);
 // A luminous circulation spine ties the eight areas together.
 box(root,0,.075,0,29.7,.055,2.6,0x717d77);
 for(const z of [-1.25,1.25])box(root,0,.12,z,29.5,.025,.045,mat(0xd5b67f,.6,0x91672b));
 for(let x=-13;x<14;x+=1.3)box(root,x,.12,0,.35,.022,.045,0xa5b3a5);
 // Back facade with large windows; low side walls keep the model readable.
 box(root,0,1.5,-10.3,30.9,3,.25,0x6d746d);
 box(root,0,.42,10.3,30.9,.85,.22,0x838476);
 for(const x of [-15.25,15.25])box(root,x,.65,0,.25,1.3,20.6,0x7b8277);
 for(let x=-13.5;x<15;x+=3){
  box(root,x,2,-10.12,2.5,1.5,.08,mat(0xc3c6b3,.4,0x554b2e));
  for(const dx of [-1.26,0,1.26])box(root,x+dx,2,-10.02,.055,1.56,.12,0x444e4f);
  box(root,x,2,-10.01,2.55,.055,.12,0x444e4f);
 }
 const roomGroups=new Map(),roomFloors=new Map(),outlines=new Map(),lights=new Map(),markers=new Map(),seatObjects=new Map();
 const planeGeo=new THREE.PlaneGeometry(1,1);
 function glowTexture(){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,204,133,.7)');g.addColorStop(1,'rgba(255,204,133,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
 const glowMat=new THREE.MeshBasicMaterial({map:glowTexture(),transparent:true,opacity:.25,depthWrite:false});
 function plant(g,x,z,scale=1){cylinder(g,x,.3*scale,z,.22*scale,.55*scale,0x9b8165);line(g,[x,.5*scale,z],[x,1.45*scale,z],0x60674b,.035*scale);for(let i=0;i<5;i++){const a=i*2.4;const leaf=ball(g,x+Math.cos(a)*.25*scale,(.9+i*.1)*scale,z+Math.sin(a)*.22*scale,.22*scale,i%2?0x718a65:0x92a27c);leaf.scale.y*=1.5;}}
 function shelf(g,x,z,width=2.1){for(const dx of [-width/2,width/2])box(g,x+dx,1.1,z,.08,2.2,.55,0x525e5c);for(let y=.3;y<2.3;y+=.55){box(g,x,y,z,width,.08,.65,0xa58d69);for(let i=0;i<5;i++){const h=.22+(i%3)*.09;box(g,x-width*.38+i*width*.17,y+.08+h/2,z,.16,h,.33,[0xbbbba1,0xa298b0,0xc09a75,0x8b9f91,0x736d68][i]);}}}
 function chair(g,x,z,color,tag){box(g,x,.68,z,.63,.15,.63,color,tag);box(g,x,1.0,z+.29,.63,.55,.09,color,tag);for(const dx of [-.23,.23])for(const dz of [-.23,.23])box(g,x+dx,.34,z+dz,.045,.65,.045,0x485151);}
 function desk(g,x,z,n,style,color){const tag={seat:n};const top=box(g,x,1.02,z,1.25,.12,.83,0xc2ab84,tag);seatObjects.set(g.userData.room+'-'+n,top);for(const dx of [-.5,.5])for(const dz of [-.3,.3])box(g,x+dx,.51,z+dz,.055,1.0,.055,0x515c5c);chair(g,x,z+.75,color,tag);
  if(style==='computers'||style==='design'){
   box(g,x,1.49,z-.17,.87,.58,.065,0x2f3e46,tag);box(g,x,1.49,z-.126,.77,.47,.01,mat(style==='design'?0xb4a3ca:0x8ba5b4,.35,style==='design'?0x4e3b6d:0x2e4f60),tag);box(g,x,1.16,z-.17,.045,.22,.06,0x485557);box(g,x,1.1,z-.12,.35,.03,.18,0x485557);box(g,x,1.1,z+.21,.6,.025,.2,0x464d4f,tag);box(g,x+.43,1.1,z+.21,.12,.035,.17,0x727b76);
   // A miniature window/composition on each screen.
   box(g,x-.21,1.55,z-.114,.25,.22,.006,style==='design'?0xe1c791:0xc7d8d7);box(g,x+.18,1.58,z-.114,.23,.02,.006,0xe3ded0);box(g,x+.18,1.49,z-.114,.23,.02,.006,0xb7c4c2);
  }else{
   box(g,x-.2,1.1,z,.42,.025,.32,0xe6e1cf,tag);box(g,x+.03,1.12,z,.08,.02,.35,0x9b8ca9,tag);
   cylinder(g,x+.43,1.13,z-.21,.12,.05,0x4a5759);line(g,[x+.43,1.15,z-.21],[x+.43,1.67,z-.21],0x49565a,.025);const shade=new THREE.Mesh(new THREE.ConeGeometry(.18,.22,12,1,true),mat(0xd2bf95));shade.position.set(x+.43,1.68,z-.21);g.add(shade);cylinder(g,x+.43,1.58,z-.21,.13,.015,0xf8dfa8);
  }
  cylinder(g,x-.48,1.19,z-.23,.06,.18,0xc4bcb0);
 }
 for(const r of rooms){
  const g=new THREE.Group();g.position.set(r.position[0],.1,r.position[1]);g.userData.room=r.id;root.add(g);roomGroups.set(r.id,g);
  const fm=mat(r.color).clone();fm.roughness=.95;const floor=box(g,0,.01,0,6.65,.08,7.15,fm);roomFloors.set(r.id,floor);
  // Partitions, masonry pilasters and a warm wall rail.
  for(const x of [-3.35,3.35]){box(g,x,.66,0,.16,1.3,7.2,0x8b8979);box(g,x,1.32,0,.22,.08,7.2,0xada58c);}
  const outer=r.position[1]<0?-3.52:3.52;
  box(g,0,.63,outer,6.7,1.25,.18,0x9d9b87);box(g,0,1.29,outer,6.7,.08,.23,0xb0ac94);
  for(const x of [-3.28,3.28]){box(g,x,1.65,outer,.3,3.3,.35,0x777e74);box(g,x,3.32,outer,.42,.12,.46,0x9fa38d);}
  // Room selection outline, independent of floor color.
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(6.7,.13,7.2)),new THREE.LineBasicMaterial({color:0xedb877}));edges.position.y=.09;edges.visible=false;g.add(edges);outlines.set(r.id,edges);
  let n=1;for(const z of [-1.85,1.0])for(const x of [-2.15,-.72,.72,2.15])desk(g,x,z,n++,r.style,r.category==='computer'?0x717d83:r.category==='team'?0x9d8a73:0x869878);
  if(r.style==='reading'){shelf(g,-2.65,-.15,1.0);shelf(g,2.65,-.15,1.0);}
  if(r.style==='team'||r.style==='lecture'){box(g,0,1.7,-3.33,3.3,1.4,.08,0xeee9d8);for(let i=0;i<5;i++)box(g,-1+i*.42,1.8-i%2*.2,-3.27,.25,.02,.015,0x7e8d91);box(g,0,.98,-2.9,1.4,.12,.5,0x807a68);}
  if(r.style==='design'){box(g,-2.6,1.8,-3.25,.8,1.1,.06,0xc3b991);box(g,2.4,1.8,-3.25,.7,1.0,.06,0x9c94b1);}
  plant(g,r.position[0]>0?2.8:-2.8,2.8,.85);
  // Suspended fixtures with visible emissive diffusers.
  for(const dx of [-1.6,1.6]){line(g,[dx,3.6,-.3],[dx,3.1,-.3],0x48585b,.02);cylinder(g,dx,3.08,-.3,.25,.18,0x56605b);cylinder(g,dx,2.97,-.3,.21,.025,0xffe2a1);}
  const light=new THREE.PointLight(0xffd69b,55,12,2);light.position.set(0,3.2,-.1);g.add(light);lights.set(r.id,light);
  const glow=new THREE.Mesh(planeGeo,glowMat);glow.rotation.x=-Math.PI/2;glow.position.set(0,.065,0);glow.scale.set(7,7,1);g.add(glow);
  const marker=document.createElement('button');marker.className='room-marker';marker.dataset.mapRoom=r.id;marker.title=r.name;marker.setAttribute('aria-label',`${r.proposed?'Зона':'Аудитория'} ${r.number}: ${r.name}`);marker.innerHTML=`<b>${r.number}</b><span>6 мест</span>`;marker.addEventListener('click',e=>{e.stopPropagation();onSelect(r.id);});labels.append(marker);markers.set(r.id,marker);
 }
 // Circulation details: bench, display board, planters and overhead structure.
 for(const x of [-12,0,12]){box(root,x,.57,0,1.8,.16,.55,0xa99270);for(const dx of [-.65,.65])box(root,x+dx,.32,0,.07,.5,.4,0x4d5e60);}
 plant(root,-14.5,0,1.2);plant(root,14.5,0,1.2);
 for(const x of [-14,0,14]){for(const z of [-9.9,9.9])box(root,x,1.9,z,.22,3.8,.25,0x667c80);line(root,[x,3.8,-9.9],[x,4.7,0],0x7c8b87,.045);line(root,[x,4.7,0],[x,3.8,9.9],0x7c8b87,.045);}
 // Quiet facade nameplate acts as a campus landmark.
 function labelTexture(text){const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#263943';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#e5dac4';ctx.font='500 45px sans-serif';ctx.textAlign='center';ctx.fillText(text,512,83);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;}
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(9.5,1.15),new THREE.MeshBasicMaterial({map:labelTexture('ПРОМТЕХДИЗАЙН / 04')}));sign.position.set(0,-.35,10.91);root.add(sign);
 // Ghost slabs are only a spatial overview, never claimed to be other floor plans.
 const stack=new THREE.Group();root.add(stack);stack.visible=false;
 for(let i=1;i<=3;i++){const slab=box(stack,0,-i*1.5-.5,0,31.4,.18,21.5,new THREE.MeshStandardMaterial({color:0x526170,transparent:true,opacity:.15,depthWrite:false}));slab.castShadow=false;}
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pointerDown=null,selectedId=null,selectedSeats=[],visibleIds=rooms.map(r=>r.id),freeCounts={},disposed=false,observer,transition=0;
 const homePosition=new THREE.Vector3(27,32,38),homeTarget=new THREE.Vector3(0,0,0);
 function setFrustum(){const w=container.clientWidth,h=container.clientHeight,aspect=w/h;const half=Math.max(14.8,24/aspect);camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(w,h,false);render();}
 function updateLabels(){const w=container.clientWidth,h=container.clientHeight;for(const r of rooms){const m=markers.get(r.id),v=new THREE.Vector3(r.position[0],2.75,r.position[1]+.5);v.project(camera);m.style.left=`${(v.x*.5+.5)*w}px`;m.style.top=`${(-v.y*.5+.5)*h}px`;m.hidden=!visibleIds.includes(r.id)||v.z>1||Math.abs(v.x)>1.1||Math.abs(v.y)>1.1;}}
 function render(){if(disposed)return;renderer.render(scene,camera);updateLabels();}
 function tween(target,zoom){cancelAnimationFrame(transition);if(reduced){controls.target.copy(target);camera.zoom=zoom;camera.updateProjectionMatrix();controls.update();render();return;}const from=controls.target.clone(),fromZoom=camera.zoom,start=performance.now();function frame(now){const t=Math.min((now-start)/420,1),e=1-Math.pow(1-t,3);controls.target.lerpVectors(from,target,e);camera.zoom=THREE.MathUtils.lerp(fromZoom,zoom,e);camera.updateProjectionMatrix();controls.update();render();if(t<1)transition=requestAnimationFrame(frame);}transition=requestAnimationFrame(frame);}
 controls.addEventListener('change',render);controls.addEventListener('start',()=>cancelAnimationFrame(transition));
 renderer.domElement.addEventListener('pointerdown',e=>{pointerDown={x:e.clientX,y:e.clientY};});
 renderer.domElement.addEventListener('pointerup',e=>{if(!pointerDown||Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y)>6)return;pointerDown=null;const bounds=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-bounds.left)/bounds.width*2-1,-(e.clientY-bounds.top)/bounds.height*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects([...roomGroups.values()],true);for(const hit of hits){let o=hit.object,seat=o.userData.seat,room;while(o){if(o.userData.room){room=o.userData.room;break;}o=o.parent;}if(room&&visibleIds.includes(room)&&freeCounts[room]!==0){if(room===selectedId&&seat)onSeat(room,seat);else onSelect(room);break;}}});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();disposed=true;onFailure();});
 observer=new ResizeObserver(setFrustum);observer.observe(container);controls.update();setFrustum();
 return {
  update(next){visibleIds=next.visibleIds;selectedId=next.selectedId;selectedSeats=next.selectedSeats;freeCounts=next.freeCounts;
   for(const r of rooms){const visible=visibleIds.includes(r.id),selected=r.id===selectedId,g=roomGroups.get(r.id);g.visible=visible;const marker=markers.get(r.id);marker.classList.toggle('is-selected',selected);marker.classList.toggle('is-busy',freeCounts[r.id]===0);marker.setAttribute('aria-pressed',String(selected));marker.disabled=freeCounts[r.id]===0;marker.querySelector('span').textContent=selected?'Выбрано':freeCounts[r.id]===0?'Занято':`${freeCounts[r.id]} мест`;outlines.get(r.id).visible=selected;roomFloors.get(r.id).material.emissive.set(selected?0x5c4726:0x000000);roomFloors.get(r.id).material.emissiveIntensity=.35;lights.get(r.id).intensity=selected?70:55;
    for(let n=1;n<=8;n++){const seat=seatObjects.get(r.id+'-'+n);seat.material=mat(selected&&selectedSeats.includes(n)?0xedb877:0xc2ab84);}
   }render();
  },
  focusRoom(id){const r=rooms.find(x=>x.id===id);if(!r)return;const target=new THREE.Vector3(r.position[0]*.14,0,r.position[1]*.14);tween(target,1.03);},
  zoom(factor){camera.zoom=THREE.MathUtils.clamp(camera.zoom*factor,.7,2.8);camera.updateProjectionMatrix();render();},
  rotate(){cancelAnimationFrame(transition);const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI/8);camera.position.copy(controls.target.clone().add(offset));controls.update();render();},
  reset(){cancelAnimationFrame(transition);camera.position.copy(homePosition);controls.target.copy(homeTarget);camera.zoom=1;camera.updateProjectionMatrix();controls.update();render();},
  setOverview(enabled){stack.visible=enabled;tween(new THREE.Vector3(0,enabled?-1.8:0,0),enabled?.84:1);},
  dispose(){disposed=true;cancelAnimationFrame(transition);observer.disconnect();controls.dispose();renderer.dispose();}
 };
}
