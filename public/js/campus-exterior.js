import * as THREE from 'three';
import {toWorld} from './geometry.js';

// Photo-informed architectural maquette, not a surveyed elevation. The street
// front is the long, straight edge opposite the three courtyard wings.
// References: sutd.ru/universitet/gallery/1743/618/ (official elevation photo),
// Commons «Вознесенский 44-46 01/02/04.jpg» (E. Borisova, 2020/2025).
export function createCampusExterior({campus,box,material,track,textures,depthScale=2.2}) {
 const ref=campus.floors.get(4),points=ref.source.footprint.map(p=>{const [x,z]=toWorld(ref.source,...p);return [x+ref.offset[0],(z+ref.offset[1])*depthScale];});
 const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minZ=Math.min(...points.map(p=>p[1])),maxZ=Math.max(...points.map(p=>p[1]));
 const streetEdges=points.map((p,i)=>[p,points[(i+1)%points.length]]).filter(([a,b])=>Math.abs(a[1]-b[1])<.2).sort((a,b)=>Math.abs(b[1][0]-b[0][0])-Math.abs(a[1][0]-a[0][0]));
 const street=streetEdges[0],streetLeft=Math.min(street[0][0],street[1][0]),streetRight=Math.max(street[0][0],street[1][0]),streetZ=(street[0][1]+street[1][1])/2;
 const width=streetRight-streetLeft,entryX=streetLeft+width*.29;
 const stone=material({color:0xc9c8bb,roughness:.9}),stoneLight=material({color:0xe0ddd0,roughness:.82}),joints=material({color:0xaaa99d,roughness:1}),base=material({color:0x454c4c,roughness:.87}),frame=material({color:0x4f554f,metalness:.28,roughness:.48}),glass=material({color:0x608087,metalness:.28,roughness:.3}),lit=material({color:0xc4b88e,emissive:0xa88b51,emissiveIntensity:.22,roughness:.5}),roofMat=material({color:0x59635e,metalness:.4,roughness:.7}),copper=material({color:0x6f8e80,metalness:.55,roughness:.7}),paving=material({color:0xb6b8b1,roughness:1}),asphalt=material({color:0x3d5061,roughness:1}),paint=material({color:0xd7d4c4,roughness:1}),batches=new Map();
 const facades=new Map(),roof=new THREE.Group(),site=new THREE.Group();roof.userData.floor=5;
 function b(parent,mat,x,y,z,w,h,d,angle=0){let batch=batches.get(parent);if(!batch){batch=new Map();batches.set(parent,batch);}if(!batch.has(mat))batch.set(mat,[]);batch.get(mat).push({x,y,z,w,h,d,angle});}
 function plane(parent,canvas,x,y,z,w,h,ry=0){const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.add(texture);const mesh=new THREE.Mesh(track(new THREE.PlaneGeometry(w,h)),material({map:texture,transparent:true,roughness:.8}));mesh.position.set(x,y,z);mesh.rotation.y=ry;parent.add(mesh);}
 function window(edge,x,y,w,h,depth,litWindow=false){b(edge,frame,x,y,depth,w+.1,h+.12,.07);b(edge,litWindow?lit:glass,x,y,depth-.045,w,h,.035);b(edge,stoneLight,x,y-h/2-.05,depth-.08,w+.25,.1,.22);b(edge,frame,x,y,depth-.07,.035,h,.045);b(edge,frame,x,y+h*.16,depth-.07,w,.035,.045);}
 const tiers=[{y:0,h:2.9},{y:2.9,h:2.7},{y:5.6,h:2.7},{y:8.3,h:2.7},{y:11,h:2.15}];
 for(let n=1;n<=5;n++){
  const root=new THREE.Group();root.userData.floor=n;facades.set(n,root);const {y,h}=tiers[n-1];
  for(let i=0;i<points.length;i++){
   const a=points[i],q=points[(i+1)%points.length],dx=q[0]-a[0],dz=q[1]-a[1],length=Math.hypot(dx,dz);if(length<.25)continue;
   const front=Math.abs(a[1]-streetZ)<.25&&Math.abs(q[1]-streetZ)<.25&&length>width*.7;
   const edge=new THREE.Group();edge.position.set((a[0]+q[0])/2,0,(a[1]+q[1])/2);edge.rotation.y=-Math.atan2(dz,dx);root.add(edge);
   // Four visible street tiers match the photos. The fifth navigation level is
   // represented by a recessed roof volume; exact floor/elevation registration
   // cannot be recovered from the supplied wayfinding diagrams.
   if(front&&n===5)continue;
   const wallMat=n===1?base:stone;
   b(edge,wallMat,0,y+h/2,0,length,h,.28);
   const count=Math.max(1,Math.floor(length/(front?2.05:2.6))),spacing=length/count;
   for(let j=0;j<count;j++){
    const x=(j+.5)*spacing-length/2;
    if(front){
     const wx=edge.position.x+x,nearBay=[streetLeft+width*.29,streetLeft+width*.73].some(v=>Math.abs(wx-v)<width*.044),nearEntry=Math.abs(wx-entryX)<2;
     if(n===1){if(nearEntry)continue;window(edge,x,1.35,spacing*.78,2.12,-.18,j%7===2);}
     else if(!nearBay){window(edge,x,y+h*.51,spacing*.56,1.5,-.18,(j+n*3)%11===0);}
    }else{
     // Glass is added on both faces so the wing/courtyard remains legible after orbiting.
     window(edge,x,y+h*.51,Math.min(.95,spacing*.5),n===1?1.65:1.36,-.18,(j+n)%9===0);
     b(edge,glass,x,y+h*.51,.17,Math.min(.95,spacing*.5),n===1?1.65:1.36,.025);
    }
   }
   if(n===1)b(edge,stoneLight,0,2.9,0,length+.1,.16,.52);
   if(n===4||n===5&&!front){b(edge,stoneLight,0,y+h-.12,0,length+.25,.18,.52);b(edge,stoneLight,0,y+h+.03,0,length+.42,.12,.72);}
   if(front){
    // Quiet stone-course joints, recessed panels and two monumental glazed bays.
    for(let k=1;k<4;k++)b(edge,joints,0,y+h*k/4,-.15,length,.012,.012);
    if(n>1)for(const wx of [streetLeft+width*.29,streetLeft+width*.73]){
     const x=wx-edge.position.x,bw=width*.084;
     b(edge,base,x,y+h/2,-.18,bw-.24,h,.05);b(edge,glass,x,y+h/2,-.22,bw-.48,h-.18,.035);
     for(let k=0;k<=4;k++)b(edge,stoneLight,x-bw/2+k*bw/4,y+h/2,-.3,.09,h,.13);
     b(edge,stoneLight,x,y,-.3,bw,.14,.13);b(edge,stoneLight,x,y+h*.5,-.29,bw,.065,.1);
     for(const sign of [-1,1])b(edge,stoneLight,x+sign*(bw/2+.12),y+h/2,-.31,.24,h,.38);
     if(n===4){b(edge,stoneLight,x,10.9,-.35,bw+.65,.26,.55);b(edge,stoneLight,x,11.12,-.35,bw+.85,.14,.65);}
    }
   }
  }
 }
 const entry=facades.get(1);b(entry,base,entryX,1.32,streetZ-.22,4.8,2.64,.45);
 for(const x of [-1.12,0,1.12]){b(entry,frame,entryX+x,1.14,streetZ-.49,1.03,2.27,.12);b(entry,glass,entryX+x,1.24,streetZ-.565,.86,1.89,.035);b(entry,copper,entryX+x+.28,1.04,streetZ-.61,.035,.42,.06);}
 b(entry,base,entryX,2.63,streetZ-.85,7.6,.28,1.7);b(entry,copper,entryX,2.82,streetZ-1.18,7.7,.22,1.1);b(entry,stoneLight,entryX,.04,streetZ-.92,5.3,.12,1.6);
 for(const side of [-1,1]){b(entry,stoneLight,entryX+side*2.52,1.25,streetZ-.42,.45,2.5,.55);b(entry,copper,entryX+side*3.4,1.55,streetZ-.43,.7,.72,.06);}
 if(typeof document!=='undefined'){
  const sign=document.createElement('canvas');sign.width=2048;sign.height=128;const c=sign.getContext('2d');c.fillStyle='#dedbcd';c.font='600 43px sans-serif';c.textAlign='center';c.fillText('САНКТ-ПЕТЕРБУРГСКИЙ ГОСУДАРСТВЕННЫЙ УНИВЕРСИТЕТ',1024,52);c.font='600 40px sans-serif';c.fillText('ПРОМЫШЛЕННЫХ ТЕХНОЛОГИЙ И ДИЗАЙНА',1024,106);plane(facades.get(4),sign,(streetLeft+streetRight)/2,10.55,streetZ-.335,width*.44,.8,Math.PI);
  const doorSign=document.createElement('canvas');doorSign.width=1024;doorSign.height=128;const d=doorSign.getContext('2d');d.fillStyle='#e9e3ca';d.font='600 70px sans-serif';d.textAlign='center';d.fillText('СПбГУПТД',512,91);plane(entry,doorSign,entryX,2.64,streetZ-1.72,4,.5,Math.PI);
 }
 // Shallow standing-seam roofs follow the actual comb footprint, not a single
 // oversized pitched roof stretched across all three open courtyards.
 const shape=new THREE.Shape();points.forEach(([x,z],i)=>{const rz=Math.abs(z-streetZ)<.25?z+3.2:z;i?shape.lineTo(x,-rz):shape.moveTo(x,-rz)});shape.closePath();const slab=track(new THREE.ExtrudeGeometry(shape,{depth:.22,bevelEnabled:false}));slab.rotateX(-Math.PI/2);const roofMesh=new THREE.Mesh(slab,roofMat);roofMesh.position.y=13.18;roof.add(roofMesh);
 // A shallow metal pitch rises behind the street cornice. Its sloped face,
 // rather than a tall opaque fascia, retains the low skyline in the photographs.
 const pitch=track(new THREE.BufferGeometry());pitch.setAttribute('position',new THREE.Float32BufferAttribute([
  streetLeft,11.13,streetZ-.12, streetLeft,13.4,streetZ+3.2, streetRight,11.13,streetZ-.12,
  streetRight,11.13,streetZ-.12, streetLeft,13.4,streetZ+3.2, streetRight,13.4,streetZ+3.2
 ],3));pitch.computeVertexNormals();roof.add(new THREE.Mesh(pitch,roofMat));
 b(roof,stoneLight,(streetLeft+streetRight)/2,11.08,streetZ-.12,width+.2,.16,.45);
 const seamWidth=width/28;for(let i=1;i<28;i++)b(roof,copper,streetLeft+i*seamWidth,13.41,streetZ+5.5,.022,.025,4);
 // Low roof lanterns and parapets on the three courtyard wing heads.
 const horizontal=points.map((a,i)=>[a,points[(i+1)%points.length]]).filter(([a,q])=>Math.abs(a[1]-q[1])<.2&&Math.abs(a[0]-q[0])>4&&Math.abs(a[0]-q[0])<10&&a[1]>minZ+8);
 for(const [a,q] of horizontal){const x=(a[0]+q[0])/2,z=(a[1]+q[1])/2;b(roof,stoneLight,x,13.43,z,Math.abs(a[0]-q[0])+.16,.4,.25);b(roof,base,x,13.43,z-2.1,2.4,.4,1.7);b(roof,glass,x,13.67,z-2.1,2.2,.08,1.5);}
 b(site,base,(minX+maxX)/2,-.65,(minZ+maxZ)/2,maxX-minX+5,.65,maxZ-minZ+7);
 b(site,paving,(minX+maxX)/2,-.29,(minZ+maxZ)/2,maxX-minX+4,.08,maxZ-minZ+6);
 b(site,paving,(streetLeft+streetRight)/2,-.19,streetZ-2.05,width+3,.16,3.7);
 b(site,asphalt,(streetLeft+streetRight)/2,-.3,streetZ-5.1,width+5,.06,3.1);
 b(site,stoneLight,(streetLeft+streetRight)/2,-.17,streetZ-3.95,width+3,.14,.16);
 for(let x=entryX-2.4;x<=entryX+2.4;x+=.8)b(site,paint,x,-.255,streetZ-5,.42,.02,2.6);
 for(let x=streetLeft+1;x<streetRight;x+=3.2){if(Math.abs(x-entryX)<3)continue;b(site,base,x,.2,streetZ-3.3,.055,.7,.055);b(site,base,x+.8,.43,streetZ-3.3,1.6,.045,.045);}
 for(const [root,map] of batches)for(const [mat,items] of map){const mesh=new THREE.InstancedMesh(box,mat,items.length),dummy=new THREE.Object3D();items.forEach((v,i)=>{dummy.position.set(v.x,v.y,v.z);dummy.rotation.y=v.angle;dummy.scale.set(v.w,v.h,v.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});root.add(mesh);}
 return {facades,roof,site,levelBases:tiers.map(t=>t.y),front:{x:entryX,z:streetZ},bounds:{minX,maxX,minZ,maxZ},dispose(){for(const root of [...facades.values(),roof,site])root.traverse(o=>{if(o.isInstancedMesh)o.dispose();});}};
}
