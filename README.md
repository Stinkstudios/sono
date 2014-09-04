# Sono

A JavaScript library for working with audio. WebAudio API with fallback to HTMLMediaElement.

<http://prototypes.stinkdigital.com/webaudio/sono/examples/>

### TODO

* Try moving loader into sound - see if it simplifies things
* ~~Refactor 'Web Audio Demos' project to use Sono~~
* ~~Bring in microphone code~~
* Channel split/merge
* ~~Add nodes to main output - maybe moving node manager into module~~

## Features

* Load, play and add effects to sounds
* Abstracts differences across browsers (file types, Web Audio support)
* Web Audio effects such as 3d positioning, reverb and frequency analysis
* Handle inputs from sound files, microphone, video element, oscillators
* Automatically handles fallback to Audio element for IE 11 and less
* Handles pause and resume of audio on page visibility change
* Handles touch to unlock media playback on mobile devices
* Master volume/mute
* Generates waveforms displays for sounds

## Installation

* npm: ```npm install sono --save-dev```
* bower: ```bower install sono --save```

## Usage

### Adding sounds to Sono:

New sounds are created through the `createSound` method. If you pass in an array of URLs, Sono will use the first one that matches the browser's capabilities:

```javascript
var sound = Sono.createSound(['audio/foo.ogg', 'audio/foo.mp3']);
```

You can also use your own loader and pass in the loaded sound data, or supply media elements.

```javascript
// media elements:
var audio = document.querySelector('audio');
var audioElSound = Sono.createSound(audio);

var video = document.querySelector('video');
var videoElSound = Sono.createSound(video);

// xhrResponse loaded outside of Sono:
var sound;
Sono.context.decodeAudioData(xhrResponse, function(buffer) {
    sound = Sono.createSound(buffer);
});
```

Or create an oscillator:

```javascript
var sineWave = Sono.createSound('sine');
```

Or attach a microphone stream:

```javascript
var sound;
var onConnect = function(stream) {
    sound = Sono.createSound(stream);
};
var mic = Sono.utils.microphone(onConnect);
mic.connect();
```

Or even generate a sound through Maths:

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

### Loading multiple sounds:

```javascript
Sono.load([
    { id: 'a', url: ['audio/foo.ogg', 'audio/foo.mp3'] },
    { id: 'b', url: ['audio/bar.ogg', 'audio/bar.mp3'], loop: true }
], function(sounds) {
    // loading complete, sounds can be retrieved by id:
    var soundA = Sono.getById('a');
    var soundB = Sono.getById('b');
}, function(progress) {
    // update progress bar?
});
```

### Adding effects:

Reverb

```javascript
var sound = Sono.sound(['audio/foo.ogg', 'audio/foo.mp3']);
sound.play();
// apply reverb to specific sound:
var reverb = sound.node.reverb(2, 0.5);
// apply reverb to all sounds:
var reverb = Sono.node.reverb(2, 0.5);
```

## API Documentation

[docs/API.md](docs/API.md)


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
