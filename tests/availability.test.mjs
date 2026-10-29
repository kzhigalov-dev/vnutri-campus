import test from 'node:test';
import assert from 'node:assert/strict';
import {createAvailabilityLoader} from '../public/js/booking-client.js';
test('late availability responses cannot overwrite a newer date',async()=>{const requests=[];const loader=createAvailabilityLoader(path=>new Promise(resolve=>requests.push({path,resolve})));const old=loader('2026-10-30'),latest=loader('2026-10-31');requests[1].resolve({slots:[{seat:2}]});assert.deepEqual(await latest,{date:'2026-10-31',slots:[{seat:2}]});requests[0].resolve({slots:[{seat:1}]});assert.equal(await old,null)});
