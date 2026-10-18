import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTowerJourney} from './tower-journey.js';

test('a route choice locks the reached floor until its outcome is completed',()=>{
 const m=createTowerJourney();m.start();assert.deepEqual(m.choices(),['echo','mob','chest']);
 assert.equal(m.select('event'),false);m.select('echo');assert.equal(m.journey.floor,3);
 assert.equal(m.enter().kind,'echo');assert.equal(m.journey.floor,4);
 assert.equal(m.enter(),null);assert.equal(m.select('mob'),false);assert.equal(m.advance(),false);
 assert.equal(m.resolve({label:'回复'}),true);assert.equal(m.resolve({label:'再次回复'}),false);
 assert.equal(m.journey.history.length,1);assert.equal(m.advance(),true);
 assert.equal(m.journey.floor,4);assert.deepEqual(m.choices(),['event','quiz','mob']);
});
test('chest and battle rewards can each be recorded only once per pending node',()=>{
 const m=createTowerJourney();m.start();m.select('chest');m.enter();
 assert.equal(m.addLoot(),true);assert.equal(m.addLoot(),false);
 m.resolve({label:'收获'});m.advance();m.select('mob');m.enter();
 assert.equal(m.addLoot(),true);assert.equal(m.journey.loot.length,2);
});
test('descending from an unresolved node preserves arrival without counting a win',()=>{
 const m=createTowerJourney();m.start();m.enter();m.end('descend');
 assert.equal(m.journey.floor,4);assert.equal(m.journey.history.length,0);
 assert.equal(m.resolve({label:'迟到的胜利'}),false);assert.equal(m.enter(),null);assert.deepEqual(m.choices(),[]);
});
test('clearing the last floor produces one ending; restarting has fresh route state',()=>{
 const m=createTowerJourney();m.start();
 for(let floor=4;floor<=10;floor++){assert(m.enter());m.resolve({label:'节点已完成'});m.advance();}
 assert.equal(m.journey.floor,10);assert.equal(m.journey.ended,'clear');assert.equal(m.journey.history.length,7);
 assert.equal(m.advance(),false);assert.equal(m.end('descend'),false);
 m.start();assert.equal(m.journey.floor,3);assert.equal(m.journey.ended,null);assert.equal(m.journey.history.length,0);assert.equal(m.journey.loot.length,0);
});
