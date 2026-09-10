const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const scope = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data/catalog.js'), 'utf8'), scope);
const catalog = scope.window.CATALOG;

test('every requested textbook series has both terms for each grade', () => {
  const expected = { unified: [1, 6], pep: [3, 6], newpath: [3, 6], newstandard: [3, 6], primary: [1, 6], 'newstandard-primary': [1, 6] };
  for (const subject of Object.values(catalog)) for (const version of subject.versions) {
    const [first, last] = expected[version.id];
    assert.equal(version.grades.length, (last - first + 1) * 2, version.id);
    for (let grade = first; grade <= last; grade++) for (const term of ['upper', 'lower']) {
      assert.ok(version.grades.some(book => book.id === `g${grade}-${term}`), `${version.id} g${grade}-${term}`);
    }
  }
});

test('catalog entries retain source pages, unique units and valid audio references', () => {
  for (const subject of Object.values(catalog)) for (const version of subject.versions) for (const book of version.grades) {
    assert.match(book.source.url, /^https:\/\//, book.sourceId);
    assert.ok(book.edition && book.units.length, book.sourceId);
    assert.equal(new Set(book.units.map(unit => unit.id)).size, book.units.length, book.sourceId);
    let total = 0, recorded = 0;
    for (const unit of book.units) {
      assert.ok(unit.items.length, `${book.sourceId} ${unit.id}`);
      for (const item of unit.items) {
        assert.ok(item.text.trim() && Number.isInteger(item.pdfPage) && item.pdfPage > 0, JSON.stringify(item));
        assert.ok(['words', 'writing', 'recognition'].includes(item.kind));
        if (item.audio) { assert.ok(fs.statSync(path.join(root, item.audio)).size > 0); recorded++; }
        total++;
      }
    }
    assert.equal(book.counts.words + book.counts.writing + book.counts.recognition, total);
    assert.equal(book.counts.recorded, recorded);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'data/books', book.sourceId + '.json'))), JSON.parse(JSON.stringify(book)));
  }
});
