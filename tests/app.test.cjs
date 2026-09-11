const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createApp(savedText = '', storageAvailable = true) {
  let html = '';
  let checkboxes = [];
  let nodes = {};
  const storage = new Map([['tingxie-custom', savedText]]);
  const app = {
    set innerHTML(value) {
      html = value;
      nodes = {};
      for (const match of value.matchAll(/<(?:textarea|select|input|form|p)\b[^>]*\bid="([^"]+)"[^>]*>/g)) {
        nodes[match[1]] = { value: '', textContent: '' };
      }
      const textarea = value.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/);
      if (textarea) nodes.customText.value = textarea[1].replace(/&(amp|lt|gt|quot|#39);/g, (_, entity) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[entity]));
      checkboxes = [...value.matchAll(/<input\b[^>]*data-i="(\d+)"([^>]*)>/g)].map(match => ({ dataset: { i: match[1] }, checked: /\bchecked\b/.test(match[2]) }));
    },
  };
  const context = vm.createContext({
    CATALOG: { english: { versions: [{ id: 'pep', name: 'PEP', grades: [{ id: 'g3-upper', name: 'Grade 3', language: 'en-US', edition: '2026', units: [
      { id: 'u1', name: 'Unit 1', items: [{ text: 'one', kind: 'words' }, { text: 'two', kind: 'words' }, { text: 'A', kind: 'writing' }] },
      { id: 'u2', name: 'Unit 2', items: [{ text: 'three', kind: 'words' }, { text: 'four', kind: 'words' }] },
    ] }] }] } },
    DictationEngine: class { stop() {} },
    SpeechTransport: class {},
    document: {
      querySelector: selector => selector === '#app' ? app : nodes[selector.slice(1)],
      querySelectorAll: selector => selector === '[data-i]:checked' ? checkboxes.filter(input => input.checked) : checkboxes,
      getElementById: id => id === 'themeToggle' ? {} : nodes[id],
    },
    window: { addEventListener() {} },
    location: { hash: '' },
    localStorage: {
      getItem(key) { if (!storageAvailable) throw new Error('Storage unavailable'); return storage.get(key); },
      setItem(key, value) { if (!storageAvailable) throw new Error('Storage unavailable'); storage.set(key, value); },
    },
    alert() {},
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/app.js'), 'utf8'), context);
  return {
    run: source => vm.runInContext(source, context),
    route(name) { context.location.hash = `#${name}`; vm.runInContext('render()', context); },
    input(id, value, event = 'oninput') { nodes[id].value = value; nodes[id][event]({ target: nodes[id] }); },
    check(index, value) { checkboxes[index].checked = value; checkboxes[index].onchange(); },
    value: id => nodes[id].value,
    selected: () => checkboxes.filter(input => input.checked).map(input => Number(input.dataset.i)),
    items: () => JSON.parse(vm.runInContext('JSON.stringify(state.items.map(item=>item.text))', context)),
    html: () => html,
  };
}

test('cleared custom draft stays empty when returning, while saved text loads initially', () => {
  const app = createApp('saved word');
  app.route('custom');
  assert.equal(app.value('customText'), 'saved word');
  app.run('clearCustom()');
  app.route('home');
  app.route('custom');
  assert.equal(app.value('customText'), '');
  app.run('saveCustom()');
  app.route('home');
  app.route('custom');
  assert.equal(app.value('customText'), '');
});

test('custom text and language options survive navigation before submitting', () => {
  const app = createApp();
  app.route('custom');
  app.input('customText', 'hello\nworld');
  app.input('customLang', 'en-US', 'onchange');
  app.input('voiceMode', 'local', 'onchange');
  app.route('home');
  app.route('custom');
  assert.equal(app.value('customText'), 'hello\nworld');
  assert.equal(app.value('customLang'), 'en-US');
  assert.equal(app.value('voiceMode'), 'local');
  app.run('useCustom()');
  assert.deepEqual(app.items(), ['hello', 'world']);
});

test('custom editing remains usable when local storage is unavailable', () => {
  const app = createApp('', false);
  app.route('custom');
  app.input('customText', 'hello');
  app.run('saveCustom()');
  app.route('home');
  app.route('custom');
  assert.equal(app.value('customText'), 'hello');
  app.run('useCustom()');
  assert.deepEqual(app.items(), ['hello']);
});

test('textbook exclusions survive returning from settings and switching content kinds', () => {
  const app = createApp();
  app.route('content');
  app.check(1, false);
  app.run('prepareSettings()');
  assert.deepEqual(app.items(), ['one']);
  app.route('content');
  assert.deepEqual(app.selected(), [0]);
  app.run("state.kind='writing';content()");
  assert.deepEqual(app.selected(), [0]);
  app.run("state.kind='words';content();prepareSettings()");
  assert.deepEqual(app.items(), ['one']);
});

test('select-all actions persist and unit choices remain independent', () => {
  const app = createApp();
  app.route('content');
  app.run('toggleAll(false)');
  app.run("state.unit='u2';content()");
  assert.deepEqual(app.selected(), [0, 1]);
  app.run("state.unit='u1';content()");
  assert.deepEqual(app.selected(), []);
  app.run('toggleAll(true)');
  app.route('home');
  app.route('content');
  assert.deepEqual(app.selected(), [0, 1]);
});

test('unknown routes including inherited object properties render the home page', () => {
  const app = createApp();
  for (const route of ['missing', '__proto__', 'constructor', 'toString']) {
    app.route('custom');
    assert.doesNotThrow(() => app.route(route));
    assert.match(app.html(), /class="hero"/);
  }
});
