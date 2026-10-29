import {toWorld} from './geometry.js';
import {pointInPolygon,segmentDistance} from './walk-navigation.js';
const projection=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return [a[0]+dx*t,a[1]+dy*t]};
// A separate illustrative interior: retained archive geometry is never rewritten.
export function prepareGalleryLayout(source,spaces){
 const scale=80/source.imageWidth,min=.45/scale,kept=[];
 for(const w of [...source.walls].sort((a,b)=>Math.hypot(b[2]-b[0],b[3]-b[1])-Math.hypot(a[2]-a[0],a[3]-a[1]))){if(Math.hypot(w[2]-w[0],w[3]-w[1])<min)continue;if(kept.some(k=>segmentDistance(w.slice(0,2),k.slice(0,2),k.slice(2,4))*scale<.16&&segmentDistance(w.slice(2,4),k.slice(0,2),k.slice(2,4))*scale<.16))continue;kept.push([...w]);}
 const polygons=[source.footprint,...(source.insets||[])],inside=p=>polygons.some(poly=>pointInPolygon(p,poly)),bottom=Math.max(...source.footprint.map(p=>p[1])),spineY=bottom-120,doors=[];
 for(const space of spaces){let best=null,score=Infinity;for(const w of kept){const a=w.slice(0,2),b=w.slice(2,4),length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length*scale<.72)continue;const q=projection(space.center,a,b),distance=Math.hypot(q[0]-space.center[0],q[1]-space.center[1])*scale;if(distance>1.65||distance<.12)continue;const t=[(b[0]-a[0])/length,(b[1]-a[1])/length],n=[-t[1],t[0]],margin=.34/scale;if(Math.hypot(q[0]-a[0],q[1]-a[1])<margin||Math.hypot(q[0]-b[0],q[1]-b[1])<margin)continue;if(!inside([q[0]+n[0]*.32/scale,q[1]+n[1]*.32/scale])||!inside([q[0]-n[0]*.32/scale,q[1]-n[1]*.32/scale]))continue;const value=distance+Math.abs(q[1]-spineY)*scale*.25;if(value<score){score=value;best={q,t,n,wall:w};}}
  if(!best)continue;const position=toWorld(source,...best.q);if(doors.some(d=>Math.hypot(d.position[0]-position[0],d.position[1]-position[1])<.67))continue;let normal=best.n;const toward=[space.center[0]-best.q[0],space.center[1]-best.q[1]];if(normal[0]*toward[0]+normal[1]*toward[1]>0)normal=normal.map(v=>-v);doors.push({id:space.id,label:space.label,position,pixel:best.q,tangent:best.t,normal,width:.56,zone:position[0]<-10?0:position[0]<10?1:2});
 }
 function cutWalls(candidates){const walls=[];
 for(const w of kept){const a=w.slice(0,2),b=w.slice(2,4),length=Math.hypot(b[0]-a[0],b[1]-a[1]),t=[(b[0]-a[0])/length,(b[1]-a[1])/length],cuts=[];
  for(const d of candidates){const parallel=Math.abs(t[0]*d.tangent[0]+t[1]*d.tangent[1]);if(parallel<.97||segmentDistance(d.pixel,a,b)*scale>Math.max(.15,w[4]*scale*.55))continue;const along=(d.pixel[0]-a[0])*t[0]+(d.pixel[1]-a[1])*t[1],half=(d.width/2+.045)/scale;cuts.push([Math.max(0,along-half),Math.min(length,along+half)]);}
  cuts.sort((a,b)=>a[0]-b[0]);let cursor=0;for(const [start,end] of cuts){if(start>cursor+.04/scale)walls.push([a[0]+t[0]*cursor,a[1]+t[1]*cursor,a[0]+t[0]*start,a[1]+t[1]*start,w[4]]);cursor=Math.max(cursor,end);}if(length>cursor+.04/scale)walls.push([a[0]+t[0]*cursor,a[1]+t[1]*cursor,...b,w[4]]);
 }
 return walls;}
 const walls=cutWalls(doors);
 const validDoors=doors.filter(d=>[-.24,-.12,0,.12,.24].every(offset=>{const p=d.pixel.map((v,i)=>v+d.normal[i]*offset/scale);return inside(p)&&!walls.some(w=>segmentDistance(p,w.slice(0,2),w.slice(2,4))*scale<=w[4]*scale/2+.115)&&!source.stairs.some(([x,y,w,h])=>p[0]>x-.12/scale&&p[0]<x+w+.12/scale&&p[1]>y-.12/scale&&p[1]<y+h+.12/scale)}));
 return {floor:{...source,walls:cutWalls(validDoors)},doors:validDoors,removedFragments:source.walls.length-kept.length,spineY:toWorld(source,source.imageWidth/2,spineY)[1]};
}
