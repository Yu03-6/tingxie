"""Rebuild the browser catalog from imported, reviewed book JSON files."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSIONS = [
    ('chinese', 'unified', '统编版语文', '按每册所标版次选择'),
    ('english', 'pep', '人教版·PEP（三年级起点）', '三、四年级为修订本；五、六年级为2013审定本'),
    ('english', 'newpath', '川教版·新路径英语（三年级起点）', '按每册版权页所标版次选择'),
    ('english', 'newstandard', '外研版·新标准英语（三年级起点）', '按每册版权页所标版次选择'),
    ('english', 'primary', '人教版·新起点英语（一年级起点）', '按每册版权页所标版次选择'),
    ('english', 'newstandard-primary', '外研版·新标准英语（一年级起点）', '按每册版权页所标版次选择'),
]
PREFIXES = {'unified-zh-': 'unified', 'pep-en-': 'pep', 'sichuan-en-': 'newpath', 'fltrp-three-en-': 'newstandard', 'pep-one-en-': 'primary', 'fltrp-one-en-': 'newstandard-primary'}
books = [json.loads(path.read_text()) for path in sorted((ROOT / 'data/books').glob('*.json'))]
audio = {(b['language'], item['text'].lower()): item['audio'] for b in books for unit in b['units'] for item in unit['items'] if item.get('audio') and (ROOT / item['audio']).is_file()}
catalog = {'chinese': {'name': '语文', 'icon': '文', 'versions': []}, 'english': {'name': '英语', 'icon': 'A', 'versions': []}}
for b in books:
    b['versionId'] = b.get('versionId') or next(v for prefix, v in PREFIXES.items() if b['sourceId'].startswith(prefix))
    for unit in b['units']:
        for item in unit['items']:
            matched = audio.get((b['language'], item['text'].lower()))
            if matched: item['audio'] = matched
    b['counts'] = {kind: sum(x['kind'] == kind for u in b['units'] for x in u['items']) for kind in ('words', 'writing', 'recognition')}
    b['counts']['recognitionNew'] = sum(x['kind'] == 'recognition' and not x.get('review') for u in b['units'] for x in u['items'])
    b['counts']['recorded'] = sum(bool(x.get('audio')) for u in b['units'] for x in u['items'])
    (ROOT / 'data/books' / (b['sourceId'] + '.json')).write_text(json.dumps(b, ensure_ascii=False, indent=2) + '\n')
for subject, vid, name, note in VERSIONS:
    grades = sorted((b for b in books if b['versionId'] == vid), key=lambda b: (int(b['id'].split('-')[0][1:]), 0 if 'upper' in b['id'] else 1))
    catalog[subject]['versions'].append({'id': vid, 'name': name, 'note': note, 'grades': grades})
(ROOT / 'data/catalog.js').write_text('window.CATALOG = ' + json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(json.dumps({v['name']: {'books': len(v['grades']), 'entries': sum(len(u['items']) for b in v['grades'] for u in b['units'])} for s in catalog.values() for v in s['versions']}, ensure_ascii=False, indent=2))
