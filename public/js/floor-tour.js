import * as THREE from 'three';
import {createMotion,tourAutoplay} from './navigation-motion.js';
import {toWorld} from './geometry.js';
export function createFloorTour({camera,controls,render,onState=()=>{}}){
 const motion=createMotion();let stops=[],active=false,playing=false,index=0,revision=0;
 function emit(progress=0){onState({active,playing,index,count:stops.length,name:stops[index]?.name||'',progress});}
 async function travel(next,{autoplay=false}={}){if(!stops.length)return;const request=++revision;motion.cancel();index=(next+stops.length)%stops.length;active=true;playing=tourAutoplay(autoplay,globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);const stop=stops[index],from=camera.position.clone(),startTarget=controls.target.clone(),startZoom=camera.zoom,target=new THREE.Vector3(...stop.target),end=target.clone().add(new THREE.Vector3(...stop.offset));emit();const complete=await motion.run(t=>{camera.position.lerpVectors(from,end,t);controls.target.lerpVectors(startTarget,target,t);camera.zoom=startZoom+(stop.zoom-startZoom)*t;camera.updateProjectionMatrix();controls.update();emit(t);render();},playing?6500:1100);if(request!==revision||!complete)return;if(playing)travel(index+1,{autoplay:true});else emit(1);}
 function stop(){revision++;motion.cancel();active=false;playing=false;emit();}
 function play(){const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;travel(active?index:0,{autoplay:!reduced});}
 function pause(){if(playing){revision++;motion.cancel();playing=false;emit();}else travel(index+1,{autoplay:true});}
 const manual=()=>{if(active)stop()};const hide=()=>{if(document.hidden)stop()};window.addEventListener('blur',manual);document.addEventListener('visibilitychange',hide);controls.addEventListener('start',manual);
 return {get active(){return active},configure(f){stop();const tops=[];for(let i=0;i<f.footprint.length;i++){const a=f.footprint[i],b=f.footprint[(i+1)%f.footprint.length];if(b[0]-a[0]>150&&Math.abs(b[1]-a[1])<15&&a[1]<f.imageHeight*.3)tops.push(toWorld(f,(a[0]+b[0])/2,(a[1]+b[1])/2+140));}tops.sort((a,b)=>a[0]-b[0]);stops=tops.slice(0,3).map((p,i)=>({name:['Западное крыло','Центральное крыло','Восточное крыло'][i],target:[p[0],0,p[1]],offset:[8,18,24],zoom:3.1}));stops.push({name:'Весь этаж',target:[0,0,0],offset:[18,55,46],zoom:1});},play,pause,stop,step(direction){travel(index+direction);},dispose(){stop();window.removeEventListener('blur',manual);document.removeEventListener('visibilitychange',hide);controls.removeEventListener('start',manual);}};
}
