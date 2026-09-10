# Third-party speech components

- meSpeak core 2.0.7, Norbert Landsteiner / mass:werk, based on eSpeak and speak.js. GPL-3.0; see [the license](mespeak/LICENSE). The unmodified core runs as a separate Web Worker and communicates through its job/WAV message protocol. The [source distribution and build information](mespeak/source/README.md) include the [official 2.0.7 archive](mespeak/source/mespeak-2.0.7.zip), [unminified core](mespeak/source/mespeak-core.full.js), and [eSpeak C++ / speak.js source with build scripts](mespeak/source/speak.js-9c6f642f7d78bab51d16b2e8b79cdf205643ec35.zip). Upstream: https://www.masswerk.at/mespeak/ .
- pinyin-pro 3.29.3, MIT; see [the license](pinyin-pro/LICENSE). Source: https://github.com/zh-lx/pinyin-pro . Distribution: https://registry.npmjs.org/pinyin-pro/-/pinyin-pro-3.29.3.tgz .

Only the Mandarin and US English voice dictionaries are included. Generated speech is synthetic and is not a publisher recording. Text is processed on the user's device.
