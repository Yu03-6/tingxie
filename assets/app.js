const app = document.querySelector('#app');
const state = { subject: 'english', version: 'pep', grade: 'g3-upper', unit: 'u1', kind: 'words', items: [], origin: 'custom', customText: '', customLang: 'auto', hidden: false, repeat: 2, repeatGap: 1, itemGap: 3, rounds: 1, rate: 0.9 };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kindNames = { words: '词语 / 单词', writing: '写字表', recognition: '识字表' };
const audioIndex = new Map();
for (const subject of Object.values(CATALOG)) for (const version of subject.versions) for (const book of version.grades) for (const unit of book.units) for (const item of unit.items) audioIndex.set(`${book.language}:${item.text.toLowerCase()}`, item.audio);
const engine = new DictationEngine(new SpeechTransport(), () => { if (location.hash === '#player') player(); });
function page() { return location.hash.slice(1) || 'home'; }
function go(name) { if (page() === 'player' && name !== 'player') engine.stop(); if (page() === name) render(); else location.hash = name; }
window.addEventListener('hashchange', () => { if (page() !== 'player' && ['speaking','waiting','paused'].includes(engine.status)) engine.stop(); render(); });
function find() {
  const sub = CATALOG[state.subject] || CATALOG.english;
  const v = sub.versions.find(x => x.id === state.version) || sub.versions[0]; state.version = v.id;
  const g = v.grades.find(x => x.id === state.grade) || v.grades[0]; if (g) state.grade = g.id;
  const u = g?.units.find(x => x.id === state.unit) || g?.units[0]; if (u) state.unit = u.id;
  return { sub, v, g, u };
}
function layout(body) { app.innerHTML = body; }
function render() { ({ home, textbook, content, custom, settings, player }[page()] || home)(); }
function home() {
  layout(`<section class="hero"><div><div class="eyebrow">打开即用 · 无需账号</div><h1>让每一次听写，<br>都清晰有节奏。</h1><p>输入词语，或选择已核对的教材词表。设置重复和间隔后，系统自动完成整组听写。</p><div class="actions"><button class="btn" onclick="go('custom')">自定义内容</button><button class="btn secondary" onclick="go('textbook')">选择教材</button></div></div><div class="card hero-card"><div><div class="eyebrow" style="color:#dfe3ff">教材词库</div><h2>按册次、单元练习</h2><p>PEP 英语三至六年级上下册；语文三上及六年级上下册附表。每册独立标注版次。</p></div><button class="btn" onclick="go('textbook')">查看教材　→</button></div></section><section class="section"><div class="feature-grid"><div class="feature"><strong>1. 选择内容</strong><span class="muted">按教材单元选择，或输入自己的词语。</span></div><div class="feature"><strong>2. 设置节奏</strong><span class="muted">重复间隔和换词间隔分别设置。</span></div><div class="feature"><strong>3. 自动听写</strong><span class="muted">已配音词条使用 MP3，不依赖系统语音。</span></div></div></section>`);
}
function textbook() {
  const { sub, v, g } = find();
  const count = g?.units.reduce((n, u) => n + u.items.length, 0) || 0;
  layout(`<div class="crumb"><a href="#home">首页</a> / 教材</div><div class="card"><h2>选择教材内容</h2><p class="muted">按手中教材的版次和目录选择。版本在成都的具体学校使用情况仍需以学校为准。</p><div class="form-grid"><div class="field"><label for="subject">学科</label><select class="select" id="subject">${Object.entries(CATALOG).map(([key,s]) => `<option value="${key}" ${state.subject===key?'selected':''}>${s.name}</option>`).join('')}</select></div><div class="field"><label for="version">教材版本</label><select class="select" id="version">${sub.versions.map(x=>`<option value="${x.id}" ${v.id===x.id?'selected':''}>${x.name}</option>`).join('')}</select></div><div class="field"><label for="grade">年级与册次</label><select class="select" id="grade" ${g?'':'disabled'}>${g?v.grades.map(x=>`<option value="${x.id}" ${g.id===x.id?'selected':''}>${x.name} · ${x.edition}</option>`).join(''):'<option>尚未完成词表核对</option>'}</select></div></div>${g?`<p class="muted">${esc(g.name)} · ${esc(g.edition)} · ${count} 个条目 · 已配音</p><div class="unit-grid">${g.units.map(u=>`<button class="unit" onclick="chooseUnit('${u.id}')"><strong>${esc(u.name)}</strong><small>${u.items.length} 个条目　→</small></button>`).join('')}</div><details class="source-note"><summary>教材来源与核对范围</summary><p>来源：<a href="${esc(g.source.url)}" target="_blank" rel="noopener">${esc(g.name)} PDF</a>。词表按附录和目录整理，页码均指 PDF 页码。音频是系统合成朗读，并非出版社配套录音。</p><p>${g.language==='zh-CN'?`Words: ${g.counts.words}; writing: ${g.counts.writing}; new recognition: ${g.counts.recognitionNew}; review: ${g.counts.recognition-g.counts.recognitionNew}. ${g.counts.recognition?'':'This volume has no separate recognition appendix.'}`:'含单元词汇表中的单词和短语；四年级下册的数词附录单独列出。音标和释义尚未逐项校对，因此暂不展示。'}</p></details>`:`<div class="empty">${esc(v.note)}。此版本尚无可用单元。</div>`}</div>`);
  document.querySelector('#subject').onchange=e=>{state.subject=e.target.value;state.version=CATALOG[state.subject].versions[0].id;state.grade='';textbook();};
  document.querySelector('#version').onchange=e=>{state.version=e.target.value;state.grade='';textbook();};
  document.querySelector('#grade').onchange=e=>{state.grade=e.target.value;textbook();};
}
function chooseUnit(id) { state.unit=id; state.origin='textbook'; state.kind='words'; go('content'); }
function content() {
  const {v,g,u}=find(); if(!u) return textbook();
  const kinds=[...new Set(u.items.map(x=>x.kind))]; if(!kinds.includes(state.kind))state.kind=kinds[0];
  const items=u.items.filter(x=>x.kind===state.kind);
  layout(`<div class="crumb"><a href="#textbook">教材选择</a> / ${esc(g.name)} / ${esc(u.name)}</div><div class="card"><h2>选择听写内容</h2><div class="actions">${kinds.map(k=>`<button class="btn ${k===state.kind?'':'secondary'}" onclick="state.kind='${k}';content()">${kindNames[k]} · ${u.items.filter(x=>x.kind===k).length}</button>`).join('')}</div><p class="muted">${esc(v.name)} · ${esc(g.edition)}。${state.kind==='recognition'?'多音字复习项不计入新识字总数；单字读音需结合课文。':'可取消勾选本次不练习的条目。'}</p><div class="actions"><button class="btn secondary" onclick="toggleAll(true)">全选</button><button class="btn ghost" onclick="toggleAll(false)">取消全选</button></div><div class="list">${items.map((x,i)=>`<label class="item"><input type="checkbox" data-i="${i}" checked><span class="item-text">${esc(x.text)}</span><span class="item-sub">${x.review?'多音字复习 · ':''}PDF 第 ${x.pdfPage} 页${x.lessonPage?` · Lesson ${x.lesson}, p. ${x.lessonPage}`:''}</span></label>`).join('')}</div><button class="btn" onclick="prepareSettings()">下一步：设置听写　→</button></div>`);
}
function toggleAll(value) { document.querySelectorAll('[data-i]').forEach(x=>x.checked=value); }
function prepareSettings() {
  const {g,u}=find();const items=u.items.filter(x=>x.kind===state.kind);
  state.items=[...document.querySelectorAll('[data-i]:checked')].map(x=>({...items[Number(x.dataset.i)],language:g.language}));
  if(!state.items.length)return alert('请至少选择一项');state.origin='textbook';go('settings');
}
function parseCustom(text) { return text.split(/[\n,，、;；]+/u).map(s=>s.trim()).filter(Boolean); }
function custom() {
  let saved=state.customText; if(!saved)try{saved=localStorage.getItem('tingxie-custom')||'';}catch{}
  layout(`<div class="crumb"><a href="#home">首页</a> / 自定义</div><div class="card"><h2>输入你想听写的内容</h2><p class="muted">一行一项，也可用逗号、顿号或分号分隔。匹配词库的词会使用已配音音频，其余内容使用设备系统语音。</p><textarea id="customText" rows="10" aria-label="听写内容">${esc(saved)}</textarea><div class="field" style="margin-top:16px"><label for="customLang">朗读语言</label><select class="select" id="customLang"><option value="auto">自动识别</option><option value="en-US">英文</option><option value="zh-CN">中文</option></select></div><p class="muted" id="customCount"></p><div class="actions"><button class="btn" onclick="useCustom()">继续设置</button><button class="btn secondary" onclick="saveCustom()">保存到本机</button><button class="btn ghost" onclick="clearCustom()">清空</button></div></div>`);
  document.querySelector('#customLang').value=state.customLang;
  document.querySelector('#customText').oninput=()=>{state.customText=document.querySelector('#customText').value;document.querySelector('#customCount').textContent=`共 ${parseCustom(state.customText).length} 项`;};document.querySelector('#customText').oninput();
}
function saveCustom(){try{localStorage.setItem('tingxie-custom',document.querySelector('#customText').value);alert('已保存到本机');}catch{alert('浏览器未允许本地保存，仍可直接播放。');}}
function clearCustom(){state.customText='';document.querySelector('#customText').value='';document.querySelector('#customText').oninput();}
function useCustom(){
  const text=document.querySelector('#customText').value;const items=parseCustom(text);if(!items.length)return alert('请先输入内容');
  state.customText=text;state.customLang=document.querySelector('#customLang').value;
  state.items=items.map(text=>{const language=state.customLang==='auto'?(/[\u3400-\u9fff]/u.test(text)?'zh-CN':'en-US'):state.customLang;return {text,language,audio:audioIndex.get(`${language}:${text.toLowerCase()}`)};});
  state.origin='custom';go('settings');
}
function settings(){
  if(!state.items.length)return custom();const audioCount=state.items.filter(x=>x.audio).length;
  layout(`<div class="crumb"><a href="#${state.origin==='custom'?'custom':'content'}">返回内容</a> / 听写设置</div><div class="card"><h2>定制听写节奏</h2><p class="muted">${state.items.length} 项内容，${audioCount} 项已配音。${audioCount<state.items.length?'其他词需要设备系统语音支持；Android 微信可能不支持。':''}</p><form id="settingsForm"><div class="settings">${[['repeat','每项重复次数',1,10,1],['repeatGap','重复间隔（秒）',0,60,.5],['itemGap','换词间隔（秒）',0,120,.5],['rounds','总循环次数',1,20,1],['rate','朗读速度',.5,1.5,.1]].map(([key,label,min,max,step])=>`<div class="setting"><label for="${key}">${label}</label><input class="input number" id="${key}" type="number" required min="${min}" max="${max}" step="${step}" value="${state[key]}"></div>`).join('')}</div><div class="actions" style="margin-top:24px"><button class="btn" type="submit">准备开始听写　→</button></div></form></div>`);
  document.querySelector('#settingsForm').onsubmit=e=>{e.preventDefault();for(const key of ['repeat','repeatGap','itemGap','rounds','rate'])state[key]=Number(document.getElementById(key).value);engine.stop();state.hidden=false;go('player');};
}
function startSession(){engine.start(state.items,{repeat:state.repeat,repeatGap:state.repeatGap,itemGap:state.itemGap,rounds:state.rounds,rate:state.rate});}
function player(){
  if(!state.items.length)return custom();const s=engine.snapshot();const item=state.items[s.index]||state.items[0];
  const active=['speaking','waiting'].includes(s.status);const finished=s.status==='completed';
  const label={idle:'准备就绪',stopped:'准备就绪',speaking:'正在朗读',waiting:'间隔中，将自动继续',paused:'已暂停；继续时会重读当前遍',completed:'本次听写已完成',error:s.message}[s.status];
  layout(`<div class="crumb"><a href="#settings">听写设置</a> / 自动听写</div><div class="card player"><div class="eyebrow">第 ${s.round} / ${state.rounds} 轮 · ${s.index+1} / ${state.items.length} 项 · 第 ${s.repetition} / ${state.repeat} 遍</div><div class="now">${state.hidden?'•••':esc(item.text)}</div><p class="muted" role="status">${esc(label)}</p><div class="progress"><span style="width:${finished?100:(s.index/state.items.length)*100}%"></span></div><div class="player-controls">${active?'<button class="btn" onclick="engine.pause()">暂停</button>':s.status==='paused'?'<button class="btn" onclick="engine.resume()">继续</button>':s.status==='error'?'<button class="btn" onclick="engine.retry()">重试当前项</button>':`<button class="btn" onclick="startSession()">${finished?'再听一轮':'开始自动听写'}</button>`}<button class="btn secondary" onclick="state.hidden=!state.hidden;player()">${state.hidden?'显示答案':'隐藏答案'}</button>${active||s.status==='paused'?'<button class="btn ghost" onclick="engine.skip()">跳过当前项</button>':''}<button class="btn ghost" onclick="engine.stop();go('settings')">结束</button></div><p class="muted" style="margin-top:24px">请保持页面在前台。首次播放需要点击开始；已配音内容通过本站音频播放。</p></div>`);
}
document.getElementById('themeToggle').onclick=()=>document.body.classList.toggle('dark');
render();
