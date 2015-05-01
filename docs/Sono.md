# sono

[View source code](../src/sono.js)

## createSound

Create a sound object

```javascript
sono.createSound(config); returns Sound
```

[View source code](../src/sono.js#L34-44)

#### Examples

Create and load:

```javascript
var sound = sono.createSound(['audio/foo.ogg', 'audio/foo.mp3']);
var sound = sono.createSound('audio/foo.ogg');
var sound = sono.createSound({
	id: 'foo',
	src: ['audio/foo.ogg', 'audio/foo.mp3'],
	loop: true,
	volume: 0.5
});
```

From existing HTMLMediaElement:

```javascript
var audioEl = document.querySelector('audio');
var audioElSound = sono.createSound(audioEl);

var videoEl = document.querySelector('video');
var videoElSound = sono.createSound(videoEl);
```

Create an oscillator:

```javascript
var sineWave = sono.createSound('sine');

var squareWave = sono.createSound('square');
squareWave.frequency = 200;
```

User microphone stream:

```javascript
// using the microphone utility:
var mic = sono.utils.microphone(function(stream) {
	var micSound = sono.createSound(stream);
});
mic.connect();

// or your own implementation
navigator.getUserMedia({audio:true}, function(stream) {
	var micSound = sono.createSound(stream);
});
```

Script processor:

```javascript
var script = sono.createSound({
	bufferSize: 1024,
	channels: 1,
	callback: function(event) {
			var output = event.outputBuffer.getChannelData(0);
	    for (var i = 0; i < output.length; i++) {
	        output[i] = Math.random();
	    }
	}
});
```

XHR arraybuffer loaded outside of sono:
```javascript
var sound;
sono.context.decodeAudioData(xhrResponse, function(buffer) {
	sound = sono.createSound(buffer);
});
```

A sound can be assigned an `id` property which can be used to retrieve it later, without having a reference to the instance:

```javascript
// create a sound with an id:
var sound = sono.createSound(['audio/foo.ogg', 'audio/foo.mp3']);
sound.id = 'foo';

var sound = sono.createSound({
	id: 'foo',
	url: ['audio/foo.ogg', 'audio/foo.mp3']
});

// then somewhere else in your app:
var foo = sono.getSound('foo');
foo.play();
// or
sono.play('foo');
```

## destroySound

Remove a sound from sono

```javascript
sono.destroySound(soundOrId)
```

[View source code](../src/sono.js#L50-55)

#### Examples

```javascript
var sound = sono.createSound(['audio/foo.ogg', 'audio/foo.mp3']);
sound.id = 'bar';

// either will work
sono.destroySound(sound);
sono.destroySound('bar');
```

## destroyAll

Remove all sounds from sono

```javascript
sono.destroyAll()
```

[View source code](../src/sono.js#L57-60)

#### Examples

```javascript
sono.destroyAll();
```


## getSound

```javascript
sono.getSound(id)
```

[View source code](../src/sono.js#L66-68)

#### Examples

```javascript
var sound = sono.createSound({
	id: 'bar',
	src: ['audio/foo.ogg', 'audio/foo.mp3']
});

// somewhere else
var sound = sono.getSound('bar');
```


## createGroup

Create a group to control multiple sounds together

```javascript
sono.createGroup(sounds)
```

[View source code](../src/sono.js#L74-82)

#### Examples

```javascript
var group = sono.createGroup();
group.add(sono.createSound('sine'));
group.add(sono.createSound('square'));
var echo = group.effect.echo();
group.play();
```


## load

Load a sound and add to sono

```javascript
sono.load(config) returns Sound
```

[View source code](../src/sono.js#L88-154)

#### Examples

Load first file compatible with browser from an array

```javascript
var sound = sono.load(['audio/foo.ogg', 'audio/foo.mp3']);
```

Load a single sound with config options and callbacks

```javascript
var sound = sono.load({
	id: 'foo',
	src: ['audio/foo.ogg', 'audio/foo.mp3'],
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

sono.load also accepts an array of sound config objects. All the sounds will be loaded and can later be accessed through their `id` properties using the `sono.getSound`, `sono.play`, `sono.pause` and `sono.stop` methods:

```javascript
var sounds = sono.load({
	url: [
		{ id: 'a', src: ['audio/foo.ogg', 'audio/foo.mp3'] },
		{ id: 'b', src: ['audio/bar.ogg', 'audio/bar.mp3'], loop: true, volume: 0.5 }
	],
	onComplete: function(sounds) {
		// loading complete
		sounds.forEach(function(sound) {
			console.log(sound.id);
		});
		// sound instances can be retrieved or controlled by id:
		var soundA = sono.getSound('a');
		sono.play('b');
	},
	onProgress: function(progress) {
		// update progress bar
	}
});
```

Specific file:

```javascript
var sound = sono.load('audio/foo.ogg');
```

Check file support manually:

```javascript
var extension = sono.canPlay.ogg ? 'ogg' : 'mp3';
var sound = sono.load('audio/foo.' + extension);

if(sono.canPlay.mp3) {
	var sound = sono.load('audio/foo.mp3');
}
```

Load and play immediately:

```javascript
var sound = sono.load(['audio/foo.ogg', 'audio/foo.mp3']).play();

```


## controls

```
sono.mute() returns sono
sono.unMute() returns sono
sono.volume (get/set)
sono.fade(volume, duration) returns sono
sono.pauseAll() returns sono
sono.resumeAll() returns sono
sono.stopAll() returns sono
sono.play(id, delay, offset) returns sono
sono.pause(id) returns sono
sono.stop(id) returns sono
```

[View source code](../src/sono.js#L160-209)

#### Examples

```javascript
// mute master volume
sono.mute();
// un-mute master volume
sono.unMute();
// set master volume to 50%
sono.volume = 0.5;
// get master volume
console.log(sono.volume); // 0.5
// fade out master volume to 0 over 2 seconds
sono.fade(0, 2);
// pause all currently playing
sono.pauseAll();
// resume all currently paused
sono.resumeAll();
// stop all currently playing or paused
sono.stopAll();
// play sound by id after a 1 second delay
sono.play('foo', 1);
// pause sound by id
sono.pause('foo');
// stop sound by id
sono.stop('foo');
```


## log

```
sono.log()
```

[View source code](../src/sono.js#L253-272)

#### Examples

Log version number and browser audio support info to the console:

```javascript
sono.log(); // sono 0.1.0 Supported:true WebAudioAPI:true TouchLocked:false Extensions:ogg,mp3,opus,wav,m4a
```

## getters

```
sono.canPlay returns Object
sono.context returns WebAudioContext
sono.effect returns Effect
sono.extensions returns Array
sono.hasWebAudio returns boolean
sono.isSupported returns boolean
sono.gain returns GainNode
sono.sounds returns Array
sono.utils returns Utils
```

[View source code](../src/sono.js#L274-326)

#### Examples

```javascript
// what file types can the current browser handle?
sono.canPlay.ogg; // boolean
sono.canPlay.mp3; // boolean
sono.canPlay.opus; // boolean
sono.canPlay.wav; // boolean
sono.canPlay.m4a; // boolean

// access to the WebAudio context
var webAudioContext = sono.context;

// is WebAudio supported in the current browser?
if(sono.hasWebAudio) {
	// do something
}

// is audio supported at all in the browser?
var hasAudioSupport = sono.isSupported;

// access to the master Gain node
sono.gain

// access array of sounds in sono
sono.sounds.forEach(function(sound) {
	console.log(sound);
});
```


# Sound

```javascript
Sound.play(delay, offset) returns Sound
Sound.pause() returns Sound
Sound.stop() returns Sound
Sound.seek(percent) returns Sound
Sound.fade(volume, duration) returns Sound
Sound.destroy()
Sound.currentTime returns Number
Sound.data returns AudioBuffer, MediaElement or config object
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

Sound.on('ready', fn) returns Sound
Sound.on('play', fn) returns Sound
Sound.on('pause', fn) returns Sound
Sound.on('stop', fn) returns Sound
Sound.on('ended', fn) returns Sound
Sound.on('destroy', fn) returns Sound
```

[View source code](../src/sound.js)

#### Examples

```javascript
var sound = sono.createSound({
	id: 'foo',
	url: ['audio/foo.ogg', 'audio/foo.mp3'],
	loop: true,
	volume: 0.5
});
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
// get callbacks when state changes
sound.on('ready', function() {
		console.log('ready');
	})
	.on('play', function() {
		console.log('play');
	})
	.on('pause', function() {
		console.log('pause');
	})
	.on('stop', function() {
		console.log('stop');
	})
	.on('ended', function() {
		console.log('ended');
	})
	.on('destroy', function() {
		console.log('destroy');
	});
```


# Effects

[View source code](../src/lib/effect.js)

## add / remove

Add and remove effects

```javascript
sono.effect.has(node) returns Boolean
sono.effect.add(node) returns AudioNode
sono.effect.remove(node) returns AudioNode
sono.effect.removeAll()

sound.effect.has(node) returns Boolean
sound.effect.add(node) returns AudioNode
sound.effect.remove(node) returns AudioNode
sound.effect.removeAll()
```

[View source code](../src/lib/effect.js#L23-50)

#### Examples

```javascript
var echo = sound.effect.echo({
		delay: 2,
	  feedback: 0.5
});
sound.effect.remove(echo);
sound.effect.add(echo);
sound.effect.distortion(0.5);
sound.effect.removeAll();
```

## analyser

Create an AnalyserNode and add to chain

```javascript
sono.effect.analyser(options)
sound.effect.analyser(options)
```

[View source code](../src/lib/effect/analyser.js)

#### Examples

```javascript
var video = document.querySelector('video');
var sound = sono.createSound(video);
var analyser = sono.effect.analyser({
	fftSize: 2048,
	smoothingTimeConstant: 0.7
});

var frequencies, waveform, magnitude, normalised, i;

function draw() {
	window.requestAnimationFrame(draw);

	frequencies = analyser.getFrequencies();

	for (i = 0; i < frequencies.length; i++) {
		magnitude = frequencies[i];
		normalised = magnitude / 256;
		// draw some visualisation
	}

	waveform = analyser.getWaveform();

	for (i = 0; i < waveform.length; i++) {
		magnitude = waveform[i];
		normalised = magnitude / 256;
		// draw some visualisation
	}
}
draw();

```

## compressor

Apply compression processing (lowers the volume of the loudest parts of the signal and raises the volume of the softest parts)

```javascript
sono.effect.compressor(threshold, knee, ratio, reduction, attack, release) returns Compressor
sound.effect.compressor(threshold, knee, ratio, reduction, attack, release) returns Compressor
```

[View source code](../src/lib/effect.js#L133-156)

#### Examples

```javascript
var compressor = sono.effect.compressor();
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
sono.effect.convolver(impulseResponse) returns Convolver
sound.effect.convolver(impulseResponse) returns Convolver
```

[View source code](../src/lib/effect.js#L158-163)

#### Examples

```javascript
var reverb = sono.effect.convolver();
var applyImpulse = function(sound) {
	reverb.buffer = sound.data;
};
sono.load(['impulse.ogg', 'impulse.mp3'], applyImpulse);
```

## delay

Delay the sound playback

```javascript
sono.effect.delay(time) returns Delay
sound.effect.delay(time) returns Delay
```

[View source code](../src/lib/effect.js#L165-169)

#### Examples

```javascript
var delay = sound.effect.delay(1);
```

## distortion

Create a distortion effect

```javascript
sono.effect.distortion(amount) returns Distortion
sono.effect.distortion(amount) returns Distortion
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
sono.effect.echo(options) returns Echo
sound.effect.echo(options) returns Echo
```

[View source code](../src/lib/effect/echo.js)

#### Examples

```javascript
var echo = sound.effect.echo({
	delay: 0.8,
  feedback: 0.5
});
echo.delay = 3;
echo.feedback = 0.8;
```

## filter

Create a filter effect

```javascript
sono.effect.filter(type, frequency, q, gain) returns BiquadFilter
sono.effect.lowpass(frequency, peak) returns BiquadFilter
sono.effect.highpass(frequency, peak) returns BiquadFilter
sono.effect.bandpass(frequency, width) returns BiquadFilter
sono.effect.lowshelf(frequency, gain) returns BiquadFilter
sono.effect.highshelf(frequency, gain) returns BiquadFilter
sono.effect.peaking(frequency, width, gain) returns BiquadFilter
sono.effect.notch(frequency, width, gain) returns BiquadFilter
sono.effect.allpass(frequency, sharpness) returns BiquadFilter

sound.effect.filter(type, frequency, q, gain) returns BiquadFilter
sound.effect.lowpass(frequency, peak) returns BiquadFilter
sound.effect.highpass(frequency, peak) returns BiquadFilter
sound.effect.bandpass(frequency, width) returns BiquadFilter
sound.effect.lowshelf(frequency, gain) returns BiquadFilter
sound.effect.highshelf(frequency, gain) returns BiquadFilter
sound.effect.peaking(frequency, width, gain) returns BiquadFilter
sound.effect.notch(frequency, width, gain) returns BiquadFilter
sound.effect.allpass(frequency, sharpness) returns BiquadFilter
```

Update the filter node

```javascript
filter.set(frequency, q, gain)
filter.setByPercent(percent, q, gain)
```

[View source code](../src/lib/effect/filter.js)

#### Examples

```javascript
var lowpass = sound.effect.lowpass(800);
lowpass.frequency.value = 600;
lowpass.Q.value = 10;
lowpass.setByPercent(0.5);
lowpass.set(200, 18);
```

## flanger

```javascript
sono.effect.flanger() returns Flanger
```

[View source code](../src/lib/effect/flanger.js)

#### Examples

```javascript
var flanger = sono.effect.flanger({
	delay: 0.005,
	frequency: 0.025,
	gain: 0.002,
	feedback: 0.5
});
```

## gain

```javascript
sono.effect.gain(value) returns Gain
```

[View source code](../src/lib/effect.js#L223-229)

#### Examples

```javascript
var gain = sono.effect.gain();
sono.effect.add(gain);
gain.gain.value = 0.5;
```

## panner

Create a panner node

```javascript
sono.effect.panner() returns Panner
sound.effect.panner() returns Panner
```

Update the panner node - x can be a vector and all params are optional

```javascript
panner.set(x, y, z)
panner.setSourcePosition(x, y, z)
panner.setSourceOrientation(x, y, z)
panner.setListenerPosition(x, y, z)
panner.setListenerOrientation(x, y, z)
```

Modify global values for panning

```javascript
sono.effect.panning.setDefaults(object)
sono.effect.panning.setListenerPosition(x, y, z)
sono.effect.panning.setListenerOrientation(x, y, z)
```

[View source code](../src/lib/effect/panner.js)

#### Examples

```javascript
// create a panner for a sound
var panner = sound.effect.panner();
// pan full left
panner.set(-1);
// update the 3d position (accepts xyz or a 3d vector)
panner.setSourcePosition(x, y, z);
panner.setSourcePosition(vec3);
// update the 3d orientation (accepts xyz or a 3d vector)
panner.setSourceOrientation(x, y, z);
panner.setSourceOrientation(vec3);

// set defaults for all subsequent panner nodes:
sono.effect.panning.setDefaults({
    distanceModel: 'linear',
    refDistance: 1,
    maxDistance: 1000,
    rolloffFactor: 1
});

// update global listener position and orientation to 3d camera Vectors
sono.effect.panning.setListenerOrientation(camera.forward);
sono.effect.panning.setListenerPosition(camera.position);
```

## phaser

```javascript
sono.effect.phaser() returns Phaser
```

[View source code](../src/lib/effect/phaser.js)

#### Examples

```javascript
var phaser = sono.effect.phaser({
	stages: 4,
	frequency: 0.5,
	gain: 300,
	feedback: 0.5
});
```

## recorder

Record audio from the mix or microphone to a new audio buffer

```javascript
sono.effect.recorder(passThrough) returns Recorder
sound.effect.recorder(passThrough) returns Recorder
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
	var micSound = sono.createSound(stream);
	// add recorder, setting passThrough to false
	// to avoid feedback loop between mic and speakers
	recorder = micSound.effect.recorder(false);
	recorder.start();
};

stopButton.addEventListener('click', function() {
	var buffer = recorder.stop();
	var recordedSound = sono.createSound(buffer);
	recordedSound.play();
});

var mic = sono.utils.microphone(onMicConnected);
mic.connect();
```

## reverb

```javascript
sono.effect.reverb(seconds, decay, reverse) returns Reverb
```

[View source code](../src/lib/effect/reverb.js)

#### Examples

```javascript
var reverb = sono.effect.reverb(2, 0.5);
// change the time and decay
reverb.update(2, 0.5);
```

## script

```javascript
sono.effect.script(config) returns ScriptProcessor
```

[View source code](../src/lib/effect.js#L247-276)

#### Examples

White noise

```javascript
var script = sono.effect.script({
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


# Utils

[View source code](../src/utils.js)

#### Examples

Get user microphone

```javascript
var mic = sono.utils.microphone(function(stream) {
    // user allowed mic - got stream
	var micSound = sono.createSound(stream);
}, function() {
	// user denied mic
}, function(e) {
	// error
});
mic.connect();
```

Convert currentTime seconds into time code string

```javascript
var timeCode = sono.utils.timeCode(217.8); // '03:37'
```

Clone an AudioBuffer

```javascript
var cloned = sono.utils.cloneBuffer(sound.data);
```

Reverse an AudioBuffer

```javascript
var reversed = sono.utils.reverseBuffer(sound.data);
```

Get a sound's waveform and draw it to a canvas element:

```javascript
var wave = sono.utils.waveformer({
    sound: sound,
    width: 200,
    height: 100,
    color: '#333333',
    bgColor: '#DDDDDD'
});
document.body.appendChild(wave.canvas);

// or supply your own canvas el
var canvasEl = document.querySelector('canvas');
var wave = sono.utils.waveformer({
    waveform: sound.waveform(canvasEl.width),
    canvas: canvas,
    color: 'green'
});

// color can be a function
var waveformer = sono.utils.waveformer({
    waveform: sound.waveform(canvasEl.width),
    canvas: canvasEl,
		color: function(position, length) {
			return position / length < sound.progress ? 'red' : 'yellow';
		}
});
// update the waveformer as the sound progresses
function update() {
	window.requestAnimationFrame(update);
	waveformer();
}
update();

// shape can be circular
var waveformer = sono.utils.waveformer({
		shape: 'circular',
    sound: sound,
    canvas: canvasEl,
		color: 'black'
});
```

Draw the output of an AnalyserNode to a canvas:

```javascript
var sound = sono.createSound('foo.ogg');
var analyser = sono.effect.analyser({
	fftSize: 512,
	smoothingTimeConstant: 0.7
});

var waveformer = sono.utils.waveformer({
    waveform: analyser.getFrequencies(),
    canvas: document.querySelector('canvas'),
		color: function(position, length) {
			var hue = (position / length) * 360;
			return 'hsl(' + hue + ', 100%, 40%)';
		},
		// normalise the value from the analyser
		transform: function(value) {
			return value / 256;
		}
});
// update the waveform
function update() {
	window.requestAnimationFrame(update);
	// request frequencies from the analyser
	analyser.getFrequencies();
	// update the waveformer display
	waveformer();
}
update();
```
