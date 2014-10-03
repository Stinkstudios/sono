# Sono

[src/sono.js](../src/sono.js)

## createSound

Create a Sound object

>`Sono.createSound(config)` returns Sound

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
var el = document.querySelector('video');
var sound = Sono.createSound(el);
```

Create an oscillator:

```javascript
var sineWave = Sono.createSound('sine');
```

User microphone stream:

```javascript
navigator.getUserMedia({audio:true}, function(stream) {
	var mic = Sono.createSound(stream);
});
// or
var mic = Sono.utils.microphone(function(stream) {
	var mic = Sono.createSound(stream);
});
mic.connect();
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

## destroySound

Remove a sound from Sono

>`Sono.destroySound(soundOrId)`

#### Examples

```javascript
var sound = Sono.createSound(['audio/foo.ogg', 'audio/foo.mp3']);
sound.id = 'bar';

// either will work
Sono.destroySound(sound);
Sono.destroySound('bar');
```


## getSound

>`Sono.getSound(id)`

#### Examples

```javascript
var sound = Sono.createSound(['audio/foo.ogg', 'audio/foo.mp3']);
sound.id = 'bar';

// somewhere else
var sound = Sono.getSound('bar');
```


## load

Load a sound and add to Sono

>`Sono.load(config)` returns Sound  

#### Examples

Load first file compatible with browser from an array

```javascript
var sound = Sono.load(['audio/foo.ogg', 'audio/foo.mp3']);
```

Load sound with config options and callbacks

```javascript
var sound = Sono.load({
	id: 'foo',
	url: ['audio/foo.ogg', 'audio/foo.mp3'],
	loop: true,
	volume: 0.2,
	onComplete: this.soundLoaded,
	context: this
});
```

Multiple sounds

```javascript
Sono.load({
	url: [
		{ id: 'a', url: ['audio/foo.ogg', 'audio/foo.mp3'] },
		{ id: 'b', url: ['audio/bar.ogg', 'audio/bar.mp3'] }
	],
	onComplete: function(sounds) {
		console.log('complete:', sounds);
		var soundA = Sono.getSound('a');
		var soundB = Sono.getSound('b');
	},
	onProgress: function(progress) {
		console.log('progress:', progress);
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


## controls

>`Sono.mute()`  
`Sono.unMute()`  
`Sono.volume`  
`Sono.pauseAll()`  
`Sono.resumeAll()`  
`Sono.stopAll()`  
`Sono.play(id, delay, offset)`  
`Sono.pause(id)`  
`Sono.stop(id)`

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

>`Sono.log()`

#### Examples

Log version number and browser audio support info to the console:

```javascript
Sono.log(); // Sono 0.0.0 Supported:true WebAudioAPI:true TouchLocked:false Extensions:ogg,mp3,opus,wav,m4a
```

## getters

>`Sono.canPlay` returns Object  
`Sono.context` returns WebAudioContext  
`Sono.hasWebAudio` returns boolean  
`Sono.isSupported` returns boolean  
`Sono.masterGain` returns GainNode  
`Sono.node` returns NodeManager  
`Sono.sounds` returns Array  
`Sono.utils` returns Utils  

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
Sono.masterGain

// access array of sounds in Sono
Sono.sounds.forEach(function(sound) {
	console.log(sound);
});
```

## Node Manager

## add

Add a node

>`Sono.add(node)` returns AudioNode  
`Sound.add(node)` returns AudioNode  

Remove a node

>`Sono.node.remove(node)` returns AudioNode
`Sound.node.remove(node)` returns AudioNode

Remove all AudioNodes

>`Sono.node.removeAll()`  
`Sound.node.removeAll()`

#### Examples

```javascript
var echo = sound.node.echo(2, 0.5);
sound.node.remove(echo);
sound.node.add(echo);
sound.node.distortion(0.5);
sound.node.removeAll();
```

## analyser

Create an AnalyserNode and add to chain

>`Sono.node.analyser(fftSize)`  
`Sound.node.analyser(fftSize)`

#### Examples

```javascript
var video = document.querySelector('video');
var sound = Sono.createSound(video);
var analyser = sound.node.analyser(2048);

function draw() {
	window.requestAnimationFrame(draw);

	var frequencyBinCount = analyserNode.frequencyBinCount;
	var freqByteData = new Uint8Array(frequencyBinCount);

	analyser.getByteFrequencyData(freqByteData);

	for (var i = 0; i < frequencyBinCount; i++) {
		var magnitude = freqByteData[i];
		var percent = magnitude / 256;
		// draw some visualisation
	}
}
draw();

```

## compressor

Apply compression processing (lowers the volume of the loudest parts of the signal and raises the volume of the softest parts)

>`Sono.node.compressor(threshold, knee, ratio, reduction, attack, release)` returns Compressor  
>`Sound.node.compressor(threshold, knee, ratio, reduction, attack, release)` returns Compressor  

#### Examples

```javascript
var compressor = Sono.node.compressor();
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

>`Sono.node.convolver(impulseResponse)` returns Convolver  
>`Sound.node.convolver(impulseResponse)` returns Convolver  

#### Examples

```javascript
var reverb = Sono.node.convolver();
var applyImpulse = function(sound) {
	reverb.buffer = sound.data;
};
Sono.load(['impulse.ogg', 'impulse.mp3'], applyImpulse);
```

## delay

Delay the sound playback

>`Sono.node.delay(time)` returns Delay  
>`Sound.node.delay(time)` returns Delay  

#### Examples

```javascript
var delay = sound.node.delay(1);
```

## distortion

Create a distortion effect

>`Sono.node.distortion(amount)` returns Distortion  
>`Sono.node.distortion(amount)` returns Distortion  

Update the distortion amount

>`distortion.update(amount)`

#### Examples

```javascript
var distortion = sound.node.distortion(0.5);
distortion.update(0.8); // [0,1]
```

## echo

Create a repeating echo or delay effect

>`Sono.node.echo(delayTime, gainValue)` returns Echo  
`sound.node.echo(delayTime, gainValue)` returns Echo  

Update the echo time and gain

>`echo.update(delayTime, gainValue)`

#### Examples

```javascript
var echo = sound.node.echo(2, 0.5);
echo.update(3, 0.5); // [seconds, gain]
```

## filter

Create a filter effect

>`Sono.node.filter(type, frequency, quality, gain)` returns BiquadFilter  
`Sono.node.lowpass(frequency, quality, gain)` returns BiquadFilter  
`Sono.node.highpass(frequency, quality, gain)` returns BiquadFilter  
`Sono.node.bandpass(frequency, quality, gain)` returns BiquadFilter  
`Sono.node.lowshelf(frequency, quality, gain)` returns BiquadFilter  
`Sono.node.highshelf(frequency, quality, gain)` returns BiquadFilter  
`Sono.node.peaking(frequency, quality, gain)` returns BiquadFilter  
`Sono.node.notch(frequency, quality, gain)` returns BiquadFilter  
`Sono.node.allpass(frequency, quality, gain)` returns BiquadFilter  

>`Sound.node.filter(type, frequency, quality, gain)` returns BiquadFilter  
`Sound.node.lowpass(frequency, quality, gain)` returns BiquadFilter  
`Sound.node.highpass(frequency, quality, gain)` returns BiquadFilter  
`Sound.node.bandpass(frequency, quality, gain)` returns BiquadFilter  
`Sound.node.lowshelf(frequency, quality, gain)` returns BiquadFilter  
`Sound.node.highshelf(frequency, quality, gain)` returns BiquadFilter  
`Sound.node.peaking(frequency, quality, gain)` returns BiquadFilter  
`Sound.node.notch(frequency, quality, gain)` returns BiquadFilter  
`Sound.node.allpass(frequency, quality, gain)` returns BiquadFilter  

Update the filter node

>`BiquadFilter.setByPercent(percent, quality, gain)`  
`BiquadFilter.update(frequency, gain)`

#### Examples

```javascript
var lowpass = sound.node.lowpass(800);
lowpass.frequency.value = 600;
lowpass.gain.value = 600;
lowpass.setByPercent(0.5);
lowpass.update(600, 1);
```

## gain

>`Sono.node.gain(value)` returns Gain  

#### Examples

```javascript

```

## panner

Create a panner node

>`Sono.node.panner()` returns Panner  
`sound.node.panner()` returns Panner  

Update the panner node

>`panner.setX(value)`  
`panner.setSourcePosition(x, y, z)`  
`panner.setSourceOrientation(x, y, z)`  
`panner.setSourceVelocity(x, y, z)`  
`panner.setListenerPosition(x, y, z)`  
`panner.setListenerOrientation(x, y, z)`  
`panner.setListenerVelocity(x, y, z)`  
`panner.calculateVelocity(currentPosition, lastPosition, deltaTime)` returns Vec3

Modify global values for panning

>`Sono.node.panning.setDefaults(object)`  
`Sono.node.panning.setListenerPosition(x, y, z)`  
`Sono.node.panning.setListenerOrientation(x, y, z)`  
`Sono.node.panning.setListenerVelocity(x, y, z)`  

#### Examples

```javascript
// create a panner for a sound
var panner = sound.node.panner();
// pan full left
panner.setX(-1);
// update the 3d position (accepts xyz or a 3d vector)
panner.setSourcePosition(x, y, z);
panner.setSourcePosition(vec3);
// update the 3d orientation (accepts xyz or a 3d vector)
panner.setSourceOrientation(x, y, z);
panner.setSourceOrientation(vec3);

// set defaults for all subsequent panner nodes:
Sono.node.panning.setDefaults({
    distanceModel: 'linear',
    refDistance: 1,
    maxDistance: 1000,
    rolloffFactor: 1
});

// update global listener position and orientation to 3d camera Vectors
Sono.node.panning.setListenerOrientation(camera.forward);
Sono.node.panning.setListenerPosition(camera.position);
```

## phaser

>`Sono.node.phaser()` returns Phaser  

#### Examples

```javascript

```

## recorder

Record audio from the mix or microphone to a new audio buffer

>`Sono.node.recorder(passThrough)` returns Recorder  
`Sound.node.recorder(passThrough)` returns Recorder  

Controls

>`recorder.start()`  
`recorder.stop()` returns AudioBuffer  
`recorder.getDuration()` returns number  

#### Examples

Record a microphone stream

```javascript
var recorder;

var onMicConnected = function(stream) {
	var micSound = Sono.createSound(stream);
	// add recorder, setting passThrough to false
	// to avoid feedback loop between mic and speakers
	recorder = micSound.node.recorder(false);
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

>`Sono.node.reverb(seconds, decay, reverse)` returns Reverb  

#### Examples

```javascript
```

## scriptProcessor

>`Sono.node.scriptProcessor(bufferSize, inputChannels, outputChannels, callback, thisArg)` returns ScriptProcessor  

#### Examples

```javascript
```


## utils

#### Examples

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

Get a sound's waveform and draw it to a canvas element

```javascript
var canvasEl = document.querySelector('canvas');
var wave = Sono.utils.waveform(sound.data, canvasEl.width);
var canvas = wave.getCanvas(canvasEl.height, '#333333', '#DDDDDD', canvasEl);

```

Clone an AudioBuffer

```javascript
var cloned = Sono.utils.cloneBuffer(sound.data);
```

Reverse an AudioBuffer

```javascript
var reversed = Sono.utils.reverseBuffer(sound.data);
```
