# sono

[![NPM version](https://badge.fury.io/js/sono.svg)](http://badge.fury.io/js/sono) [![Build Status](https://travis-ci.org/Stinkdigital/sono.svg?branch=master)](https://travis-ci.org/Stinkdigital/sono)

A library for making stuff with Web Audio

<http://stinkdigital.github.io/sono/>

## Features

* Full audio management including loading, playback, effects and processing
* Abstracts differences across browsers such as file types and Web Audio support
* Web Audio effects such as 3d positioning, reverb and frequency analysis
* Handles inputs from audio files, media elements, microphone, oscillators and scripts
* Falls back to HTMLAudioElement where Web Audio is not supported (e.g. IE 11 and less)
* Pauses and resumes audio playback on page visibility changes
* Handles initial touch to unlock media playback on mobile devices

## Installation

```
npm install sono --save
```

## Usage

### Adding sounds to sono

New sounds are created through the `createSound` method.

If you pass in an array of URLs, sono will use the first one that matches the browser's capabilities:

```javascript
var sound = sono.createSound(['audio/foo.ogg', 'audio/foo.mp3']);
```

You can pass a configuration object:

```javascript
var sound = sono.createSound({
    id: 'foo',
    src: ['audio/foo.ogg', 'audio/foo.mp3'],
    volume: 0.5,
    loop: true
});
```

You can also supply media elements from the DOM (watch out for patchy browser support!):

```javascript
var videoEl = document.querySelector('video');
var videoElSound = sono.createSound(videoEl);
```

[Further examples, covering all valid sound sources](docs/sono.md#createsound)


### Adding effects

Effect and processing nodes can be chained to individual sounds or to the overall mix, via sono.effect or sound.effect.

sono extends native Web Audio nodes to add capabilities and make them easy to work with.

For example, apply a reverb effect to all sounds:

```javascript
var reverb = sono.effect.reverb({
  time: 1,
  decay: 5
});
// change time, decay and reverse the reverb
reverb.time = 2;
reverb.decay = 6;
reverb.reverse = true;
```

Or apply an echo effect to a specific sound:

```javascript
var sound = sono.createSound(['audio/foo.ogg', 'audio/foo.mp3']);
var echo = sound.effect.echo({
  delay: 0.8,
  feedback: 0.5
});
// change the delay time and feedback amount:
echo.delay = 0.5;
echo.feedback = 0.9;
```

[Further examples and full list of effects](docs/sono.md#effects)


### Further documentation

[sound object api](docs/sono.md#sound)

[loading sounds](docs/sono.md#load)

[utils](docs/sono.md#utils)


## Dev setup

Install dependencies:

```
$ npm install
```

Run tests:

```
$ npm install -g karma-cli
$ npm test
```

Build bundles:

```
$ npm run build
```

Watch and continuous tests:

```
$ npm start
```
