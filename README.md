# Sono

A JavaScript library for working with audio

<http://prototypes.stinkdigital.com/webaudio/sono/examples/>

## Features

* Full audio management including loading, playback, effects and processing
* Abstracts differences across browsers such as file types and Web Audio support
* Web Audio effects such as 3d positioning, reverb and frequency analysis
* Handles inputs from audio files, media elements, microphone, oscillators and scripts
* Falls back to HTMLAudioElement where Web Audio is not supported (e.g. IE 11 and less)
* Pauses and resumes audio playback on page visibility changes
* Handles initial touch to unlock media playback on mobile devices

## Installation

* npm: ```npm install sono --save-dev```
* bower: ```bower install sono --save-dev```

## Usage

### Adding sounds to Sono

New sounds are created through the `createSound` method.

If you pass in an array of URLs, Sono will use the first one that matches the browser's capabilities:

```javascript
var sound = Sono.createSound(['audio/foo.ogg', 'audio/foo.mp3']);
```

You can pass a configuration object:

```javascript
var sound = Sono.createSound({
    id: 'foo',
    url: ['audio/foo.ogg', 'audio/foo.mp3'],
    volume: 0.5,
    loop: true
});
```

You can also supply media elements from the DOM:

```javascript
var audioEl = document.querySelector('audio');
var audioElSound = Sono.createSound(audioEl);

var videoEl = document.querySelector('video');
var videoElSound = Sono.createSound(videoEl);
```

[Further examples, covering all valid sound sources](docs/Sono.md#createsound)


### Loading sounds

You can load sounds and specify callbacks for completion and progress:

```javascript
var sound = Sono.load({
    id: 'foo',
    loop: true,
    volume: 0.2,
    url: ['audio/foo.ogg', 'audio/foo.mp3'],
    onComplete: function(sound) {
        // do something
    },
    onProgress: function(progress) {
        // update progress
    }
});

var sounds = Sono.load({
    url: [
        { id: 'a', url: ['audio/foo.ogg', 'audio/foo.mp3'] },
        { id: 'b', url: ['audio/bar.ogg', 'audio/bar.mp3'], loop: true, volume: 0.5 }
    ],
    onComplete: function(sounds) {
        // retrieve sound instances from array or by id
    },
    onProgress: function(progress) {
        // update progress bar
    }
});
```

[Further examples](docs/Sono.md#load)


### Adding effects

Effect and processing nodes can be chained to individual sounds or to the overall mix, via Sono.effect or sound.effect.

Sono extends native Web Audio nodes to add capabilities and make them easy to work with.

For example, apply a reverb effect to all sounds:

```javascript
var reverb = Sono.effect.reverb(2, 0.5);
// change the time and decay
reverb.update(2, 0.5);
```

Or apply an echo effect to a specific sound:

```javascript
var sound = Sono.createSound(['audio/foo.ogg', 'audio/foo.mp3']);
var echo = sound.effect.echo(0.8, 0.5);
// change the delay time and feedback amount:
echo.delay = 0.5;
echo.feedback = 0.9;
```

[Further examples and full list of effects](docs/Sono.md#effects)


### Utils

Get a sound's waveform as a canvas element

```javascript
var wave = Sono.utils.waveform();
var canvas = wave.draw({
    sound: sound,
    width: 200,
    height: 100,
    color: '#333333',
    bgColor: '#DDDDDD'
});
```

Crossfade two sounds

```javascript
Sono.utils.crossFade(soundA, soundB, 1);
```

Convert currentTime seconds into time code string

```javascript
var timeCode = Sono.utils.timeCode(217.8); // '03:37'
```

[Further examples and full list of utils](docs/Sono.md#utils)


## Dev setup

To install dependencies:

```
$ npm install
```

To run tests:

```
$ npm install -g karma-cli
$ karma start
```
