const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DictationEngine } = require('../assets/dictation.js');
function setup() {
  let now=0,id=0;const tasks=new Map(), spoken=[];let end;
  const transport={stop(){},play(item,rate,done){spoken.push(item.text);end=done;}};
  const engine=new DictationEngine(transport,()=>{},{now:()=>now,set:(fn,ms)=>{tasks.set(++id,{fn,at:now+ms});return id;},clear:id=>tasks.delete(id)});
  const tick=ms=>{const target=now+ms;for(;;){const due=[...tasks].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;tasks.delete(due[0]);due[1].fn();}now=target;};
  return {engine,spoken,tasks,tick,end:()=>end(),callback:()=>end};
}
const config={repeat:2,repeatGap:1,itemGap:3,rounds:2,rate:1};
test('two words, two repeats, two rounds play exactly eight utterances',()=>{
 const s=setup();s.engine.start([{text:'apple'},{text:'banana'}],config);
 for(let i=0;i<8;i++){s.end();s.tick(3000);}
 assert.deepEqual(s.spoken,['apple','apple','banana','banana','apple','apple','banana','banana']);
 assert.equal(s.engine.status,'completed');assert.equal(s.tasks.size,0);
});
test('repeat delay and next-word delay remain distinct',()=>{
 const s=setup();s.engine.start([{text:'A'},{text:'B'}],config);s.end();s.tick(999);assert.equal(s.spoken.length,1);s.tick(1);assert.equal(s.spoken.length,2);
 s.end();s.tick(2999);assert.equal(s.spoken.length,2);s.tick(1);assert.equal(s.spoken.at(-1),'B');
});
test('pause during a gap retains remaining delay',()=>{
 const s=setup();s.engine.start([{text:'A'}],config);s.end();s.tick(400);s.engine.pause();s.tick(5000);assert.equal(s.spoken.length,1);s.engine.resume();s.tick(599);assert.equal(s.spoken.length,1);s.tick(1);assert.equal(s.spoken.length,2);
});
test('stop cancels queued playback and ignores a late audio callback',()=>{
 const s=setup();s.engine.start([{text:'A'}],config);const late=s.callback();s.engine.stop();late();s.tick(100000);assert.equal(s.spoken.length,1);assert.equal(s.engine.status,'stopped');
});
test('skip retains automatic mode and skips remaining repetitions',()=>{
 const s=setup();s.engine.start([{text:'A'},{text:'B'}],config);const late=s.callback();s.engine.skip();late();assert.deepEqual(s.spoken,['A','B']);assert.equal(s.engine.repetition,1);assert.equal(s.engine.status,'speaking');
});
test('pause during speech replays current repetition without losing sequence',()=>{
 const s=setup();s.engine.start([{text:'A'}],{...config,rounds:1});s.engine.pause();s.engine.resume();s.end();s.tick(1000);s.end();assert.deepEqual(s.spoken,['A','A','A']);assert.equal(s.engine.status,'completed');
});
