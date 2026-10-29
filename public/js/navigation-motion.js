export const smoothStep=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
export function zoomEntryFloor(previous,next,floor){return Number.isInteger(floor)&&floor>=1&&floor<=5&&next>previous+.0001&&next>=1.85?floor:null;}
// Asset preparation and camera motion may finish in either order. Only the latest intent wins.
export function createFloorTransition(){let revision=0;return {cancel(){revision++;},async open(number,{prepare,fly,reveal}){const request=++revision,isCurrent=()=>request===revision;const [ready]=await Promise.all([prepare(),fly()]);if(!isCurrent()||ready===false)return false;await reveal(number,isCurrent);return isCurrent();}};}
export function createMotion(){let cancelCurrent=()=>{};return {cancel(){cancelCurrent();},run(update,duration=750){cancelCurrent();return new Promise(resolve=>{let frame,finished=false,start;const finish=value=>{if(finished)return;finished=true;if(frame!==undefined)cancelAnimationFrame(frame);resolve(value);};cancelCurrent=()=>finish(false);if(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches||duration<=0){update(1);finish(true);return;}function step(time){if(finished)return;start??=time;const progress=Math.min(1,(time-start)/duration);update(smoothStep(progress));if(progress===1)finish(true);else frame=requestAnimationFrame(step);}update(0);frame=requestAnimationFrame(step);});}};}

export const tourAutoplay=(requested,reduced)=>Boolean(requested&&!reduced);

export const shouldExitFloor=(previous,next,{armed=false,walking=false,touring=false}={})=>Boolean(armed&&!walking&&!touring&&next<.58&&next<previous);
