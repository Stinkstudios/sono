# Sono

A JavaScript library for working with audio. WebAudio API with fallback to HTMLMediaElement.

<http://prototypes.stinkdigital.com/webaudio/sono/examples/>

## Features

* Full audio management including loading, control, effects and processing
* Abstracts differences across browsers such as file types and Web Audio support
* Web Audio effects such as 3d positioning, reverb and frequency analysis
* Handles inputs from audio files, media elements, microphone, oscillators and scripts
* Falls back to HTMLAudioElement where Web Audio is not supported (e.g. IE 11 and less)
* Pauses and resumes audio playback on page visibility changes
* Handles initial touch to unlock media playback on mobile devices
* Master volume and mute control
* Generates graphical waveform displays for sounds

## Installation

* npm: ```npm install sono --save-dev```
* bower: ```bower install sono --save```

## Usage

### Adding sounds to Sono

New sounds are created through the `createSound` method. If you pass in an array of URLs, Sono will use the first one that matches the browser's capabilities:

```javascript
var sound = Sono.createSound(['audio/foo.ogg', 'audio/foo.mp3']);
```

A sound can be assigned an `id` property which can be used to retrieve it later, without having a reference to the instance:

```javascript
var sound = Sono.createSound(['audio/foo.ogg', 'audio/foo.mp3']);
sound.id = 'foo';

var sound = Sono.createSound({
    id: 'foo',
    url: ['audio/foo.ogg', 'audio/foo.mp3']
});

// somewhere else in your app:
var foo = Sono.getById('foo');
// or
Sono.play('foo');
```

You can also use your own loader and pass in the loaded sound data, or supply media elements from the dom:

```javascript
// media elements:
var audioEl = document.querySelector('audio');
var audioElSound = Sono.createSound(audioEl);

var videoEl = document.querySelector('video');
var videoElSound = Sono.createSound(videoEl);

// xhrResponse (ArrayBuffer) loaded outside of Sono:
var sound;
Sono.context.decodeAudioData(xhrResponse, function(buffer) {
    sound = Sono.createSound(buffer);
});
```

The user's microphone stream can be used as a source:

```javascript
var sound;
var onConnect = function(stream) {
    sound = Sono.createSound(stream);
};
var mic = Sono.utils.microphone(onConnect);
mic.connect();
```

Sound can be generated with oscillators:

```javascript
var sineWave = Sono.createSound('sine');
var squareWave = Sono.createSound('square');
```

Or from custom scripts:

```javascript
var script = Sono.createSound({
    bufferSize: 1024,
    channels: 1,
    callback: function(event) {
        var output = event.outputBuffer.getChannelData(0);
        var l = output.length;
        for (var i = 0; i < l; i++) {
            output[i] = Math.random();
        }
    }
});
```

### Loading sounds

You can load sounds and specify callbacks for completion and progress:

```javascript
var sound = Sono.load(['audio/foo.ogg', 'audio/foo.mp3'], {
    onComplete: function() {

    },
    onProgress: function(progress) {

    }
});
var sound = Sono.load('audio/foo.ogg');
var sound = Sono.load({
    id: 'foo',
    url: ['audio/foo.ogg', 'audio/foo.mp3'],
    loop: true,
    volume: 0.2
});
```

Sono.load also accepts an array of sound config objects. All the sounds will be loaded and can later be accessed through their `id` properties using the `Sono.getById`, `Sono.play`, `Sono.pause` and `Sono.stop` methods:

```javascript
Sono.load([
    { id: 'a', url: ['audio/foo.ogg', 'audio/foo.mp3'] },
    { id: 'b', url: ['audio/bar.ogg', 'audio/bar.mp3'], loop: true, volume: 0.5 }
],
{
    onComplete: function(sounds) {
        // loading complete, sound instances can be retrieved or controlled by id:
        var soundA = Sono.getById('a');
        Sono.play('b');
    },
    onProgress: function(progress) {
        // update progress bar
    }
});
```

### Adding effects

Effect and processing nodes can be chained to individual sounds or to the overall mix, via Sono.node or sound.node.

Sono extends native Web Audio nodes to add capabilities and make them easy to work with.

For example, apply a reverb effect to all sounds:

```javascript
var reverb = Sono.node.reverb(2, 0.5);
// change the time and decay
reverb.update(2, 0.5);
```

Or apply a reverb effect to a specific sound:

```javascript
var sound = Sono.createSound(['audio/foo.ogg', 'audio/foo.mp3']);
var reverb = sound.node.reverb(2, 0.5);
```

Pan a sound across 3d space:

```javascript
var panner = sound.node.panner();
// pan full left
panner.setX(-1);
//
panner.setSourcePosition(x, y, z);
panner.setSourcePosition(vec3);
//
panner.setSourceOrientation(x, y, z);
panner.setSourceOrientation(vec3);

```

Analyser


Distortion


Echo

```javascript
var echo = sound.node.echo(delayTime, gainValue);
```

Filters

```javascript
var lowpass = sound.node.lowpass();
```

### Visualisation

Sono can produce visualisation data and graphics

TODO: add images

Get a sound's waveform and draw it to a canvas element

```javascript
var canvasEl = document.querySelector('canvas');
var wave = Sono.utils.waveform(sound._data, canvasEl.width);
var canvas = wave.getCanvas(canvasEl.height, '#333333', '#DDDDDD', canvasEl);

```


### Utils

Fade a sound in or out

```javascript
Sono.utils.fadeTo(sound, value, duration);
Sono.utils.fadeFrom(sound, value, duration);
```

Crossfade two sounds

```javascript
Sono.utils.crossFade(soundA, SoundB, 1);
```

Get user microphone

```javascript
var mic = Sono.utils.microphone(function(stream) {
    // user allowed mic - got stream
    var micSound = Sono.createSound(stream);
}, function() {
    // user denied mic
}, function(e) {
    // error
});
mic.connect();
```

Convert currentTime seconds into time code string

```javascript
var timeCode = Sono.utils.timeCode(217.8); // '03:37'
```

## Further documentation

[API documentation](docs/API.md)

[More examples](docs/Sono.md)


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
