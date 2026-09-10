# meSpeak source distribution

This directory accompanies the unmodified meSpeak 2.0.7 worker and voice files distributed by this application. The worker and these upstream files retain their original GPL terms. This notice does not change the application code's license.

## Files and provenance

- [mespeak-2.0.7.zip](mespeak-2.0.7.zip): the complete, unmodified [official 2.0.7 distribution](https://www.masswerk.at/mespeak/mespeak.zip?v=2.0.7), dated 2020-04-23. It includes all upstream source files, voice dictionaries, documentation and license notices.
- [mespeak-core.full.js](mespeak-core.full.js): the unminified core from `mespeak/src/` in that distribution; its header identifies version 2.0.7. The deployed `../mespeak-core.js` was compared byte for byte with the core in the official archive and matches it.
- [mespeak.full.js](mespeak.full.js): the original unminified front end, supplied for reference. This application uses its own independent worker client rather than loading that front end.
- [mespeak__standard_config.json](mespeak__standard_config.json): the upstream standard data configuration.
- [UPSTREAM-LICENSE.txt](UPSTREAM-LICENSE.txt): the original meSpeak/eSpeak license notice and GPL version 3 text.
- [speak.js-9c6f642f7d78bab51d16b2e8b79cdf205643ec35.zip](speak.js-9c6f642f7d78bab51d16b2e8b79cdf205643ec35.zip): the complete [speak.js source at commit 9c6f642f7d78bab51d16b2e8b79cdf205643ec35](https://github.com/kripken/speak.js/tree/9c6f642f7d78bab51d16b2e8b79cdf205643ec35). It contains the eSpeak C++ source, headers, data, Makefiles, Emscripten scripts, authors and GPL license. The archive's Git commit comment identifies this revision.

## Build information

The upstream [speak.js build instructions](speak.js-README.md), [native eSpeak build instructions](eSpeak-BUILD.txt) and [Emscripten build script](emscripten.sh) are also available separately. The build script must be run from the extracted archive's `src/` directory with the Emscripten path set to the installed legacy toolchain. It uses `emmake`, `emcc`, `bundle.py`, `shell_pre.js` and `shell_post.js`; those project files are included in the archive.

The eSpeak version string in both the meSpeak core and the included C++ `src/synthdata.cpp` is `1.45.04  25.Apr.11`. The JavaScript modifications specific to meSpeak 2.0.7 are provided in the official unminified source above. Upstream does not include a pinned compiler/minifier toolchain or a single build recipe that reproduces the final meSpeak 2.0.7 bundle from C++. No byte-identical rebuild is claimed here.

Official documentation: https://www.masswerk.at/mespeak/
