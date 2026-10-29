// Pixel coordinates always refer to the retained original plan crop, not room numbers.
export function toWorld(f,x,y){const scale=80/f.imageWidth;return [(x-f.imageWidth/2)*scale,(y-f.imageHeight/2)*scale];}
export function segmentTransform(f,s,height){const a=toWorld(f,s[0],s[1]),b=toWorld(f,s[2],s[3]);return {x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,length:Math.hypot(b[0]-a[0],b[1]-a[1]),thickness:s[4]*80/f.imageWidth,height,angle:Math.atan2(b[1]-a[1],b[0]-a[0])};}
export function validateFloorGeometry(f){
 if(!f||!Number.isInteger(f.floor)||f.floor<1||f.floor>5||!Number.isFinite(f.imageWidth)||f.imageWidth<=0||!Number.isFinite(f.imageHeight)||f.imageHeight<=0||!Array.isArray(f.footprint)||f.footprint.length<3||!Array.isArray(f.walls)||!f.walls.length||!Array.isArray(f.stairs))return false;
 const point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=0&&p[0]<=f.imageWidth&&p[1]>=0&&p[1]<=f.imageHeight;
 return f.footprint.every(point)&&(!f.insets||Array.isArray(f.insets)&&f.insets.every(p=>Array.isArray(p)&&p.length>=3&&p.every(point)))&&f.walls.every(s=>Array.isArray(s)&&s.length===5&&point(s.slice(0,2))&&point(s.slice(2,4))&&s[4]>0&&Number.isFinite(s[4])&&Math.hypot(s[2]-s[0],s[3]-s[1])>0)&&f.stairs.every(s=>Array.isArray(s)&&s.length===4&&s.every(Number.isFinite)&&point(s.slice(0,2))&&s[2]>0&&s[3]>0&&point([s[0]+s[2],s[1]+s[3]]));
}
