# Sono

A JavaScript library for working with audio. WebAudio API with fallback to HTMLMediaElement.

<http://prototypes.stinkdigital.com/webaudio/sono/examples/>

### TODO

* Try moving loader into sound - see if it simplifies things
* ~~Refactor 'Web Audio Demos' project to use Sono~~
* Bring in microphone code
* Channel split/merge
* ~~Add nodes to main output - maybe moving node manager into module~~

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

## Api


### Create Sound

[Sono.createSound(data)](docs/Sono.md#createsound) // returns Sound


### Destroy

[Sono.destroy(soundOrId)](docs/Sono.md#destroy) // destroy sound instance or by id

### Retrieve Sound by id

[Sono.getById(id)](docs/Sono.md#getbyid) // returns Sound or null


### Controls

[Sono.mute()](docs/Sono.md#mute) // mutes master volume

[Sono.unMute()](docs/Sono.md#unmute) // un-mutes master volume

[Sono.volume](docs/Sono.md#volume) // get/set master volume

[Sono.pauseAll()](docs/Sono.md#pauseall) // pause all currently playing

[Sono.resumeAll()](docs/Sono.md#resumeall) // resume all currently paused

[Sono.stopAll()](docs/Sono.md#stopall) // stop all currently playing or paused

[Sono.play(id, delay, offset)](docs/Sono.md#play) // play sound by id

[Sono.pause(id)](docs/Sono.md#pause) // pause sound by id

[Sono.stop(id)](docs/Sono.md#stop) // stop sound by id


### Getters

[Sono.canPlay](docs/Sono.md#canplay) // returns audio file support info

[Sono.context](docs/Sono.md#context) // returns WebAudioContext instance

[Sono.hasWebAudio](docs/Sono.md#haswebaudio) // returns boolean

[Sono.isSupported](docs/Sono.md#issupported) // returns boolean

[Sono.masterGain](docs/Sono.md#mastergain) // returns GainNode

[Sono.node](docs/Sono.md#node) // returns node manager module

[Sono.sounds](docs/Sono.md#sounds) // returns array

[Sono.utils](docs/Sono.md#utils) // returns utils module



### Sono.node (node manager module)

Sono.node.add

Sono.node.remove

Sono.node.removeAll

Sono.node.analyser(fftSize)

Sono.node.compressor()

Sono.node.convolver(impulseResponse)

Sono.node.delay(input, time, gain)

Sono.node.distortion()

Sono.node.filer(type, frequency)

Sono.node.lowpass(frequency)

Sono.node.highpass(frequency)

Sono.node.bandpass(frequency)

Sono.node.lowshelf(frequency)

Sono.node.highshelf(frequency)

Sono.node.peaking(frequency)

Sono.node.notch(frequency)

Sono.node.allpass(frequency)

Sono.node.gain(value)

Sono.node.pan()

Sono.node.reverb(seconds, decay, reverse)

Sono.node.scriptProcessor(bufferSize, inputChannels, outputChannels, callback, callbackContext)


### Sono.utils (helper utils module)

Sono.utils.fade(gainNode, value, duration)

Sono.utils.pan(panner)

pan.x(value)

pan.xyz(x, y, z)

pan.setSourcePosition(panner, positionVec)

pan.setSourceOrientation(forwardVec)

pan.setListenerPosition(positionVec)

pan.setListenerOrientation(forwardVec)


Sono.utils.doppler(panner, x, y, z, deltaX, deltaY, deltaZ, deltaTime)

Sono.utils.filter(filterNode, value, quality, gain)

Sono.utils.getFrequency(value) // return a freq value by passing 0-1

Sono.utils.createMicrophoneSource(stream, connectTo) // should prob go into .create

Sono.utils.distort(value)

Sono.utils.timeCode(seconds, delim) // eg: 02:15 or 01:25:30

Sono.utils.waveformData(buffer, length) // returns an array of amplitudes

Sono.utils.waveformCanvas(arr, height, color, bgColor, canvasEl)





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
