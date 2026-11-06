import * as THREE from 'three';
import {toWorld} from './geometry.js';

// A cutaway elevation follows each retained boundary. Window spacing and heights
// are authored; no new rooms or circulation areas are introduced.
export function createFloorEnvelope({source,box,palette}){
 const group=new THREE.Group(),batches=new Map();
 function part(mat,x,y,z,w,h,d,angle){if(!batches.has(mat))batches.set(mat,[]);batches.get(mat).push({x,y,z,w,h,d,angle});}
 for(const polygon of [source.footprint,...(source.insets||[])]){
  for(let i=0;i<polygon.length;i++){
   const a=toWorld(source,...polygon[i]),b=toWorld(source,...polygon[(i+1)%polygon.length]),dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
   if(length<.18)continue;
   const angle=-Math.atan2(dz,dx),cx=(a[0]+b[0])/2,cz=(a[1]+b[1])/2;
   part(palette.sill,cx,.18,cz,length,.28,.12,angle);
   part(palette.trim,cx,1.20,cz,length,.07,.16,angle);
   const bays=Math.max(1,Math.floor(length/1.65)),pitch=length/bays;
   for(let j=0;j<=bays;j++){
    const t=j/bays,x=a[0]+dx*t,z=a[1]+dz*t;
    part(palette.trim,x,.72,z,.085,.96,.12,angle);
   }
   for(let j=0;j<bays;j++){
    const t=(j+.5)/bays,x=a[0]+dx*t,z=a[1]+dz*t;
    part(palette.glass,x,.74,z,Math.max(.06,pitch-.13),.82,.025,angle);
    part(palette.frame,x,.74,z,.025,.82,.045,angle);
    part(palette.frame,x,.78,z,Math.max(.06,pitch-.13),.022,.045,angle);
   }
  }
 }
 const dummy=new THREE.Object3D(),meshes=[];
 for(const [mat,items] of batches){const mesh=new THREE.InstancedMesh(box,mat,items.length);items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.y=p.angle;dummy.scale.set(p.w,p.h,p.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});group.add(mesh);meshes.push(mesh);}
 return {group,dispose(){meshes.forEach(mesh=>mesh.dispose());}};
}
