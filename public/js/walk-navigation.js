import {toWorld} from './geometry.js';
export function pointInPolygon([x,z],polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function segmentDistance(point,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz,t=length?Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dz)/length)):0;return Math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dz);}
export function createWalkMap(f,{obstacles=[],step=.18,radius=.11}={}){
 const scale=80/f.imageWidth,polygons=[f.footprint,...(f.insets||[])].map(poly=>poly.map(p=>toWorld(f,...p)));
 const walls=f.walls.map(s=>({a:toWorld(f,s[0],s[1]),b:toWorld(f,s[2],s[3]),r:s[4]*scale/2+radius}));
 const rects=[...obstacles,...f.stairs.map(([x,y,w,h])=>[...toWorld(f,x,y),w*scale,h*scale])];
 const bounds={minX:Math.min(...polygons.flat().map(p=>p[0])),maxX:Math.max(...polygons.flat().map(p=>p[0])),minZ:Math.min(...polygons.flat().map(p=>p[1])),maxZ:Math.max(...polygons.flat().map(p=>p[1]))};
 const buckets=new Map(),bucketSize=1.5,key=(x,z)=>`${x},${z}`;
 for(const wall of walls){for(let x=Math.floor((Math.min(wall.a[0],wall.b[0])-wall.r)/bucketSize);x<=Math.floor((Math.max(wall.a[0],wall.b[0])+wall.r)/bucketSize);x++)for(let z=Math.floor((Math.min(wall.a[1],wall.b[1])-wall.r)/bucketSize);z<=Math.floor((Math.max(wall.a[1],wall.b[1])+wall.r)/bucketSize);z++){const k=key(x,z);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(wall);}}
 function valid(p){if(!Array.isArray(p)||!p.every(Number.isFinite))return false;const poly=polygons.find(poly=>pointInPolygon(p,poly));if(!poly)return false;for(let i=0;i<poly.length;i++)if(segmentDistance(p,poly[i],poly[(i+1)%poly.length])<radius)return false;
  for(const wall of buckets.get(key(Math.floor(p[0]/bucketSize),Math.floor(p[1]/bucketSize)))||[])if(segmentDistance(p,wall.a,wall.b)<=wall.r)return false;
  return !rects.some(([x,z,w,d])=>p[0]>x-radius&&p[0]<x+w+radius&&p[1]>z-radius&&p[1]<z+d+radius);
 }
 function segmentClear(a,b){const count=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/(radius*.6)));for(let i=0;i<=count;i++)if(!valid([a[0]+(b[0]-a[0])*i/count,a[1]+(b[1]-a[1])*i/count]))return false;return true;}
 function move(from,delta){let p=[...from];const count=Math.max(1,Math.ceil(Math.hypot(...delta)/(radius*.6))),dx=delta[0]/count,dz=delta[1]/count;for(let i=0;i<count;i++){const next=[p[0]+dx,p[1]+dz];if(valid(next))p=next;else if(valid([p[0]+dx,p[1]]))p[0]+=dx;else if(valid([p[0],p[1]+dz]))p[1]+=dz;}return p;}
 const width=Math.ceil((bounds.maxX-bounds.minX)/step)+1,height=Math.ceil((bounds.maxZ-bounds.minZ)/step)+1,total=width*height;
 if(total>150000)throw Error('Navigation grid exceeds budget');
 const free=new Uint8Array(total),components=new Int32Array(total),point=i=>[bounds.minX+(i%width)*step,bounds.minZ+Math.floor(i/width)*step];
 for(let i=0;i<total;i++)if(valid(point(i)))free[i]=1;
 const directions=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]],queue=new Int32Array(total);let component=0,largest=0,largestSize=0;
 function neighbours(i,visit){const x=i%width,z=Math.floor(i/width);for(const [dx,dz] of directions){const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=width||nz>=height)continue;const n=nz*width+nx;if(!free[n]||dx&&dz&&(!free[z*width+nx]||!free[nz*width+x]))continue;visit(n);}}
 for(let i=0;i<total;i++){if(!free[i]||components[i])continue;component++;let head=0,tail=1;queue[0]=i;components[i]=component;while(head<tail){const current=queue[head++];neighbours(current,n=>{if(!components[n]){components[n]=component;queue[tail++]=n;}});}if(tail>largestSize){largestSize=tail;largest=component;}}
 function nearestIndex(p,{component:componentId,maxDistance=Infinity,polygon}={}){let result=-1,distance=maxDistance*maxDistance;for(let i=0;i<total;i++){if(!free[i]||componentId&&components[i]!==componentId)continue;const q=point(i);if(polygon&&!pointInPolygon(q,polygon))continue;const d=(p[0]-q[0])**2+(p[1]-q[1])**2;if(d<distance){distance=d;result=i;}}return result;}
 function nearest(p,options){const i=nearestIndex(p,options);return i<0?null:point(i);}
 function spawn(){if(!largest)return null;const bottom=Math.max(...f.footprint.map(p=>p[1]));return nearest(toWorld(f,f.imageWidth/2,bottom-100),{component:largest});}
 function route(from,to,{polygon}={}){const start=nearestIndex(from,{maxDistance:.6}),end=nearestIndex(to,{maxDistance:.6,polygon});if(start<0||end<0||components[start]!==components[end])return null;const previous=new Int32Array(total);previous.fill(-1);let head=0,tail=1;queue[0]=start;previous[start]=start;while(head<tail&&previous[end]<0){const i=queue[head++];neighbours(i,n=>{if(previous[n]<0){previous[n]=i;queue[tail++]=n;}});}if(previous[end]<0)return null;const path=[];for(let i=end;;i=previous[i]){path.push(point(i));if(i===start)break;}path.reverse();
  // Simplify only segments whose complete swept path is clear.
  const simplified=[valid(from)?[...from]:path[0]];let cursor=0;while(cursor<path.length-1){let next=cursor+1;while(next+1<path.length&&segmentClear(simplified.at(-1),path[next+1]))next++;simplified.push(path[next]);cursor=next;}if(valid(to)&&segmentClear(simplified.at(-1),to))simplified.push([...to]);return simplified;
 }
 let defaultPose;
 function sight(p,dx,dz,max=16){let distance=0;for(let d=.15;d<=max;d+=.15){if(!valid([p[0]+dx*d,p[1]+dz*d]))break;distance=d;}return distance;}
 function pose(wanted,options={}){if(!wanted&&defaultPose)return {...defaultPose,point:[...defaultPose.point]};const candidates=[];if(wanted){const p=nearest(wanted,{maxDistance:1.5,...options});if(p)candidates.push(p);}else{for(let i=0;i<total;i++)if(components[i]===largest&&(i%width)%5===0&&Math.floor(i/width)%5===0)candidates.push(point(i));if(!candidates.length&&spawn())candidates.push(spawn());}let best=null,score=-Infinity;for(const p of candidates)for(let direction=0;direction<8;direction++){const angle=direction*Math.PI/4,dx=Math.cos(angle),dz=Math.sin(angle),clearance=sight(p,dx,dz),back=sight(p,-dx,-dz,8),side=Math.min(sight(p,-dz,dx,1),sight(p,dz,-dx,1)),value=clearance+back*.2+side*.8-Math.abs(p[0])*.003;if(value>score){score=value;best={point:p,yaw:Math.atan2(-dx,-dz),clearance};}}if(!wanted)defaultPose=best;return best?{...best,point:[...best.point]}:null;}
 return {valid,move,nearest,route,spawn,pose,segmentClear,bounds,polygons,step,radius,cellCount:total,componentCount:component};
}
