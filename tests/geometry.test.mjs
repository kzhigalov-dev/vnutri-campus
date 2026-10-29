import {createHash} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {toWorld,segmentTransform,validateFloorGeometry} from '../public/js/geometry.js';
const data=JSON.parse(readFileSync(new URL('../public/data/floor-geometry.json',import.meta.url)));
test('five source-specific layouts are valid and not copies',()=>{assert.equal(data.floors.length,5);assert.equal(new Set(data.floors.map(f=>JSON.stringify(f.walls))).size,5);for(const f of data.floors){assert.equal(validateFloorGeometry(f),true);assert.equal(f.page,318+f.floor);assert.ok(f.walls.length>100);assert.ok(f.stairs.length>=3)}});
test('image mapping preserves aspect, orientation and origin exactly',()=>{const f={imageWidth:3000,imageHeight:600};assert.deepEqual(toWorld(f,1500,300),[0,0]);assert.deepEqual(toWorld(f,0,0),[-40,-8]);assert.deepEqual(toWorld(f,3000,600),[40,8]);const t=segmentTransform(f,[100,100,200,100,5],1.5);assert.ok(Math.abs(t.length-80/30)<1e-8);assert.equal(t.height,1.5);assert.equal(t.angle,0)});
test('reject malformed sources, invalid coordinates and degenerate walls',()=>{const f=data.floors[0];for(const v of [{...f,walls:[]},{...f,imageWidth:0},{...f,footprint:[[0,0],[1,1]]},{...f,walls:[[1,2,1,2,5]]},{...f,walls:[[0,0,99999,2,5]]},{...f,walls:[[NaN,1,5,1,5]]}])assert.equal(validateFloorGeometry(v),false)});

test('every traced layout matches its retained source image bytes',()=>{for(const f of data.floors){const image=readFileSync(new URL(`../public/assets/floor${f.floor}-archive-plan.webp`,import.meta.url));assert.equal(createHash('sha256').update(image).digest('hex'),f.imageHash)}});
test('all five floors retain both checked diagonal west exterior walls',()=>{for(const f of data.floors){const diagonal=f.walls.filter(s=>Math.abs(s[2]-s[0])>35&&Math.abs(s[3]-s[1])>35);assert.ok(diagonal.length>=2,`floor${f.floor} is missing chamfer walls`)}});
