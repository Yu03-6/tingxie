# Tingxie

A static Chinese and English dictation tool, published through GitHub Pages from `main`.

## Run and validate

```sh
python3 -m http.server 8768 --bind 127.0.0.1
python3 scripts/build_catalog.py
node --test tests/*.test.cjs
```

`data/books/*.json` is the editable source of truth. The catalog builder embeds these books in `data/catalog.js`, computes counts and reuses existing audio only when language and text match. Each book carries its own edition, source URL and PDF page references. School adoption and current-edition availability must not be inferred from series coverage. Older textbook mirrors are explicitly labelled.

## Playback

Recorded MP3 files take priority. Other text uses browser speech synthesis, with a local speech fallback on failure or if speech does not start. Android WeChat selects local synthesis automatically; users can also select compatibility speech in dictation settings. Local synthesis runs in an independent worker and returns WAV audio for an unlocked Web Audio context. Mandarin input is converted to numbered pinyin. Only Mandarin and US English local voices are included, so compatibility English uses US pronunciation even for books labelled en-GB. The compatibility voice is mechanical; single-character polyphones need their textbook context.

The page must stay in the foreground. Desktop browser verification does not establish behavior on a physical Android or iOS WeChat device.

## Third-party components

See [third-party notices](assets/vendor/NOTICE.md) and the component license files. Existing textbook audio and generated local speech are synthetic, not publisher recordings.
