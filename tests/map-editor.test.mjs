import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCampusNavigator} from '../public/js/campus-navigation.js';
import {campusClosures} from '../public/js/campus-closures.js';
import {MAP_STORAGE_KEY,mapLinks,validateClosures,readMapState,saveMapSnapshot,restoreMapSnapshot,loadMapClosures} from '../public/js/map-preview.js';
const read=name=>JSON.parse(readFileSync(new URL(`../public/data/${name}.json`,import.meta.url)));
const campus=createCampusNavigator(read('floor-geometry'),read('floor-spaces'));
const storage=()=>{const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};};

test('links are deduplicated by stable ID and labelled from actual landings',()=>{
 const links=mapLinks(campus);assert.ok(links.length);assert.equal(links.length,new Set(campus.links.map(link=>link.id)).size);
 assert.equal(campus.links.length,links.length*2);assert.ok(links.every(link=>/этаж/.test(link.label)));
});
test('intervals and IDs are checked before snapshots can be saved',()=>{
 const linkId=mapLinks(campus)[0].id;
 for(const closure of [{linkId:'missing'},{linkId,startsAt:'2026-02-30T12:00:00Z'},{linkId,startsAt:'2026-01-01T12:00'},{linkId,startsAt:'2026-01-02T12:00:00Z',endsAt:'2026-01-01T12:00:00Z'}])assert.throws(()=>validateClosures([closure],campus));
 assert.equal(validateClosures([{linkId,startsAt:'2026-01-01T12:00:00+03:00'}],campus)[0].startsAt,'2026-01-01T09:00:00.000Z');
});
test('preview is explicit, uses saved data, and restores history without public changes',()=>{
 const db=storage(),from=campus.floors.get(2).spaces.find(s=>s.label==='201'),to=campus.floors.get(3).spaces.find(s=>s.label==='340-345');
 const original=campus.route(from.id,to.id),linkId=original.connections[0].id;
 const first=saveMapSnapshot(db,campus,[{linkId}]);saveMapSnapshot(db,campus,[]);
 assert.equal(loadMapClosures(campus,{storage:db,search:''}).closures,campusClosures);
 assert.deepEqual(loadMapClosures(campus,{storage:db,search:'?map=preview'}).closures,[]);
 const restored=restoreMapSnapshot(db,campus,first.currentId);assert.equal(restored.snapshots.length,3);
 const loaded=loadMapClosures(campus,{storage:db,search:'?map=preview'});assert.equal(loaded.mode,'preview');
 for(const route of [campus.route(from.id,to.id,{closures:loaded.closures}),campus.route(to.id,from.id,{closures:loaded.closures})])assert.ok(route.connections.every(edge=>edge.id!==linkId));
 assert.equal(campus.route(from.id,to.id).connections[0].id,linkId);
});
test('missing, corrupt, and inaccessible preview states fall back with a visible error',()=>{
 const db=storage();assert.equal(loadMapClosures(campus,{storage:db,search:'?map=preview'}).mode,'public');
 db.setItem(MAP_STORAGE_KEY,'not json');const corrupt=loadMapClosures(campus,{storage:db,search:'?map=preview'});assert.equal(corrupt.mode,'public');assert.ok(corrupt.error);assert.throws(()=>readMapState(db,campus));
 const denied={getItem(){throw new Error('denied')}};assert.ok(loadMapClosures(campus,{storage:denied,search:'?map=preview'}).error);
});
