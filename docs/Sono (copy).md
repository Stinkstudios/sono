# Sono

[View source code](../src/sono.js)

## createSound

Create a Sound object

```javascript
Sono.createSound(config); returns Sound
```

[View source code](../src/sono.js#L41-58)

#### Examples

Create and load:

```javascript
var sound = Sono.createSound(['audio/foo.ogg', 'audio/foo.mp3']);
var sound = Sono.createSound('audio/foo.ogg');
var sound = Sono.createSound({
	id: 'foo',
	url: ['audio/foo.ogg', 'audio/foo.mp3'],
	loop: true,
	volume: 0.5
});
```

From existing HTMLMediaElement:

```javascript
var audioEl = document.querySelector('audio');
var audioElSound = Sono.createSound(audioEl);

var videoEl = document.querySelector('video');
var videoElSound = Sono.createSound(videoEl);
```

Create an oscillator:

```javascript
var sineWave = Sono.createSound('sine');

var squareWave = Sono.createSound('square');
squareWave.frequency = 200;
```

User microphone stream:

```javascript
// Use the [microphone utility](#utils):
var mic = Sono.utils.microphone(function(stream) {
	var micSound = Sono.createSound(stream);
});
mic.connect();

// or your own implementation
navigator.getUserMedia({audio:true}, function(stream) {
	var micSound = Sono.createSound(stream);
});
```

Script processor:

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

XHR arraybuffer loaded outside of Sono:
```javascript
var sound;
Sono.context.decodeAudioData(xhrResponse, function(buffer) {
	sound = Sono.createSound(buffer);
});
```

A sound can be assigned an `id` property which can be used to retrieve it later, without having a reference to the instance:

```javascript
// create a sound with an id:
var sound = Sono.createSound(['audio/foo.ogg', 'audio/foo.mp3']);
sound.id = 'foo';

var sound = Sono.createSound({
	id: 'foo',
	url: ['audio/foo.ogg', 'audio/foo.mp3']
});

// then somewhere else in your app:
var foo = Sono.getSound('foo');
foo.play();
// or
Sono.play('foo');
```

## destroySound

Remove a sound from Sono

```javascript
Sono.destroySound(soundOrId)
```

[View source code](../src/sono.js#L64-79)

#### Examples

```javascript
var sound = Sono.createSound(['audio/foo.ogg', 'audio/foo.mp3']);
sound.id = 'bar';

// either will work
Sono.destroySound(sound);
Sono.destroySound('bar');
```

## destroyAll

Remove all sounds from Sono

```javascript
Sono.destroySound(soundOrId)
```

[View source code](../src/sono.js#L81-84)

#### Examples

```javascript
Sono.destroyAll();
```


## getSound

```javascript
Sono.getSound(id)
```

[View source code](../src/sono.js#L90-L99)

#### Examples

```javascript
var sound = Sono.createSound(['audio/foo.ogg', 'audio/foo.mp3']);
sound.id = 'bar';

// somewhere else
var sound = Sono.getSound('bar');
```


## createGroup

Create a group to control multiple sounds together

```javascript
Sono.createGroup(sounds)
```

[View source code](../src/sono.js#L105-L113)

#### Examples

```javascript
var group = Sono.createGroup();
group.add(Sono.createSound('sine'));
group.add(Sono.createSound('square'));
var echo = group.effect.echo();
group.play();
```


## load

Load a sound and add to Sono

```javascript
Sono.load(config) returns Sound
```

[View source code](../src/sono.js#L119-160)

#### Examples

Load first file compatible with browser from an array

```javascript
var sound = Sono.load(['audio/foo.ogg', 'audio/foo.mp3']);
```

Load a single sound with config options and callbacks

```javascript
var sound = Sono.load({
	id: 'foo',
	url: ['audio/foo.ogg', 'audio/foo.mp3'],
	loop: true,
	volume: 0.2,
	onComplete: function(sound) {
		// do something
	},
	onProgress: function(progress) {
		// update progress
	}
});
```

Sono.load also accepts an array of sound config objects. All the sounds will be loaded and can later be accessed through their `id` properties using the `Sono.getSound`, `Sono.play`, `Sono.pause` and `Sono.stop` methods:

```javascript
var sounds = Sono.load({
	url: [
		{ id: 'a', url: ['audio/foo.ogg', 'audio/foo.mp3'] },
		{ id: 'b', url: ['audio/bar.ogg', 'audio/bar.mp3'], loop: true, volume: 0.5 }
	],
	onComplete: function(sounds) {
		// loading complete
		sounds.forEach(function(sound) {
			console.log(sound.id);
		});
		// sound instances can be retrieved or controlled by id:
		var soundA = Sono.getSound('a');
		Sono.play('b');
	},
	onProgress: function(progress) {
		// update progress bar
	}
});
```

Specific file:

```javascript
var sound = Sono.load('audio/foo.ogg');
```

Check file support manually:


```javascript
var extension = Sono.canPlay.ogg ? 'ogg' : 'mp3';
var sound = Sono.load('audio/foo.' + extension);

if(Sono.canPlay.mp3) {
	var sound = Sono.load('audio/foo.mp3');
}

```

Load and play immediately:

```javascript
var sound = Sono.load(['audio/foo.ogg', 'audio/foo.mp3']).play();

```

Bind to scope:

```javascript
var sound = Sono.load({
	url: ['audio/foo.ogg', 'audio/foo.mp3'],
	onComplete: this.onSoundLoaded,
	onProgress: this.onSoundProgress,
	context: this
});
```

## controls

```
Sono.mute() returns Sono
Sono.unMute() returns Sono
Sono.volume (get/set)
Sono.fade(volume, duration) returns Sono
Sono.pauseAll() returns Sono
Sono.resumeAll() returns Sono
Sono.stopAll() returns Sono
Sono.play(id, delay, offset) returns Sono
Sono.pause(id) returns Sono
Sono.stop(id) returns Sono
```

[View source code](../src/sono.js#L186-238)

#### Examples

```javascript
// mute master volume
Sono.mute();
// un-mute master volume
Sono.unMute();
// set master volume to 50%
Sono.volume = 0.5;
// get master volume
console.log(Sono.volume); // 0.5
// fade out master volume to 0 over 2 seconds
Sono.fade(0, 2);
// pause all currently playing
Sono.pauseAll();
// resume all currently paused
Sono.resumeAll();
// stop all currently playing or paused
Sono.stopAll();
// play sound by id after a 1 second delay
Sono.play('foo', 1);
// pause sound by id
Sono.pause('foo');
// stop sound by id
Sono.stop('foo');
```


## log

```javascript
Sono.log()
```

[View source code](../src/sono.js#L289-308)

#### Examples

Log version number and browser audio support info to the console:

```javascript
Sono.log(); // Sono 0.0.5 Supported:true WebAudioAPI:true TouchLocked:false Extensions:ogg,mp3,opus,wav,m4a
```

## getters

```
Sono.canPlay returns Object
Sono.context returns WebAudioContext
Sono.effect returns Effect
Sono.extensions returns Array
Sono.hasWebAudio returns boolean
Sono.isSupported returns boolean
Sono.gain returns GainNode
Sono.sounds returns Array
Sono.utils returns Utils
```

[View source code](../src/sono.js#L314-360)

#### Examples

```javascript
// what file types can the current browser handle?
Sono.canPlay.ogg; // boolean
Sono.canPlay.mp3; // boolean
Sono.canPlay.opus; // boolean
Sono.canPlay.wav; // boolean
Sono.canPlay.m4a; // boolean

// access to the WebAudio context
var webAudioContext = Sono.context;

// is WebAudio supported in the current browser?
if(Sono.hasWebAudio) {
	// do something
}

// is audio supported at all in the browser?
var hasAudioSupport = Sono.isSupported;

// access to the master Gain node
Sono.gain

// access array of sounds in Sono
Sono.sounds.forEach(function(sound) {
	console.log(sound);
});
```


## Sound

```javascript
Sound.play(delay, offset) returns Sound
Sound.pause() returns Sound
Sound.stop() returns Sound
Sound.seek(percent) returns Sound
Sound.fade(volume, duration) returns Sound
Sound.onEnded(callback, context) returns Sound
Sound.destroy()
Sound.currentTime returns Number
Sound.data returns Object
Sound.duration returns Number
Sound.effect returns Effect
Sound.ended returns Boolean

Sound.frequency returns Number
Sound.gain returns GainNode
Sound.loop returns Boolean
Sound.paused returns Boolean
Sound.playing returns Boolean
Sound.playbackRate returns Number
Sound.progress returns Number
Sound.volume returns Number
```

[View source code](../src/sound.js)

#### Examples

```javascript
// set volume to 50%
sound.volume = 0.5;
// get volume
console.log(sound.volume); // 0.5
// fade out volume to 0 over 2 seconds
sound.fade(0, 2);
// seek to half way through sound
sound.seek(0.5);
// play sound at double speed
sound.playbackRate = 2;
// play sound at half speed
sound.playbackRate = 0.5;
// get callback when sound ends
sound.onEnded(function() {
	console.log('ended');
});
```


## Effects

[View source code](../src/lib/effect.js)

## add / remove

Add and remove effects

```javascript
Sono.effect.add(node) returns AudioNode
Sono.effect.remove(node) returns AudioNode
Sono.effect.removeAll()

Sound.effect.add(node) returns AudioNode
Sound.effect.remove(node) returns AudioNode
Sound.effect.removeAll()
```

[View source code](../src/lib/effect.js#L21-48)

#### Examples

```javascript
var echo = sound.effect.echo(2, 0.5);
sound.effect.remove(echo);
sound.effect.add(echo);
sound.effect.distortion(0.5);
sound.effect.removeAll();
```

## analyser

Create an AnalyserNode and add to chain

```javascript
Sono.effect.analyser(fftSize)
Sound.effect.analyser(fftSize)
```

[View source code](../src/lib/effect/analyser.js)

#### Examples

```javascript
var video = document.querySelector('video');
var sound = Sono.createSound(video);
var analyser = sound.effect.analyser(2048);
var frequencies, waveform, magnitude, percent, i;

function draw() {
	window.requestAnimationFrame(draw);

	frequencies = analyser.getFrequencies();

	for (i = 0; i < frequencies.length; i++) {
		magnitude = frequencies[i];
		percent = magnitude / 256;
		// draw some visualisation
	}

	waveform = analyser.getWaveform();

	for (i = 0; i < waveform.length; i++) {
		magnitude = waveform[i];
		percent = magnitude / 256;
		// draw some visualisation
	}
}
draw();

```

## compressor

Apply compression processing (lowers the volume of the loudest parts of the signal and raises the volume of the softest parts)

```javascript
Sono.effect.compressor(threshold, knee, ratio, reduction, attack, release) returns Compressor
Sound.effect.compressor(threshold, knee, ratio, reduction, attack, release) returns Compressor
```

[View source code](../src/lib/effect.js#L116-140)

#### Examples

```javascript
var compressor = Sono.effect.compressor();
// min decibels to start compressing at from -100 to 0
compressor.threshold.value = -24;
// decibel value to start curve to compressed value from 0 to 40
compressor.knee.value = 30;
// amount of change per decibel from 1 to 20
compressor.ratio.value = 12;
// gain reduction currently applied by compressor from -20 to 0
compressor.reduction.value = -10;
// seconds to reduce gain by 10db from 0 to 1 - how quickly signal adapted when volume increased
compressor.attack.value = 0.0003;
// seconds to increase gain by 10db from 0 to 1 - how quickly signal adapted when volume redcuced
compressor.release.value = 0.25;
```

## convolver

Create a reverb effect by passing an audio buffer of a pre-recorded reverb impulse

```javascript
Sono.effect.convolver(impulseResponse) returns Convolver
Sound.effect.convolver(impulseResponse) returns Convolver
```

[View source code](../src/lib/effect.js#L142-147)

#### Examples

```javascript
var reverb = Sono.effect.convolver();
var applyImpulse = function(sound) {
	reverb.buffer = sound.data;
};
Sono.load(['impulse.ogg', 'impulse.mp3'], applyImpulse);
```

## delay

Delay the sound playback

```javascript
Sono.effect.delay(time) returns Delay
Sound.effect.delay(time) returns Delay
```

[View source code](../src/lib/effect.js#L149-153)

#### Examples

```javascript
var delay = sound.effect.delay(1);
```

## distortion

Create a distortion effect

```javascript
Sono.effect.distortion(amount) returns Distortion
Sono.effect.distortion(amount) returns Distortion
```

[View source code](../src/lib/effect/distortion.js)

#### Examples

```javascript
var distortion = sound.effect.distortion(0.5);
// update the amount of distortion:
distortion.amount = 0.8; // [0,1]
```

## echo

Create a repeating echo or delay effect

```javascript
Sono.effect.echo(delayTime, gainValue) returns Echo
Sound.effect.echo(delayTime, gainValue) returns Echo
```

[View source code](../src/lib/effect/echo.js)

#### Examples

```javascript
var echo = sound.effect.echo(2, 0.5);
echo.update(3, 0.5); // [seconds, gain]
```

## filter

Create a filter effect

```javascript
Sono.effect.filter(type, frequency, quality, gain) returns BiquadFilter
Sono.effect.lowpass(frequency, quality, gain) returns BiquadFilter
Sono.effect.highpass(frequency, quality, gain) returns BiquadFilter
Sono.effect.bandpass(frequency, quality, gain) returns BiquadFilter
Sono.effect.lowshelf(frequency, quality, gain) returns BiquadFilter
Sono.effect.highshelf(frequency, quality, gain) returns BiquadFilter
Sono.effect.peaking(frequency, quality, gain) returns BiquadFilter
Sono.effect.notch(frequency, quality, gain) returns BiquadFilter
Sono.effect.allpass(frequency, quality, gain) returns BiquadFilter

Sound.effect.filter(type, frequency, quality, gain) returns BiquadFilter
Sound.effect.lowpass(frequency, quality, gain) returns BiquadFilter
Sound.effect.highpass(frequency, quality, gain) returns BiquadFilter
Sound.effect.bandpass(frequency, quality, gain) returns BiquadFilter
Sound.effect.lowshelf(frequency, quality, gain) returns BiquadFilter
Sound.effect.highshelf(frequency, quality, gain) returns BiquadFilter
Sound.effect.peaking(frequency, quality, gain) returns BiquadFilter
Sound.effect.notch(frequency, quality, gain) returns BiquadFilter
Sound.effect.allpass(frequency, quality, gain) returns BiquadFilter
```

Update the filter node

```javascript
BiquadFilter.setByPercent(percent, quality, gain)
BiquadFilter.update(frequency, gain)
```

[View source code](../src/lib/effect/filter.js)

#### Examples

```javascript
var lowpass = sound.effect.lowpass(800);
lowpass.frequency.value = 600;
lowpass.gain.value = 600;
lowpass.setByPercent(0.5);
lowpass.update(600, 1);
```

## flanger

```javascript
Sono.effect.flanger() returns Flanger
```

[View source code](../src/lib/effect/flanger.js)

#### Examples

```javascript
var flanger = Sono.effect.flanger({
	delay: 0.005,
	frequency: 0.025,
	gain: 0.002,
	feedback: 0.5
});
```

## gain

```javascript
Sono.effect.gain(value) returns Gain
```

[View source code](../src/lib/effect.js#L211-217)

#### Examples

```javascript
var gain = Sono.effect.gain();
Sono.effect.add(gain);
gain.gain.value = 0.5;
```

## panner

Create a panner node

```javascript
Sono.effect.panner() returns Panner
sound.effect.panner() returns Panner
```

Update the panner node

```javascript
panner.setX(value)
panner.setSourcePosition(x, y, z)
panner.setSourceOrientation(x, y, z)
panner.setSourceVelocity(x, y, z)
panner.setListenerPosition(x, y, z)
panner.setListenerOrientation(x, y, z)
panner.setListenerVelocity(x, y, z)
panner.calculateVelocity(currentPosition, lastPosition, deltaTime) returns Vec3
```

Modify global values for panning

```javascript
Sono.effect.panning.setDefaults(object)
Sono.effect.panning.setListenerPosition(x, y, z)
Sono.effect.panning.setListenerOrientation(x, y, z)
Sono.effect.panning.setListenerVelocity(x, y, z)
```

[View source code](../src/lib/effect/panner.js)

#### Examples

```javascript
// create a panner for a sound
var panner = sound.effect.panner();
// pan full left
panner.setX(-1);
// update the 3d position (accepts xyz or a 3d vector)
panner.setSourcePosition(x, y, z);
panner.setSourcePosition(vec3);
// update the 3d orientation (accepts xyz or a 3d vector)
panner.setSourceOrientation(x, y, z);
panner.setSourceOrientation(vec3);

// set defaults for all subsequent panner nodes:
Sono.effect.panning.setDefaults({
    distanceModel: 'linear',
    refDistance: 1,
    maxDistance: 1000,
    rolloffFactor: 1
});

// update global listener position and orientation to 3d camera Vectors
Sono.effect.panning.setListenerOrientation(camera.forward);
Sono.effect.panning.setListenerPosition(camera.position);
```

## phaser

```javascript
Sono.effect.phaser() returns Phaser
```

[View source code](../src/lib/effect/phaser.js)

#### Examples

```javascript
var phaser = Sono.effect.phaser({
	stages: 4,
	frequency: 0.5,
	gain: 300,
	feedback: 0.5
});
```

## recorder

Record audio from the mix or microphone to a new audio buffer

```javascript
Sono.effect.recorder(passThrough) returns Recorder
Sound.effect.recorder(passThrough) returns Recorder
```

Controls

```javascript
recorder.start()
recorder.stop() returns AudioBuffer
recorder.getDuration() returns number
```

[View source code](../src/lib/effect/recorder.js)

#### Examples

Record a sound mix or microphone stream

```javascript
var recorder;

var onMicConnected = function(stream) {
	var micSound = Sono.createSound(stream);
	// add recorder, setting passThrough to false
	// to avoid feedback loop between mic and speakers
	recorder = micSound.effect.recorder(false);
	recorder.start();
};

stopButton.addEventListener('click', function() {
	var buffer = recorder.stop();
	var recordedSound = Sono.createSound(buffer);
	recordedSound.play();
});

var mic = Sono.utils.microphone(onMicConnected);
mic.connect();
```

## reverb

```javascript
Sono.effect.reverb(seconds, decay, reverse) returns Reverb
```

[View source code](../src/lib/effect/reverb.js)

#### Examples

```javascript
var reverb = Sono.effect.reverb(2, 0.5);
// change the time and decay
reverb.update(2, 0.5);
```

## script

```javascript
Sono.effect.script(config) returns ScriptProcessor
```

[View source code](../src/lib/effect.js#L239-268)

#### Examples

White noise

```javascript
var script = Sono.effect.script({
	bufferSize: 1024,
	channels: 1,
	callback: function(event) {
		var output = event.outputBuffer.getChannelData(0);
		for (var i = 0; i < output.length; i++) {
			output[i] = Math.random() * 2 - 1;
		}
	}
});
```


## utils

[View source code](../src/utils.js)

#### Examples

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

Get a sound's waveform and draw it to a canvas element

```javascript
var wave = Sono.utils.waveform();
var canvas = wave.draw({
    sound: sound,
    width: 200,
    height: 100,
    color: '#333333',
    bgColor: '#DDDDDD'
});

// or supply your own canvas el:
var canvasEl = document.querySelector('canvas');
var wave = Sono.utils.waveform();
wave.draw({
    sound: sound,
    canvas: canvas,
    color: '#333333',
    bgColor: '#DDDDDD'
});
```

Clone an AudioBuffer

```javascript
var cloned = Sono.utils.cloneBuffer(sound.data);
```

Reverse an AudioBuffer

```javascript
var reversed = Sono.utils.reverseBuffer(sound.data);
```
