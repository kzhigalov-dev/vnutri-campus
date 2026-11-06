import * as THREE from 'three';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';
import {toWorld} from './geometry.js';
import {pilotRoomBySpace} from './pilot-spaces.js';
import {FLOOR_WORLDS,roomBounds,seatLayout} from './maquette-layout.js?v=20261030-11';
// A deliberately authored campus maquette, not a survey of current interiors.
export function createMaquetteProps({campus,box,material,track,textures}){
 const white=material({color:0xf0e9dc,roughness:.72}),wood=material({color:0xc89d74,roughness:.8}),ink=material({color:0x233d50,roughness:.6}),leaf=material({color:0x6f9279,roughness:.9}),coral=material({color:0xe89873,roughness:.7}),glass=material({color:0x93b6cb,metalness:.25,roughness:.35});
 const seatPart=box.clone();seatPart.scale(.75,.14,.62);seatPart.translate(0,.39,0);const backPart=box.clone();backPart.scale(.75,.48,.1);backPart.translate(0,.66,-.26);const chairGeometry=track(mergeGeometries([seatPart,backPart]));seatPart.dispose();backPart.dispose();
 const cylinder=track(new THREE.CylinderGeometry(1,1,1,12)),sphere=track(new THREE.SphereGeometry(1,12,8)),batches=new Map(),seats=new Map(),roomProps=new Map(),batchMeshes=[];let activeSeats=seats,activeRoomProps=roomProps;
 function primitive(parent,geo,mat,x,y,z,w,h,d,ry=0){let map=batches.get(parent);if(!map){map=new Map();batches.set(parent,map);}const key=geo.uuid+mat.uuid;if(!map.has(key))map.set(key,{geo,mat,items:[]});map.get(key).items.push({x,y,z,w,h,d,ry});}
 const b=(p,m,x,y,z,w,h,d,ry=0)=>primitive(p,box,m,x,y,z,w,h,d,ry);
 const c=(p,m,x,y,z,w,h,d)=>primitive(p,cylinder,m,x,y,z,w,h,d);
 const ball=(p,m,x,y,z,w,h,d)=>primitive(p,sphere,m,x,y,z,w,h,d);
 function plant(p,x,z,s=.3){c(p,coral,x,s*.22,z,s*.3,s*.44,s*.3);c(p,ink,x,s*.7,z,.025,s,.025);for(const [dx,dz] of [[0,0],[.13,.04],[-.12,-.02]])ball(p,leaf,x+dx*s,s*1.05,z+dz*s,s*.3,s*.4,s*.23);}
 function table(p,x,z,w,d,s=.3){b(p,wood,x,s,z,w,.045,d);for(const dx of [-.38,.38])for(const dz of [-.3,.3])b(p,ink,x+w*dx,s/2,z+d*dz,.035,s,.035);}
 function shelf(p,x,z,w,h=.75){b(p,wood,x,h/2,z,w,h,.12);for(let i=0;i<3;i++){b(p,ink,x,.13+i*.21,z+.075,w,.025,.04);for(let j=0;j<5;j++)b(p,j%2?white:coral,x-w*.38+j*w*.18,.22+i*.21,z+.095,w*.1,.15,.07);}}
 function poster(p,x,z,w,h=.65){b(p,ink,x,h/2+.18,z,w+.04,h+.04,.035);b(p,white,x,h/2+.18,z+.025,w,h,.015);b(p,coral,x-w*.12,h*.62+.18,z+.04,w*.5,h*.18,.01);b(p,glass,x+w*.17,h*.28+.18,z+.04,w*.22,h*.27,.01);}
 function chair(p,x,z,s,angle,roomId,seatId){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=angle;p.add(g);if(!roomId){b(g,coral,0,s*.39,0,s*.75,s*.14,s*.62);b(g,coral,0,s*.66,-s*.26,s*.75,s*.48,s*.1);b(g,ink,0,s*.2,0,.035,s*.4,.035);b(g,ink,0,.025,0,s*.56,.035,s*.48);return;}const mesh=new THREE.Mesh(chairGeometry,coral);mesh.scale.setScalar(s);mesh.userData={spaceId:roomId,seatId};g.add(mesh);const back=mesh;b(g,ink,0,s*.2,0,.035,s*.4,.035);b(g,ink,0,.025,0,s*.56,.035,s*.48);if(roomId==='f4-s36')for(const x of [-s*.4,s*.4])b(g,coral,x,s*.5,0,s*.13,s*.28,s*.7);if(roomId){if(!activeSeats.has(roomId))activeSeats.set(roomId,[]);activeSeats.get(roomId).push({mesh,back,seatId,baseMaterial:roomId==='f4-s31'?leaf:['f4-s4','f4-s13'].includes(roomId)?glass:roomId==='f4-s20'?wood:['f4-s27','f4-s39'].includes(roomId)?white:coral});}}
 // One texture atlas per floor keeps every door number crisp without loading
 // an image per room. Placards follow the same room visibility as the furniture.
 function addWayfinding(root,f,n){
  const doors=f.layout?.doors||[];if(!doors.length||typeof document==='undefined')return;
  const canvas=document.createElement('canvas'),cols=8,rows=Math.ceil((f.spaces.length+1)/cols);canvas.width=1024;canvas.height=rows*64;
  const ctx=canvas.getContext('2d'),indices=new Map();ctx.textAlign='center';ctx.textBaseline='middle';
  const entries=[{id:'floor',label:String(n)},...f.spaces];entries.forEach((space,i)=>{indices.set(space.id,i);const x=i%cols*128,y=Math.floor(i/cols)*64;ctx.fillStyle=pilotRoomBySpace(space.id)?'#b7cfaa':'#263e51';ctx.fillRect(x,y,128,64);ctx.fillStyle=pilotRoomBySpace(space.id)?'#18322a':'#fff7e8';ctx.font='600 '+(String(space.label).length>7?'20':'28')+'px sans-serif';ctx.fillText(space.label,x+64,y+33,118);});
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.add(texture);const signMaterial=material({map:texture,roughness:.85,side:THREE.DoubleSide});
  function sign(parent,id,w,h){const i=indices.get(id);if(i===undefined)return null;const geo=new THREE.PlaneGeometry(w,h),uv=geo.attributes.uv;for(let j=0;j<uv.count;j++)uv.setXY(j,(i%cols+uv.getX(j))/cols,1-(Math.floor(i/cols)+1-uv.getY(j))/rows);track(geo);const mesh=new THREE.Mesh(geo,signMaterial);parent.add(mesh);return mesh;}
  const numbered=new Set();for(const door of doors){const room=f.spaces.find(s=>s.id===door.id),p=roomProps.get(door.id);if(!room||!p)continue;const g=new THREE.Group();g.position.set(door.position[0]-p.position.x,-.10,door.position[1]-p.position.z);g.rotation.y=-Math.atan2(door.tangent[1],door.tangent[0]);p.add(g);const width=door.width,accent=pilotRoomBySpace(room.id)?leaf:wood;
   // Short reveals describe the opening while keeping the cutaway readable.
   for(const side of [-1,1])b(g,white,side*(width/2+.035),.39,0,.055,.78,.10);b(g,white,0,.79,0,width+.13,.055,.10);
   const leafGroup=new THREE.Group();leafGroup.position.x=-width/2;leafGroup.rotation.y=Math.PI*.38;g.add(leafGroup);b(leafGroup,accent,width*.44,.35,0,width*.88,.7,.035);b(leafGroup,ink,width*.74,.33,.026,.04,.025,.03);
   // The horizontal sill number remains legible from the plan camera even
   // when a tall retained wall obscures its vertical door plaque.
   if(!numbered.has(room.id)){const number=sign(g,room.id,Math.min(1.05,Math.max(.65,room.label.length*.13)),.30);if(number){number.rotation.x=-Math.PI/2;number.position.set(0,.12,(door.normal[0]*-door.tangent[1]+door.normal[1]*door.tangent[0])*.29);}numbered.add(room.id);}
   const plaque=sign(leafGroup,room.id,width*.62,.19);if(plaque)plaque.position.set(width*.44,.55,.024);
  }
  for(const landing of f.landings){const g=new THREE.Group();g.position.set(landing.center[0],.10,landing.center[1]);root.add(g);const mark=sign(g,'floor',.65,.4);if(mark){mark.rotation.x=-Math.PI/2;mark.position.z=-.45;}for(let j=0;j<3;j++){b(g,coral,-.15+j*.15,.025,.04+j*.08,.13,.025,.07);}}
 }
 function furnish(f,n,showcaseOnly=false){const root=new THREE.Group(),world=FLOOR_WORLDS[n-1];
  f.spaces.forEach((space,i)=>{const bounds=roomBounds(space.polygon),{x,z,w,d}=bounds;if(w<.22||d<.22)return;const pilot=pilotRoomBySpace(space.id),p=new THREE.Group();root.add(p);p.position.set(x,.13,z);p.userData.spaceId=space.id;activeRoomProps.set(space.id,p);const s=showcaseOnly?.88:Math.min(w/5.6,d/3.4,.5),kind=pilot?.style||world.kind;
   // Source walls already describe the real floor. Only isolated authored room
   // previews need their own enclosing walls; duplicate rectangles hide corridors.
   if(showcaseOnly){const backH=1.48;b(p,white,0,backH/2,-d*.46,w*.94,backH,.055);b(p,white,-w*.46,.24,0,.055,.48,d*.9);b(p,white,w*.46,.24,-d*.2,.055,.48,d*.5);}
   b(p,wood,-w*.23,.07,d*.44,w*.36,.14,.04);b(p,wood,w*.32,.07,d*.44,w*.23,.14,.04);
   if(pilot){
    const layout=seatLayout(kind,space.id);layout.forEach((seat,j)=>{const sx=seat.x*w,sz=seat.z*d;chair(p,sx,sz,s,seat.angle,space.id,j+1);if(['computers','quiet'].includes(kind)){const dz=seat.angle?-.15:.15;table(p,sx,sz+dz*d,s*.95,s*.65,s*.85);if(kind!=='quiet'){b(p,ink,sx,s*1.38,sz+dz*d,s*.7,s*.48,.035);b(p,glass,sx,s*1.38,sz+dz*d+.022,s*.59,s*.36,.01);b(p,white,sx,s*.91,sz+dz*d+s*.17,s*.55,.02,s*.16);}else{b(p,leaf,sx,s*1.15,sz+dz*d+s*.3,s*.95,s*.6,.04);c(p,ink,sx+s*.25,s*1.1,sz+dz*d,.025,s*.5,.025);c(p,white,sx+s*.25,s*1.37,sz+dz*d,s*.19,.05,s*.19);}}});
    if((kind==='team'&&space.id!=='f4-s36')||kind==='lecture'){table(p,0,0,w*.76,d*.3,s*.9);for(let j=0;j<3;j++)b(p,j%2?coral:white,(j-1)*w*.18,s*.94,0,w*.12,.015,d*.13);poster(p,w*.1,-d*.41,w*.5);}
    if(space.id==='f4-s36'){for(const x of [-w*.24,w*.24]){c(p,wood,x,.21,0,w*.15,.06,d*.2);b(p,white,x,.26,0,w*.1,.02,d*.12);}shelf(p,0,-d*.4,w*.65,.6);}
    if(space.id==='f4-s13'){for(const x of [-w*.16,w*.16]){b(p,glass,x,.6,0,.055,1.2,d*.65);}for(const z of [-d*.23,d*.23])table(p,0,z,w*.23,d*.24,.3);}
    if(space.id==='f4-s4'){b(p,ink,0,.14,0,w*.82,.08,.04);}
    if(space.id==='f4-s27'){b(p,white,0,s*1.08,0,w*.13,.28,d*.1);}
    if(kind==='reading'){for(const z of [-d*.23,0,d*.23]){c(p,ink,0,.48,z,.025,.4,.025);c(p,white,0,.7,z,.13,.07,.13);}shelf(p,0,-d*.4,w*.76,.8);table(p,0,0,w*.22,d*.7,s*.8);}
    if(kind==='design'){if(space.id==='f4-s8'){for(const z of [-d*.16,d*.16]){table(p,0,z,w*.82,d*.2,.3);for(let k=0;k<3;k++)b(p,[white,coral,glass][k],(k-1)*w*.22,.34,z,w*.18,.015,d*.13);}for(let k=0;k<3;k++)c(p,[white,wood,coral][k],w*.3,.62,-d*.36,(k+1)*.025,.75,(k+1)*.025);}else{b(p,white,0,.32,0,w*.8,.07,d*.35);for(let k=0;k<4;k++){const x=(k-1.5)*w*.21;b(p,ink,x,.42,0,w*.15,.15,.025);b(p,glass,x,.43,.02,w*.12,.1,.01);}}poster(p,-w*.23,-d*.42,w*.28);for(let j=0;j<3;j++)b(p,[coral,leaf,glass][j],w*.22,.2+j*.07,-d*.37,w*.23,.05,d*.15);}
    plant(p,w*.33,-d*.32,s*1.4);
   }else if(n>1&&(i+n)%3!==2){
    // Workrooms share a material language but carry floor-specific equipment.
    for(const tx of [-w*.23,w*.23])for(const tz of [-d*.22,d*.22]){
     table(p,tx,tz,w*.35,d*.24,.38);chair(p,tx,tz+d*.18,Math.min(s,.3),0);
     if(n===4){b(p,ink,tx,.61,tz,w*.22,.36,.035);b(p,glass,tx,.61,tz+.025,w*.18,.27,.015);b(p,white,tx,.41,tz+d*.06,w*.20,.02,d*.07);}
     else if(n===2){b(p,white,tx,.42,tz,w*.26,.025,d*.18);c(p,coral,tx-w*.08,.50,tz,w*.025,.17,d*.035);}
     else if(n===3){b(p,white,tx,.42,tz,w*.27,.02,d*.18);b(p,glass,tx+w*.05,.435,tz,w*.09,.01,d*.08);}
     else{b(p,white,tx,.44,tz,w*.2,.08,d*.15);b(p,glass,tx,.58,tz,w*.09,.22,d*.08);}
    }
    shelf(p,0,-d*.39,w*.65,.7);poster(p,0,-d*.43,w*.4,.7);
   }else if((i+n)%3===0){
    // Display plinths with sculptural forms and framed work.
    for(let j=0;j<3;j++){const px=(j-1)*w*.25;b(p,white,px,.22,0,w*.16,.44,d*.3);if(n===2)c(p,coral,px,.56,0,w*.06,.25,d*.09);else if(n===5)b(p,j%2?glass:coral,px,.58,0,w*.1,.25,d*.18,Math.PI/5);else ball(p,j%2?leaf:coral,px,.61,0,w*.085,.19,d*.15);}poster(p,0,-d*.42,w*.55);
   }else if((i+n)%3===1){
    table(p,0,0,w*.62,d*.36,.36);for(let j=0;j<4;j++){const sx=(j%2-.5)*w*.36,sz=(Math.floor(j/2)-.5)*d*.66;chair(p,sx,sz,Math.min(s,.32),sz>0?Math.PI:0);}if(n===2){for(let j=0;j<4;j++)c(p,[white,coral,glass,leaf][j],(j-1.5)*w*.1,.47,0,w*.04,.18,d*.07);}else{b(p,white,0,.4,0,w*.28,.02,d*.18);poster(p,0,-d*.43,w*.46);}
   }else {shelf(p,-w*.15,-d*.38,w*.55);b(p,leaf,0,.19,d*.1,w*.62,.28,d*.27);b(p,leaf,0,.38,d*.22,w*.62,.25,d*.07);c(p,wood,w*.22,.27,-d*.05,s*.45,.06,s*.45);plant(p,w*.3,-d*.3,s*1.4);}
  });
  if(!showcaseOnly)addWayfinding(root,f,n);
  // The three wing heads are the floor's authored exhibition anchors. They are
  // deliberately larger than the compact archived rooms along the main spine.
  const perimeter=f.source.footprint.map(point=>toWorld(f.source,...point)),near=Math.min(...perimeter.map(p=>p[1]));
  const heads=perimeter.map((a,i)=>[a,perimeter[(i+1)%perimeter.length]]).filter(([a,q])=>Math.abs(a[1]-q[1])<.3&&Math.abs(a[0]-q[0])>4&&Math.abs(a[0]-q[0])<12&&Math.max(a[1],q[1])<near+1.5).slice(0,3);
  if(!showcaseOnly)heads.forEach(([a,q],j)=>{if(n===4&&j===2)return;const p=new THREE.Group();p.position.set((a[0]+q[0])/2,.12,(a[1]+q[1])/2+1.4);root.add(p);const width=Math.abs(a[0]-q[0])*.83;
   b(p,j===1?leaf:wood,0,.035,0,width,.07,2.4);
   if(n===1){if(j===0){b(p,coral,0,.62,0,width*.85,1.2,.7);b(p,white,0,1.25,0,width*.94,.08,.8);}else{for(let k=0;k<3;k++)poster(p,(k-1)*width*.3,-.6,width*.24,1.6);for(const x of [-width*.23,width*.23])c(p,coral,x,.26,.65,.45,.5,.32);}}
   if(n===2){if(j===0){table(p,0,0,width*.85,1.4,.72);for(let k=0;k<3;k++)c(p,[white,coral,glass][k],(k-1)*width*.25,.98,0,.17,.4,.17);}else if(j===1){for(let k=0;k<3;k++){const x=(k-1)*width*.3;c(p,ink,x,.65,0,.035,1.3,.035);ball(p,white,x,1.2,0,.28,.53,.2);ball(p,wood,x,1.85,0,.13,.15,.13);c(p,ink,x,.06,0,.3,.07,.24);}}else{shelf(p,0,-.65,width*.9,1.5);for(let k=0;k<4;k++)b(p,[leaf,coral,glass,white][k],(k-1.5)*width*.21,.08,.5,width*.16,.04,.7);}}
   if(n===3){if(j!==1){for(let k=0;k<3;k++){const x=(k-1)*width*.3;poster(p,x,0,width*.24,1.4);b(p,wood,x,.5,.2,.055,1,.055);}}else{c(p,wood,0,.66,0,width*.33,.1,.8);for(let k=0;k<4;k++){const angle=k*Math.PI/2;chair(p,Math.cos(angle)*width*.37,Math.sin(angle)*.9,.55,-angle);}}}
   if(n===4){if(j===0){shelf(p,0,-.6,width*.9,1.65);b(p,leaf,0,.3,.45,width*.8,.55,.65);b(p,leaf,0,.65,.7,width*.8,.65,.12);}else if(j===1){table(p,0,0,width*.9,1.2,.7);for(let k=0;k<3;k++){const x=(k-1)*width*.28;b(p,ink,x,1.18,0,width*.21,.7,.07);b(p,glass,x,1.19,.05,width*.18,.55,.02);}}else{for(let k=0;k<3;k++){b(p,white,(k-1)*width*.28,.45,0,width*.2,.9,.7);ball(p,[coral,wood,glass][k],(k-1)*width*.28,1.2,0,width*.12,.35,.3);}}}
   if(n===5){if(j===1){table(p,0,0,width*.9,1.5,.72);for(let k=0;k<3;k++){b(p,white,(k-1)*width*.27,.78,0,width*.22,.03,.8);b(p,glass,(k-1)*width*.27,1,0,width*.12,.4,.4);}}else{for(const z of [-.65,.65])shelf(p,0,z,width*.9,1.8);}}
  });
  const showcase=[...f.spaces].sort((a,b)=>{const x=roomBounds(a.polygon),y=roomBounds(b.polygon);return y.w*y.d-x.w*x.d;}).slice(0,2);
  if(!showcaseOnly)showcase.forEach((room,j)=>{const p=roomProps.get(room.id),r=roomBounds(room.polygon),w=r.w*.8,d=r.d*.8;if(!p)return;
   if(n===1){if(j===0){b(p,coral,0,.43,0,w*.75,.86,d*.35);b(p,white,0,.88,0,w*.8,.06,d*.4);}else for(let k=0;k<4;k++)poster(p,(k-1.5)*w*.2,-d*.3,w*.16,1.25);}
   if(n===2){if(j===0){table(p,0,0,w*.8,d*.6,.6);b(p,white,w*.1,.65,0,w*.4,.025,d*.36);c(p,coral,-w*.2,.85,0,.17,.4,.17);}else for(let k=0;k<3;k++){const x=(k-1)*w*.25;c(p,ink,x,.4,0,.025,.8,.025);ball(p,coral,x,1,0,.18,.37,.15);c(p,wood,x,.04,0,.24,.05,.24);}}
   if(n===3){if(j===0)for(let k=0;k<4;k++){const x=(k-1.5)*w*.2;poster(p,x,0,w*.15,1.05);b(p,wood,x,.4,.13,.035,.8,.035,-.15);}else{c(p,wood,0,.5,0,w*.34,.06,d*.28);for(let k=0;k<4;k++)poster(p,(k-1.5)*w*.2,-d*.35,w*.14,1.1);}}
   if(n===4){if(j===0){shelf(p,0,-d*.35,w*.85,1.2);plant(p,w*.35,d*.25,.6);}else{b(p,leaf,0,.23,0,w*.7,.4,d*.4);b(p,leaf,0,.5,-d*.15,w*.7,.5,.12);}}
   if(n===5){if(j===0){shelf(p,-w*.3,0,w*.25,1.35);shelf(p,w*.05,0,w*.25,1.35);shelf(p,w*.35,0,w*.25,1.35);}else{table(p,0,0,w*.8,d*.6,.6);for(let k=0;k<3;k++){b(p,white,(k-1)*w*.2,.65,0,w*.15,.03,d*.35);b(p,glass,(k-1)*w*.2,.8,0,w*.1,.28,d*.2);}}}
  });return root;
 }
 const floors=new Map();for(const [n,f] of campus.floors)floors.set(n,furnish(f,n));
 const roomShowcases=new Map(),showcaseSeats=new Map(),showcaseRooms=new Map();activeSeats=showcaseSeats;activeRoomProps=showcaseRooms;
 for(const space of campus.floors.get(4).spaces.filter(s=>pilotRoomBySpace(s.id))){const authored={...space,polygon:[[-4,-3.5],[4,-3.5],[4,3.5],[-4,3.5]],center:[0,0]},root=furnish({...campus.floors.get(4),spaces:[authored]},4,true);const color=space.id==='f4-s31'?leaf:space.id==='f4-s39'?glass:wood;const slab=new THREE.Mesh(box,color);slab.position.y=-.15;slab.scale.set(8.4,.35,7.4);root.add(slab);roomShowcases.set(space.id,root);}
 activeSeats=seats;activeRoomProps=roomProps;
 const selectedMaterial=material({color:0xffd578,emissive:0x765319,emissiveIntensity:.14,roughness:.7});let seatSelection={spaceId:null,seatIds:new Set()};
 const consolidated=new Map();
 for(const [parent,map] of batches){let root=parent;while(root.parent)root=root.parent;root.updateMatrixWorld(true);if(!consolidated.has(root))consolidated.set(root,new Map());const target=consolidated.get(root);for(const [key,batch] of map){if(!target.has(key))target.set(key,{geo:batch.geo,mat:batch.mat,items:[]});for(const item of batch.items){let owner=parent;while(owner&&!owner.userData.spaceId)owner=owner.parent;target.get(key).items.push({...item,parentMatrix:parent.matrixWorld.clone(),spaceId:owner?.userData.spaceId});}}}
 for(const [parent,map] of consolidated)for(const {geo,mat,items} of map.values()){const mesh=new THREE.InstancedMesh(geo,mat,items.length),dummy=new THREE.Object3D();items.forEach((it,i)=>{dummy.position.set(it.x,it.y,it.z);dummy.rotation.set(0,it.ry,0);dummy.scale.set(it.w,it.h,it.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix.premultiply(it.parentMatrix));});mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);batchMeshes.push({mesh,items,matrices:items.map((_,i)=>{const m=new THREE.Matrix4();mesh.getMatrixAt(i,m);return m;})});}

 return {floors,seats,roomProps,roomShowcases,showcaseSeats,setVisible(ids,focusId=null){const zero=new THREE.Matrix4().makeScale(0,0,0);for(const {mesh,items,matrices} of batchMeshes){items.forEach((item,i)=>mesh.setMatrixAt(i,(focusId?item.spaceId!==focusId:item.spaceId&&!ids.has(item.spaceId))?zero:matrices[i]));mesh.instanceMatrix.needsUpdate=true;}},setSeatSelection(spaceId,ids){seatSelection={spaceId,seatIds:new Set(ids||[])};},setAvailability(data,selected){for(const [id,items] of [...seats,...showcaseSeats]){const status=data.get(id);for(const seat of items){const busy=status?.occupied?.has(seat.seatId);seat.mesh.material=seat.back.material=busy?ink:seatSelection.spaceId===id&&seatSelection.seatIds.has(seat.seatId)?selectedMaterial:seat.baseMaterial;}}},dispose(){for(const parent of consolidated.keys())parent.traverse(o=>{if(o.isInstancedMesh)o.dispose();});}};
}
