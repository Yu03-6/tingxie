const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DictationEngine } = require('../assets/dictation.js');
function setup() {
  let now=0,id=0,stops=0;const tasks=new Map(), spoken=[],rates=[];let end,fail;
  const transport={stop(){stops++;},play(item,rate,done,error){spoken.push(item.text);rates.push(rate);end=done;fail=error;}};
  const engine=new DictationEngine(transport,()=>{},{now:()=>now,set:(fn,ms)=>{tasks.set(++id,{fn,at:now+ms});return id;},clear:id=>tasks.delete(id)});
  const tick=ms=>{const target=now+ms;for(;;){const due=[...tasks].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;tasks.delete(due[0]);due[1].fn();}now=target;};
  return {engine,spoken,rates,tasks,tick,end:()=>end(),callback:()=>end,errorCallback:()=>fail,stops:()=>stops};
}
const config={repeat:2,repeatGap:1,itemGap:3,rounds:2,rate:1};
test('two words, two repeats, two rounds play exactly eight utterances',()=>{
 const s=setup();s.engine.start([{text:'apple'},{text:'banana'}],config);
 for(let i=0;i<8;i++){s.end();s.tick(3000);}
 assert.deepEqual(s.spoken,['apple','apple','banana','banana','apple','apple','banana','banana']);
 assert.equal(s.engine.status,'completed');assert.equal(s.tasks.size,0);
});
test('seek backward replays the selected word and completes the remaining sequence',()=>{
 const s=setup();s.engine.start([{text:'A'},{text:'B'},{text:'C'}],{...config,repeat:1,rounds:1,itemGap:0});
 s.end();s.tick(0);s.end();s.tick(0);s.engine.seek(1);
 assert.deepEqual(s.spoken,['A','B','C','B']);
 s.end();s.tick(0);s.end();
 assert.deepEqual(s.spoken,['A','B','C','B','C']);assert.equal(s.engine.status,'completed');
});
test('rapid seeks stop transport and ignore obsolete success and error callbacks',()=>{
 const s=setup();s.engine.start([{text:'A'},{text:'B'},{text:'C'}],config);
 const firstDone=s.callback(),firstError=s.errorCallback(),before=s.stops();s.engine.seek(2);
 const secondDone=s.callback(),secondError=s.errorCallback();s.engine.seek(1);
 firstDone();firstError('late failure');secondDone();secondError('another late failure');s.tick(10000);
 assert.deepEqual(s.spoken,['A','C','B']);assert.equal(s.engine.index,1);assert.equal(s.engine.status,'speaking');
 assert.equal(s.engine.snapshot().spokenCount,0);assert.equal(s.tasks.size,0);assert.equal(s.stops(),before+2);
});
test('seek during a gap cancels its timer and begins immediately',()=>{
 const s=setup();s.engine.start([{text:'A'},{text:'B'}],config);s.end();s.tick(400);
 assert.equal(s.engine.status,'waiting');s.engine.seek(1);
 assert.deepEqual(s.spoken,['A','B']);assert.equal(s.tasks.size,0);s.tick(10000);
 assert.deepEqual(s.spoken,['A','B']);assert.equal(s.engine.status,'speaking');
});
test('seek resets repetitions while preserving round, rate, and configured gaps',()=>{
 const s=setup(),settings={...config,rate:0.8};s.engine.start([{text:'A'},{text:'B'}],settings);
 for(let i=0;i<4;i++){s.end();s.tick(3000);}
 assert.equal(s.engine.round,2);s.end();s.tick(1000);assert.equal(s.engine.repetition,2);
 s.engine.seek(0);assert.equal(s.engine.repetition,1);assert.equal(s.engine.round,2);
 const count=s.spoken.length;s.end();s.tick(999);assert.equal(s.spoken.length,count);s.tick(1);
 assert.equal(s.spoken.at(-1),'A');s.end();s.tick(2999);assert.equal(s.spoken.length,count+1);s.tick(1);
 assert.equal(s.spoken.at(-1),'B');s.end();s.tick(1000);s.end();
 assert.equal(s.engine.status,'completed');assert.ok(s.rates.every(rate=>rate===0.8));
});
test('seek resumes immediately from paused speech, paused gaps, error, and completion',()=>{
 for(const state of ['speech','gap','error','completed']){
  const s=setup();s.engine.start([{text:'A'},{text:'B'}],{...config,repeat:1,rounds:1});
  if(state==='speech')s.engine.pause();
  if(state==='gap'){s.end();s.tick(500);s.engine.pause();}
  if(state==='error')s.errorCallback()('Playback failed');
  if(state==='completed'){s.end();s.tick(3000);s.end();}
  const count=s.spoken.length;s.engine.seek(0);
  assert.equal(s.engine.status,'speaking',state);assert.equal(s.spoken.length,count+1,state);
  assert.equal(s.spoken.at(-1),'A',state);assert.equal(s.engine.snapshot().message,'',state);
  s.tick(10000);assert.equal(s.spoken.length,count+1,state);
 }
});
test('invalid seek indices and idle or stopped sessions leave playback unchanged',()=>{
 const s=setup();s.engine.seek(0);assert.equal(s.engine.status,'idle');assert.equal(s.stops(),0);
 s.engine.start([{text:'A'},{text:'B'}],config);s.end();
 const before=s.engine.snapshot(),stops=s.stops(),timer=s.engine.timer;
 for(const index of [-1,2,0.5,NaN,Infinity,'1',null,undefined])s.engine.seek(index);
 assert.deepEqual(s.engine.snapshot(),before);assert.equal(s.stops(),stops);assert.equal(s.engine.timer,timer);
 s.tick(1000);assert.deepEqual(s.spoken,['A','A']);s.engine.stop();const stopped=s.stops();s.engine.seek(1);
 assert.equal(s.engine.status,'stopped');assert.equal(s.stops(),stopped);assert.deepEqual(s.spoken,['A','A']);
 s.engine.start([],config);s.engine.seek(0);assert.equal(s.engine.status,'idle');
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
test('completion counts actual finished readings and skipped entries',()=>{
 const s=setup();s.engine.start([{text:'A'},{text:'B'},{text:'C'}],{...config,repeat:3,rounds:1,itemGap:0});
 const late=s.callback();s.engine.pause();s.engine.skip();late();s.engine.resume();
 for(let i=0;i<6;i++){s.end();s.tick(1000);}
 assert.equal(s.engine.status,'completed');
 assert.equal(s.engine.snapshot().spokenCount,6);assert.equal(s.engine.snapshot().skippedCount,1);
 s.engine.start([{text:'D'}],{...config,repeat:1,rounds:1});s.end();
 assert.equal(s.engine.snapshot().spokenCount,1);assert.equal(s.engine.snapshot().skippedCount,0);
});
