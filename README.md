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

### Load and play:
```javascript
// Sono will load the first file in the array compatible with the browser
var sound = Sono.sound(['audio/foo.ogg', 'audio/foo.mp3']).play();
```

### Reverb:
```javascript
var sound = Sono.sound(['audio/foo.ogg', 'audio/foo.mp3']);
sound.play();
// apply reverb to specific sound:
var reverb = sound.node.reverb(2, 0.5);
// apply reverb to all sounds:
var reverb = Sono.node.reverb(2, 0.5);
```

## Documentation

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
